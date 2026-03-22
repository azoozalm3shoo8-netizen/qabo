import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId } from '@/lib/server/require-user'
import { paymentBreakdown } from '@/lib/payment-breakdown'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TAP_API = 'https://api.tap.company/v2/charges'

export async function POST(req: NextRequest) {
  const secret = process.env.TAP_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: 'TAP_SECRET_KEY غير مُعرّف' }, { status: 500 })
  }

  let body: { auction_id?: string; buyer_id?: string; amount?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { auction_id, buyer_id } = body
  if (!auction_id || !isValidUserId(buyer_id)) {
    return NextResponse.json({ error: 'بيانات ناقصة أو غير صالحة' }, { status: 400 })
  }

  const { data: auction, error: aErr } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auction_id)
    .maybeSingle()

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
  if (!auction) return NextResponse.json({ error: 'المزاد غير موجود' }, { status: 404 })

  if (auction.status !== 'ended') {
    return NextResponse.json({ error: 'الدفع متاح بعد انتهاء المزاد فقط' }, { status: 400 })
  }
  if (!auction.highest_bidder_id || auction.highest_bidder_id !== buyer_id) {
    return NextResponse.json({ error: 'فقط الفائز يمكنه الدفع' }, { status: 403 })
  }

  const productAmount = Number(auction.current_bid)
  if (!Number.isFinite(productAmount) || productAmount <= 0) {
    return NextResponse.json({ error: 'مبلغ المزاد غير صالح' }, { status: 400 })
  }

  const { commission, vat, total } = paymentBreakdown(productAmount)

  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, status')
    .eq('auction_id', auction_id)
    .maybeSingle()

  if (existingOrder?.status === 'captured') {
    return NextResponse.json({ error: 'تم الدفع مسبقاً لهذا المزاد' }, { status: 400 })
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const callbackUrl = `${baseUrl}/checkout/callback`

  const tapBody = {
    amount: total,
    currency: 'SAR',
    customer: {
      first_name: 'مشتري',
      email: 'buyer@qabo.com',
      phone: { country_code: '966', number: '0500000000' },
    },
    source: { id: 'src_all' },
    redirect: { url: callbackUrl },
    metadata: {
      auction_id,
      buyer_id,
      product_amount: String(productAmount),
      total_amount: String(total),
    },
  }

  const tapRes = await fetch(TAP_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tapBody),
  })

  const tapJson = (await tapRes.json()) as Record<string, unknown>
  console.log('Tap create charge response:', tapRes.status, tapJson)

  if (!tapRes.ok) {
    const msg =
      (tapJson?.errors as { message?: string } | undefined)?.message ||
      (tapJson?.message as string | undefined) ||
      'فشل إنشاء عملية الدفع'
    return NextResponse.json({ error: msg, tap: tapJson }, { status: 502 })
  }

  const chargeId = tapJson.id as string | undefined
  const transaction = tapJson.transaction as { url?: string } | undefined
  const checkoutUrl =
    transaction?.url ||
    (tapJson.redirect as { url?: string } | undefined)?.url ||
    (tapJson.url as string | undefined)

  if (!chargeId || !checkoutUrl) {
    return NextResponse.json(
      { error: 'استجابة Tap غير متوقعة', tap: tapJson },
      { status: 502 }
    )
  }

  const orderRow = {
    auction_id,
    buyer_id,
    seller_id: auction.seller_id,
    product_amount: productAmount,
    commission_amount: commission,
    vat_amount: vat,
    total_amount: total,
    tap_charge_id: chargeId,
    status: 'pending',
    updated_at: new Date().toISOString(),
  }

  if (existingOrder?.id) {
    const { error: uErr } = await supabase.from('orders').update(orderRow).eq('id', existingOrder.id)
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
  } else {
    const { error: iErr } = await supabase.from('orders').insert(orderRow)
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })
  }

  return NextResponse.json({
    checkout_url: checkoutUrl,
    charge_id: chargeId,
  })
}
