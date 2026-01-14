import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkInvoicePaid } from '@/lib/lnd'
import { verifyL402Macaroon } from '@/lib/macaroon'
import { createHash } from 'crypto'

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
 * For creator invoices (LNURL-pay): accepts preimage as proof of payment
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

    // Verify the macaroon
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
          error: 'No payment hash in macaroon' 
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

    let isPaid = false

    if (document?.lightning_address) {
      // Creator payment via LNURL-pay
      // We need the preimage to verify payment
      if (preimage) {
        // Verify: SHA256(preimage) should equal payment_hash
        const computedHash = createHash('sha256')
          .update(Buffer.from(preimage, 'hex'))
          .digest('hex')
        
        isPaid = computedHash === verification.paymentHash
        
        if (!isPaid) {
          return NextResponse.json(
            { 
              paid: false, 
              error: 'Invalid preimage' 
            },
            { status: 402 }
          )
        }
      } else {
        // For LNURL-pay without preimage, we poll on the client
        // Return a status indicating we need the preimage
        return NextResponse.json(
          { 
            paid: false, 
            error: 'Preimage required for verification',
            requiresPreimage: true
          },
          { status: 402 }
        )
      }
    } else {
      // Platform payment - check LND directly
      try {
        isPaid = await checkInvoicePaid(verification.paymentHash)
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

    if (!isPaid) {
      return NextResponse.json(
        { 
          paid: false, 
          error: 'Invoice not yet paid' 
        },
        { status: 402 }
      )
    }

    // Payment verified!
    return NextResponse.json({
      paid: true,
      documentId,
      message: 'Payment verified. Access granted.',
    })
  } catch (error) {
    console.error('L402 verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
