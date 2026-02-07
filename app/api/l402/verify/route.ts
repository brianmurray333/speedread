import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { checkInvoicePaid } from '@/lib/lnd'
import { verifyL402Macaroon } from '@/lib/macaroon'
import { checkLNURLPaymentStatus } from '@/lib/lnurl'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

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
    const { macaroon, documentId, preimage, verifyUrl } = await request.json()

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
    const { data: document } = await getSupabase()
      .from('documents')
      .select('lightning_address')
      .eq('id', documentId)
      .single()

    if (document?.lightning_address) {
      // Creator payment via LNURL-pay
      
      // Method 1: Check via LNURL verify URL (preferred - automatic polling)
      if (verifyUrl) {
        console.log('Checking payment via LNURL verify URL:', verifyUrl)
        const lnurlStatus = await checkLNURLPaymentStatus(verifyUrl)
        
        if (lnurlStatus.paid) {
          console.log('Payment verified via LNURL!')
          return NextResponse.json({
            paid: true,
            documentId,
            message: 'Payment verified. Access granted.',
          })
        }
        
        // Not paid yet - return waiting status
        return NextResponse.json(
          { 
            paid: false, 
            error: 'Waiting for payment',
          },
          { status: 402 }
        )
      }
      
      // Method 2: Verify via preimage (fallback for manual verification)
      if (preimage) {
        try {
          console.log('Verifying preimage for creator payment...')
          
          // Compute SHA256 of the preimage
          const computedHash = createHash('sha256')
            .update(Buffer.from(preimage, 'hex'))
            .digest('hex')
          
          // Verify it matches the payment hash from the token
          if (computedHash !== verification.paymentHash) {
            console.error('Preimage verification failed: hash mismatch')
            return NextResponse.json(
              { paid: false, error: 'Invalid preimage' },
              { status: 401 }
            )
          }
          
          console.log('Preimage verified successfully!')
          return NextResponse.json({
            paid: true,
            documentId,
            message: 'Payment verified. Access granted.',
          })
        } catch (e) {
          console.error('Preimage verification error:', e)
          return NextResponse.json(
            { paid: false, error: 'Invalid preimage format' },
            { status: 400 }
          )
        }
      }
      
      // No verify URL and no preimage - can't verify
      return NextResponse.json(
        { 
          paid: false, 
          error: 'Waiting for payment',
          requiresPreimage: true
        },
        { status: 402 }
      )
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
