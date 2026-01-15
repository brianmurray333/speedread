import { NextRequest, NextResponse } from 'next/server'
import { checkInvoicePaid } from '@/lib/lnd'

export async function GET(request: NextRequest) {
  try {
    const paymentHash = request.nextUrl.searchParams.get('paymentHash')
    console.log('Checking payment for hash:', paymentHash)

    if (!paymentHash) {
      return NextResponse.json(
        { error: 'Missing paymentHash parameter' },
        { status: 400 }
      )
    }

    const paid = await checkInvoicePaid(paymentHash)
    console.log('Payment status:', paid)

    return NextResponse.json({ paid })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Tip check error:', errorMessage)
    
    // Return paid: false instead of 500 for LND errors
    // This allows graceful polling without error spam
    return NextResponse.json({ paid: false, error: errorMessage })
  }
}
