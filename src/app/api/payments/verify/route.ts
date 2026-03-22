import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { round2 } from '@/lib/payment-breakdown'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TAP_API = 'https://api.tap.company/v2/charges'

export async function GET(req: NextRequest) {
  const secret = process.env.TAP_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: 'TAP_SECRET_KEY غير مُعرّف' }, { status: 500 })
  }

  const tapId = req.nextUrl.searchParams.get('tap_id')
  if (!tapId) {
    return NextResponse.json({ error: 'missing tap_id', success: false, status: 'missing' }, { status: 400 })
  }

  const tapRes = await fetch(`${TAP_API}/${encodeURIComponent(tapId)}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  })

  const charge = (await tapRes.json()) as Record<string, unknown>
  console.log('Tap verify charge:', tapRes.status, charge)

  if (!tapRes.ok) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: (charge?.message as string) || 'تعذر التحقق من الدفع',
    })
  }

  const status = String(charge.status || '').toUpperCase()
  if (status !== 'CAPTURED') {
    return NextResponse.json({
      success: false,
      status: status || 'not_captured',
    })
  }

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('*')
    .eq('tap_charge_id', tapId)
    .maybeSingle()

  if (oErr) return NextResponse.json({ success: false, status: 'db_error', error: oErr.message })
  if (!order) {
    return NextResponse.json({ success: false, status: 'order_not_found' })
  }

  if (order.status === 'captured') {
    return NextResponse.json({ success: true, status: 'CAPTURED' })
  }

  const { data: seller, error: sErr } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', order.seller_id)
    .maybeSingle()

  if (sErr) return NextResponse.json({ success: false, status: 'seller_fetch_failed', error: sErr.message })

  const prevBal = Number(seller?.wallet_balance ?? 0)
  const credit = round2(Number(order.product_amount))
  const newBal = round2(prevBal + credit)

  const { error: tErr } = await supabase.from('wallet_transactions').insert({
    user_id: order.seller_id,
    amount: credit,
    balance_after: newBal,
    type: 'credit',
    description: 'عائدات مزاد (بعد الدفع)',
    auction_id: order.auction_id,
    tap_charge_id: tapId,
  })

  if (tErr) return NextResponse.json({ success: false, status: 'tx_insert_failed', error: tErr.message })

  const { error: wErr } = await supabase
    .from('profiles')
    .update({ wallet_balance: newBal })
    .eq('id', order.seller_id)

  if (wErr) return NextResponse.json({ success: false, status: 'wallet_update_failed', error: wErr.message })

  const { error: ordErr } = await supabase
    .from('orders')
    .update({ status: 'captured', updated_at: new Date().toISOString() })
    .eq('id', order.id)

  if (ordErr) return NextResponse.json({ success: false, status: 'order_update_failed', error: ordErr.message })

  return NextResponse.json({ success: true, status: 'CAPTURED' })
}
