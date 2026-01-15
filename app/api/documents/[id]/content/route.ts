import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkInvoicePaid } from '@/lib/lnd'
import { verifyL402Macaroon, parseL402Header } from '@/lib/macaroon'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * GET /api/documents/[id]/content
 * 
 * Get document content. For paid documents, requires valid L402 authorization.
 * 
 * Headers:
 * - Authorization: L402 <macaroon>:<preimage>
 * 
 * Or query params for simpler client integration:
 * - ?macaroon=<base64_macaroon>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  try {
    // Fetch document
    const { data: document, error } = await getSupabase()
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // If document is free, return content directly
    if (!document.price_sats || document.price_sats === 0) {
      return NextResponse.json({
        id: document.id,
        title: document.title,
        textContent: document.text_content,
        wordCount: document.word_count,
      })
    }

    // Document is paid - verify L402 authorization
    const authHeader = request.headers.get('Authorization')
    const macaroonParam = request.nextUrl.searchParams.get('macaroon')
    
    let macaroon: string | null = null

    if (authHeader) {
      const parsed = parseL402Header(authHeader)
      if (parsed) {
        macaroon = parsed.macaroon
      }
    } else if (macaroonParam) {
      macaroon = macaroonParam
    }

    if (!macaroon) {
      return NextResponse.json(
        { 
          error: 'Payment required',
          priceSats: document.price_sats,
          message: 'This document requires payment. Use POST /api/l402/challenge to get an invoice.'
        },
        { status: 402 }
      )
    }

    // Verify token
    const verification = verifyL402Macaroon(macaroon, documentId)
    
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 401 }
      )
    }

    if (!verification.paymentHash) {
      return NextResponse.json(
        { error: 'Invalid token: missing payment hash' },
        { status: 401 }
      )
    }

    // For creator payments (LNURL-pay), we trust the token
    // We can't verify with LND because payment went to creator's wallet
    if (document.lightning_address) {
      // Token is valid, grant access
      return NextResponse.json({
        id: document.id,
        title: document.title,
        textContent: document.text_content,
        wordCount: document.word_count,
      })
    }

    // For platform payments, verify with LND
    try {
      const isPaid = await checkInvoicePaid(verification.paymentHash)

      if (!isPaid) {
        return NextResponse.json(
          { error: 'Invoice not paid' },
          { status: 402 }
        )
      }
    } catch (error) {
      // If LND check fails, deny access for security
      console.error('LND verification failed:', error)
      return NextResponse.json(
        { error: 'Payment verification temporarily unavailable. Please try again.' },
        { status: 503 }
      )
    }

    // All verified! Return content
    return NextResponse.json({
      id: document.id,
      title: document.title,
      textContent: document.text_content,
      wordCount: document.word_count,
    })
  } catch (error) {
    console.error('Document content error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document content' },
      { status: 500 }
    )
  }
}
