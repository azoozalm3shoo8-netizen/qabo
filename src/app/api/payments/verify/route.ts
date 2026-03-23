import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TAP_API = 'https://api.tap.company/v2/charges'

/**
 * يؤكد الدفع ويحدّث حالة الطلب إلى captured.
 * إضافة رصيد البائع تتم عند تأكيد الاستلام (PATCH orders confirm_delivery).
 */
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

  if (order.status === 'captured' || order.status === 'paid') {
    return NextResponse.json({ success: true, status: 'CAPTURED' })
  }

  const { error: ordErr } = await supabase
    .from('orders')
    .update({ status: 'captured', updated_at: new Date().toISOString() })
    .eq('id', order.id)

  if (ordErr) return NextResponse.json({ success: false, status: 'order_update_failed', error: ordErr.message })

  return NextResponse.json({ success: true, status: 'CAPTURED' })
}
