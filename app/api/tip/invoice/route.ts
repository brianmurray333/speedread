import { NextRequest, NextResponse } from 'next/server'
import { createInvoice } from '@/lib/lnd'

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()

    if (!amount || typeof amount !== 'number' || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be at least 1 sat.' },
        { status: 400 }
      )
    }

    // Cap tips at 100k sats for safety
    if (amount > 100000) {
      return NextResponse.json(
        { error: 'Maximum tip amount is 100,000 sats.' },
        { status: 400 }
      )
    }

    const memo = `SpeedRead tip: ${amount} sats - Thank you for your support!`
    
    const { paymentRequest, paymentHash } = await createInvoice(
      amount,
      memo,
      3600 // 1 hour expiry
    )

    return NextResponse.json({
      paymentRequest,
      paymentHash,
      amount,
    })
  } catch (error) {
    console.error('Tip invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to generate tip invoice' },
      { status: 500 }
    )
  }
}
