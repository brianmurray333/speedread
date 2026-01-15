import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Sanitize user input to prevent XSS
function sanitizeInput(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Max content size: ~300 page novel (100,000 words * 6 chars avg = 600KB, rounded up to 1MB)
const MAX_CONTENT_SIZE = 1_000_000

/**
 * POST /api/documents/create
 * 
 * Create a new public document (for Chrome extension sharing)
 * 
 * Body:
 * - title: string (required)
 * - textContent: string (required)
 * - source?: string (optional - URL where content was captured)
 * - priceSats?: number (optional - 0 for free, >0 for paid)
 * - lightningAddress?: string (optional - required if priceSats > 0)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, textContent, source, priceSats, lightningAddress } = body

    // Validation
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

    if (textContent.length > MAX_CONTENT_SIZE) {
      return NextResponse.json(
        { error: `Content too large. Maximum size is ${Math.floor(MAX_CONTENT_SIZE / 1000)}KB` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate paywall settings
    const isPaid = priceSats && priceSats > 0
    if (isPaid) {
      if (!lightningAddress || typeof lightningAddress !== 'string') {
        return NextResponse.json(
          { error: 'Lightning Address is required for paid content' },
          { status: 400, headers: corsHeaders }
        )
      }
      // Basic format check
      if (!lightningAddress.includes('@') || !lightningAddress.includes('.')) {
        return NextResponse.json(
          { error: 'Invalid Lightning Address format' },
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // Calculate word count
    const wordCount = textContent.split(/\s+/).filter((w: string) => w.length > 0).length

    // Create document
    const { data: document, error: dbError } = await getSupabase()
      .from('documents')
      .insert({
        title: sanitizeInput(title.trim()),
        text_content: textContent,
        word_count: wordCount,
        is_public: true,
        price_sats: isPaid ? priceSats : 0,
        lightning_address: isPaid ? lightningAddress.trim() : null,
        creator_name: source ? `From: ${sanitizeInput(source.substring(0, 100))}` : 'Chrome Extension',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Return the document ID and share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://speedread.app'
    const shareUrl = `${baseUrl}/library?read=${document.id}`

    return NextResponse.json({
      id: document.id,
      shareUrl,
      wordCount,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Create document error:', error)
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500, headers: corsHeaders }
    )
  }
}
