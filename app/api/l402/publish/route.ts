import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createInvoice, checkInvoicePaid } from '@/lib/lnd'
import { createL402Macaroon, verifyL402Macaroon, parseL402Header, buildL402Challenge } from '@/lib/macaroon'
import { randomUUID } from 'crypto'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// CORS headers for external API consumers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * Calculate publishing cost: 100 sats per MB, minimum 1 sat
 */
function calculateCostSats(contentSizeBytes: number): number {
  const sizeInMB = contentSizeBytes / (1024 * 1024)
  const cost = Math.ceil(sizeInMB * 100)
  return Math.max(cost, 1)
}

/**
 * Create a 402 response with L402 challenge headers
 */
async function create402Response(costSats: number, memo: string, contentSizeBytes?: number) {
  const publishId = randomUUID()

  let paymentRequest: string
  let paymentHash: string

  try {
    const result = await createInvoice(costSats, memo, 3600)
    paymentRequest = result.paymentRequest
    paymentHash = result.paymentHash
  } catch (lndError) {
    console.error('[L402 Publish] LND error:', lndError)
    return NextResponse.json(
      { error: 'Payment system not configured. Set LND_REST_HOST and LND_MACAROON_HEX.' },
      { status: 503, headers: corsHeaders }
    )
  }

  const l402Token = createL402Macaroon(publishId, paymentHash, 3600)
  const challenge = buildL402Challenge(l402Token.macaroon, paymentRequest)

  const sizeInMB = contentSizeBytes
    ? (contentSizeBytes / (1024 * 1024)).toFixed(3)
    : '0.000'

  return NextResponse.json(
    {
      paymentHash,
      paymentRequest,
      macaroon: l402Token.macaroon,
      publishId,
      costSats,
      contentSizeBytes: contentSizeBytes || 0,
      sizeInMB,
      message: `Publishing costs ${costSats} sats (100 sats/MB, minimum 1 sat). Pay the invoice and retry with Authorization: L402 <macaroon>:<preimage>`,
    },
    {
      status: 402,
      headers: {
        'WWW-Authenticate': challenge,
        ...corsHeaders,
      },
    }
  )
}

/**
 * GET /api/l402/publish
 * 
 * L402 discovery endpoint. Always returns 402 with a minimum-cost invoice.
 * Used by L402 verification systems to confirm this is an L402-gated endpoint.
 */
export async function GET() {
  return create402Response(1, 'SpeedRead publish: L402 discovery')
}

/**
 * POST /api/l402/publish
 * 
 * L402-gated document publishing endpoint.
 * Cost: 100 sats per MB of text content (minimum 1 sat).
 * 
 * === Flow ===
 * 
 * Step 1: Request without Authorization header
 *   → Returns 402 with invoice, macaroon, and cost breakdown
 * 
 * Step 2: Pay the Lightning invoice
 * 
 * Step 3: Retry same request with Authorization header
 *   → Authorization: L402 <macaroon>:<preimage>
 *   → Verifies payment, creates document, returns share URL
 * 
 * === Request Body ===
 * - title: string (required) — document title
 * - textContent: string (required) — full text content  
 * - source?: string — where content came from (URL, app name, etc.)
 * - priceSats?: number — paywall price for readers (0 = free)
 * - lightningAddress?: string — creator's LN address for reader payments
 */
export async function POST(request: NextRequest) {
  try {
    // === Check for L402 Authorization FIRST ===
    const authHeader = request.headers.get('Authorization')

    // Parse body (may be empty for discovery requests)
    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      // Empty or invalid body — that's OK for discovery
    }

    const { title, textContent, source, priceSats, lightningAddress } = body as {
      title?: string
      textContent?: string
      source?: string
      priceSats?: number
      lightningAddress?: string
    }

    // If no Authorization header → always return 402 with invoice
    if (!authHeader) {
      // Calculate cost from content if provided, otherwise use minimum
      const contentSizeBytes = textContent
        ? new TextEncoder().encode(textContent).length
        : 0
      const costSats = contentSizeBytes > 0 ? calculateCostSats(contentSizeBytes) : 1
      const memo = title
        ? `SpeedRead publish: "${title.substring(0, 50)}"`
        : 'SpeedRead publish'

      return create402Response(costSats, memo, contentSizeBytes)
    }

    // === Has Authorization: verify payment, then validate body, then create document ===

    const parsed = parseL402Header(authHeader)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid Authorization header. Expected format: L402 <macaroon>:<preimage>' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Decode macaroon to get the embedded publishId
    let tokenData: { documentId: string }
    try {
      tokenData = JSON.parse(Buffer.from(parsed.macaroon, 'base64').toString('utf-8'))
    } catch {
      return NextResponse.json(
        { error: 'Invalid macaroon encoding' },
        { status: 401, headers: corsHeaders }
      )
    }

    const publishId = tokenData.documentId

    // Verify token signature and expiry
    const verification = verifyL402Macaroon(parsed.macaroon, publishId)
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 401, headers: corsHeaders }
      )
    }

    if (!verification.paymentHash) {
      return NextResponse.json(
        { error: 'No payment hash in token' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify invoice is paid via LND
    let invoicePaid = false
    try {
      invoicePaid = await checkInvoicePaid(verification.paymentHash)
    } catch (lndError) {
      console.error('[L402 Publish] LND check error:', lndError)
      return NextResponse.json(
        { error: 'Could not verify payment status' },
        { status: 503, headers: corsHeaders }
      )
    }

    if (!invoicePaid) {
      return NextResponse.json(
        { error: 'Invoice not yet paid. Please pay the Lightning invoice first.' },
        { status: 402, headers: corsHeaders }
      )
    }

    // === Payment verified — NOW validate the body ===

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!textContent || typeof textContent !== 'string' || !textContent.trim()) {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const MAX_CONTENT_SIZE = 1_000_000
    if (textContent.length > MAX_CONTENT_SIZE) {
      return NextResponse.json(
        { error: `Content too large. Maximum size is ${Math.floor(MAX_CONTENT_SIZE / 1000)}KB` },
        { status: 400, headers: corsHeaders }
      )
    }

    const isPaid = priceSats && priceSats > 0
    if (isPaid) {
      if (!lightningAddress || typeof lightningAddress !== 'string') {
        return NextResponse.json(
          { error: 'Lightning Address is required for paid content' },
          { status: 400, headers: corsHeaders }
        )
      }
      if (!lightningAddress.includes('@') || !lightningAddress.includes('.')) {
        return NextResponse.json(
          { error: 'Invalid Lightning Address format (expected user@domain.com)' },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // === Create the document ===
    const contentSizeBytes = new TextEncoder().encode(textContent).length
    const costSats = calculateCostSats(contentSizeBytes)
    const wordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length

    const { data: document, error: dbError } = await getSupabase()
      .from('documents')
      .insert({
        title: title.trim().substring(0, 200),
        text_content: textContent,
        word_count: wordCount,
        is_public: true,
        price_sats: isPaid ? priceSats : 0,
        lightning_address: isPaid ? lightningAddress?.trim() : null,
        creator_name: source ? `From: ${(source as string).substring(0, 100)}` : 'L402 Publish',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[L402 Publish] Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500, headers: corsHeaders }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://speedread.fit'
    const shareUrl = `${baseUrl}/library?read=${document.id}`

    console.log(`[L402 Publish] Document created: ${document.id} (${wordCount} words, ${costSats} sats)`)

    return NextResponse.json(
      {
        id: document.id,
        shareUrl,
        wordCount,
        costSats,
        message: 'Document published successfully!',
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('[L402 Publish] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process publish request' },
      { status: 500, headers: corsHeaders }
    )
  }
}
