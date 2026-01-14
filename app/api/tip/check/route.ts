import { NextRequest, NextResponse } from 'next/server'
import { checkInvoicePaid } from '@/lib/lnd'

export async function GET(request: NextRequest) {
  try {
    const paymentHash = request.nextUrl.searchParams.get('paymentHash')

    if (!paymentHash) {
      return NextResponse.json(
        { error: 'Missing paymentHash parameter' },
        { status: 400 }
      )
    }

    const paid = await checkInvoicePaid(paymentHash)

    return NextResponse.json({ paid })
  } catch (error) {
    // Don't spam console for expected polling failures
    // Only log unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (!errorMessage.includes('LND configuration missing')) {
      console.error('Tip check error:', errorMessage)
    }
    
    // Return paid: false instead of 500 for LND errors
    // This allows graceful polling without error spam
    return NextResponse.json({ paid: false, error: errorMessage })
  }
}
