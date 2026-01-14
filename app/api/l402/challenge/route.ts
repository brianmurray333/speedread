import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createInvoice } from '@/lib/lnd'
import { requestInvoiceFromLightningAddress } from '@/lib/lnurl'
import { createL402Macaroon, buildL402Challenge } from '@/lib/macaroon'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/l402/challenge
 * 
 * Request an L402 challenge (invoice + macaroon) for a paid document.
 * 
 * If the document has a lightning_address, the invoice is created via LNURL-pay
 * and payment goes directly to the creator. Otherwise, it uses the platform's
 * LND node (if configured).
 */
export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Fetch document to get price and lightning address
    const { data: document, error } = await supabase
      .from('documents')
      .select('id, title, price_sats, lightning_address, creator_name')
      .eq('id', documentId)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if document is free
    if (!document.price_sats || document.price_sats === 0) {
      return NextResponse.json(
        { error: 'Document is free, no payment required' },
        { status: 400 }
      )
    }

    let paymentRequest: string
    let paymentHash: string

    // Check if document has a creator's Lightning Address
    if (document.lightning_address) {
      // Create invoice via LNURL-pay - payment goes to creator
      try {
        const result = await requestInvoiceFromLightningAddress(
          document.lightning_address,
          document.price_sats,
          `SpeedRead: ${document.title}`
        )
        paymentRequest = result.paymentRequest
        paymentHash = result.paymentHash
      } catch (lnurlError) {
        console.error('LNURL-pay error:', lnurlError)
        return NextResponse.json(
          { error: 'Failed to create invoice from creator\'s Lightning Address' },
          { status: 502 }
        )
      }
    } else {
      // Fallback to platform's LND node
      try {
        const result = await createInvoice(
          document.price_sats,
          `SpeedRead: ${document.title}`,
          3600 // 1 hour expiry
        )
        paymentRequest = result.paymentRequest
        paymentHash = result.paymentHash
      } catch (lndError) {
        console.error('LND error:', lndError)
        return NextResponse.json(
          { error: 'Payment system not configured' },
          { status: 503 }
        )
      }
    }

    // Create L402 macaroon
    const l402Token = createL402Macaroon(
      documentId,
      paymentHash,
      86400 // 24 hour access after payment
    )

    // Build 402 response
    const challenge = buildL402Challenge(l402Token.macaroon, paymentRequest)

    return NextResponse.json(
      {
        paymentHash,
        paymentRequest,
        macaroon: l402Token.macaroon,
        expiresAt: l402Token.expiresAt,
        priceSats: document.price_sats,
        creatorName: document.creator_name,
        // Indicate if this is a creator payment
        paymentType: document.lightning_address ? 'creator' : 'platform',
      },
      {
        status: 402,
        headers: {
          'WWW-Authenticate': challenge,
        },
      }
    )
  } catch (error) {
    console.error('L402 challenge error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment challenge' },
      { status: 500 }
    )
  }
}
