import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SHIPPING_SAR = 25

export async function POST(req: NextRequest) {
  let body: { payment_id?: string; auction_id?: string; amount?: number; user_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const payment_id = typeof body.payment_id === 'string' ? body.payment_id.trim() : ''
  const auction_id = typeof body.auction_id === 'string' ? body.auction_id.trim() : ''
  const user_id = body.user_id
  const amount = Number(body.amount)

  if (!payment_id || !auction_id || !isValidUserId(user_id)) {
    return NextResponse.json({ error: 'بيانات ناقصة أو غير صالحة' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'المبلغ غير صالح' }, { status: 400 })
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
  if (!auction.highest_bidder_id || auction.highest_bidder_id !== user_id) {
    return NextResponse.json({ error: 'فقط الفائز يمكنه الدفع' }, { status: 403 })
  }

  const productAmount = Number(auction.current_bid)
  if (!Number.isFinite(productAmount) || productAmount <= 0) {
    return NextResponse.json({ error: 'مبلغ المزاد غير صالح' }, { status: 400 })
  }

  const expectedTotal = Math.round((productAmount + SHIPPING_SAR) * 100) / 100
  const roundedAmount = Math.round(amount * 100) / 100
  if (Math.abs(roundedAmount - expectedTotal) > 0.02) {
    return NextResponse.json({ error: 'المبلغ الإجمالي غير متطابق' }, { status: 400 })
  }

  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, status')
    .eq('auction_id', auction_id)
    .maybeSingle()

  if (existingOrder?.status === 'captured' || existingOrder?.status === 'paid') {
    return NextResponse.json({ error: 'تم الدفع مسبقاً لهذا المزاد' }, { status: 400 })
  }

  const orderRow = {
    auction_id,
    buyer_id: user_id,
    seller_id: auction.seller_id,
    product_amount: productAmount,
    commission_amount: 0,
    vat_amount: 0,
    total_amount: expectedTotal,
    shipping_amount: SHIPPING_SAR,
    status: 'pending',
    moyasar_payment_id: payment_id,
    updated_at: new Date().toISOString(),
  }

  let orderId: string
  if (existingOrder?.id) {
    const { data: upd, error: uErr } = await supabase
      .from('orders')
      .update(orderRow)
      .eq('id', existingOrder.id)
      .select('id')
      .single()
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
    orderId = upd.id
  } else {
    const { data: ins, error: iErr } = await supabase.from('orders').insert(orderRow).select('id').single()
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })
    orderId = ins.id
  }

  const payPayload = {
    payment_id,
    auction_id,
    user_id,
    amount: expectedTotal,
    currency: 'SAR',
    status: 'initiated',
    updated_at: new Date().toISOString(),
  }

  const { error: payInsErr } = await supabase.from('payments').insert(payPayload)
  if (payInsErr) {
    const { error: payUpdErr } = await supabase
      .from('payments')
      .update({
        auction_id,
        user_id,
        amount: expectedTotal,
        status: 'initiated',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', payment_id)
    if (payUpdErr) {
      return NextResponse.json({ error: payInsErr.message || payUpdErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, order_id: orderId })
}
