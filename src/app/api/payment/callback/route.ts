import { NextRequest, NextResponse } from 'next/server'
import { fetchPayment } from '@/lib/moyasar-client'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const paymentId = sp.get('id') ?? sp.get('payment_id')
  const status = sp.get('status')
  const action = sp.get('action') ?? 'unknown'
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''

  if (!paymentId) {
    return NextResponse.redirect(new URL('/dashboard/cards?err=missing_payment', base || 'http://localhost:3000'))
  }

  try {
    const p = await fetchPayment(paymentId)
    const ok = p.status === 'paid' || p.status === 'authorized' || p.status === 'verified'
    const path =
      action === 'save_card'
        ? `/dashboard/cards?payment_id=${encodeURIComponent(paymentId)}&status=${ok ? 'ok' : 'fail'}`
        : `/dashboard/deals?payment_id=${encodeURIComponent(paymentId)}&status=${ok ? 'ok' : 'fail'}`
    return NextResponse.redirect(new URL(path, base || 'http://localhost:3000'))
  } catch {
    return NextResponse.redirect(new URL('/dashboard/cards?err=verify_failed', base || 'http://localhost:3000'))
  }
}
