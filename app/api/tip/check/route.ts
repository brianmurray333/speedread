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
    console.error('Tip check error:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
