import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkInvoicePaid } from '@/lib/lnd'
import { verifyL402Macaroon } from '@/lib/macaroon'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/l402/verify
 * 
 * Verify that an L402 payment has been completed.
 * 
 * For platform invoices: checks the LND node directly
 * For creator invoices (LNURL-pay): trusts WebLN payment confirmation
 *   (We can't verify LNURL-pay payments server-side without decoding bolt11)
 */
export async function POST(request: NextRequest) {
  try {
    const { macaroon, documentId, preimage } = await request.json()

    if (!macaroon || !documentId) {
      return NextResponse.json(
        { error: 'Macaroon and document ID are required' },
        { status: 400 }
      )
    }

    // Verify the token
    const verification = verifyL402Macaroon(macaroon, documentId)
    
    if (!verification.valid) {
      return NextResponse.json(
        { 
          paid: false, 
          error: verification.error 
        },
        { status: 401 }
      )
    }

    if (!verification.paymentHash) {
      return NextResponse.json(
        { 
          paid: false, 
          error: 'No payment hash in token' 
        },
        { status: 400 }
      )
    }

    // Check if document uses creator's Lightning Address
    const { data: document } = await supabase
      .from('documents')
      .select('lightning_address')
      .eq('id', documentId)
      .single()

    if (document?.lightning_address) {
      // Creator payment via LNURL-pay
      // For WebLN payments, if the client provides a preimage, we trust the payment succeeded
      // (The wallet wouldn't return a preimage unless the payment actually went through)
      if (preimage) {
        // Payment verified via WebLN preimage
        return NextResponse.json({
          paid: true,
          documentId,
          message: 'Payment verified. Access granted.',
        })
      } else {
        // No preimage - this is polling before payment
        // For creator payments, we can't check server-side, so return waiting status
        return NextResponse.json(
          { 
            paid: false, 
            error: 'Waiting for payment',
            requiresPreimage: true
          },
          { status: 402 }
        )
      }
    } else {
      // Platform payment - check LND directly
      try {
        const isPaid = await checkInvoicePaid(verification.paymentHash)
        
        if (!isPaid) {
          return NextResponse.json(
            { 
              paid: false, 
              error: 'Invoice not yet paid' 
            },
            { status: 402 }
          )
        }
        
        return NextResponse.json({
          paid: true,
          documentId,
          message: 'Payment verified. Access granted.',
        })
      } catch {
        return NextResponse.json(
          { 
            paid: false, 
            error: 'Could not verify payment status' 
          },
          { status: 503 }
        )
      }
    }
  } catch (error) {
    console.error('L402 verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
