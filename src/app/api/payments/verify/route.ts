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

const MOYASAR_API = 'https://api.moyasar.com/v1/payments'

type MoyasarPayment = {
  id?: string
  status?: string
  amount?: number
  currency?: string
  metadata?: Record<string, unknown>
}

async function fetchMoyasarPayment(paymentId: string, secretKey: string): Promise<MoyasarPayment | null> {
  const auth = Buffer.from(`${secretKey}:`).toString('base64')
  const res = await fetch(`${MOYASAR_API}/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) return null
  return (await res.json()) as MoyasarPayment
}

/**
 * تأكيد دفع Moyasar (مزاد أو شحن محفظة) بعد إعادة التوجيه من 3DS.
 */
export async function POST(req: NextRequest) {
  const secretKey = process.env.MOYASAR_SK
  if (!secretKey) {
    return NextResponse.json({ success: false, error: 'MOYASAR_SK غير مُعرّف' }, { status: 500 })
  }

  let body: { payment_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const payment_id = typeof body.payment_id === 'string' ? body.payment_id.trim() : ''
  if (!payment_id) {
    return NextResponse.json({ success: false, error: 'payment_id مطلوب' }, { status: 400 })
  }

  const remote = await fetchMoyasarPayment(payment_id, secretKey)
  if (!remote) {
    return NextResponse.json({ success: false, status: 'fetch_failed' }, { status: 502 })
  }

  const st = String(remote.status || '').toLowerCase()
  if (st !== 'paid') {
    return NextResponse.json({ success: false, status: remote.status || 'not_paid' })
  }

  const { data: payRow, error: prErr } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_id', payment_id)
    .maybeSingle()

  if (prErr) {
    return NextResponse.json({ success: false, error: prErr.message }, { status: 500 })
  }

  const meta = (payRow?.moyasar_data as Record<string, unknown> | null) ?? {}
  const isWallet = Boolean(
    payRow &&
    (!payRow.auction_id ||
      meta.kind === 'wallet_topup' ||
      (remote.metadata && String((remote.metadata as Record<string, unknown>).kind || '') === 'wallet'))
  )

  if (isWallet && payRow) {
    if (String(payRow.status || '').toLowerCase() === 'paid') {
      return NextResponse.json({ success: true, status: 'paid', kind: 'wallet' })
    }

    const userId = payRow.user_id as string
    const amountHalalas = Number(remote.amount ?? 0)
    const creditSar = Math.round(amountHalalas) / 100

    const { data: w, error: wErr } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle()
    if (wErr) return NextResponse.json({ success: false, error: wErr.message }, { status: 500 })

    let walletId = w?.id as string | undefined
    let available = Number(w?.available_balance ?? 0)

    if (!walletId) {
      const { data: ins, error: iErr } = await supabase
        .from('wallets')
        .insert({ user_id: userId, available_balance: 0, frozen_balance: 0 })
        .select('id, available_balance')
        .single()
      if (iErr) return NextResponse.json({ success: false, error: iErr.message }, { status: 500 })
      walletId = ins.id
      available = 0
    }

    const nextBal = Math.round((available + creditSar) * 100) / 100
    const { error: uErr } = await supabase
      .from('wallets')
      .update({ available_balance: nextBal, updated_at: new Date().toISOString() })
      .eq('id', walletId)

    if (uErr) return NextResponse.json({ success: false, error: uErr.message }, { status: 500 })

    await supabase.from('wallet_transactions').insert({
      wallet_id: walletId,
      user_id: userId,
      type: 'deposit',
      amount: creditSar,
      balance_after: nextBal,
      reference: payment_id,
      description: 'إيداع عبر Moyasar',
    })

    await supabase
      .from('payments')
      .update({
        status: 'paid',
        moyasar_data: remote as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', payment_id)

    await supabase
      .from('profiles')
      .update({ wallet_balance: nextBal, updated_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json({ success: true, status: 'paid', kind: 'wallet' })
  }

  if (!payRow || !payRow.auction_id) {
    return NextResponse.json({ success: false, status: 'payment_record_not_found' }, { status: 404 })
  }

  const auctionId = payRow.auction_id as string
  const buyerId = payRow.user_id as string

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('buyer_id', buyerId)
    .maybeSingle()

  if (oErr) return NextResponse.json({ success: false, error: oErr.message }, { status: 500 })
  if (!order) {
    return NextResponse.json({ success: false, status: 'order_not_found' }, { status: 404 })
  }

  if (order.status === 'paid' || order.status === 'captured') {
    await supabase
      .from('payments')
      .update({
        status: 'paid',
        moyasar_data: remote as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', payment_id)

    return NextResponse.json({
      success: true,
      status: 'paid',
      order_id: order.id as string,
    })
  }

  const { error: pErr } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      moyasar_data: remote as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('payment_id', payment_id)

  if (pErr) return NextResponse.json({ success: false, error: pErr.message }, { status: 500 })

  const { error: ordErr } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      moyasar_payment_id: payment_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (ordErr) return NextResponse.json({ success: false, error: ordErr.message }, { status: 500 })

  const { data: auc } = await supabase.from('auctions').select('title, seller_id').eq('id', auctionId).maybeSingle()
  const title = (auc?.title && String(auc.title).trim()) || 'مزاد'
  const sellerId = (auc?.seller_id as string) || (order.seller_id as string)

  await supabase.from('notifications').insert({
    user_id: sellerId,
    type: 'payment_received',
    title: 'تم استلام الدفع',
    message: `تم استلام الدفع لمزاد ${title}`,
    auction_id: auctionId,
  })

  const { data: existingEscrow } = await supabase.from('escrows').select('id').eq('auction_id', auctionId).maybeSingle()

  if (!existingEscrow) {
    await supabase.from('escrows').insert({
      auction_id: auctionId,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount: Number(order.total_amount),
      status: 'held',
      wallet_backed: false,
    })
  }

  return NextResponse.json({
    success: true,
    status: 'paid',
    order_id: order.id,
  })
}

