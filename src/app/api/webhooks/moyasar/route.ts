import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Webhook Moyasar — يُنفَّذ في SQL migration جدول webhook_events أولاً.
 * يدعم secret_token في الجسم أو ترويسة moyasar-signature حسب إعداد لوحة Moyasar.
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'إعدادات ناقصة' }, { status: 500 })
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'جسم غير صالح' }, { status: 400 })
    }

    const expected = process.env.MOYASAR_WEBHOOK_SECRET
    const secretToken =
      (typeof body.secret_token === 'string' && body.secret_token) ||
      (typeof body.token === 'string' && body.token) ||
      req.headers.get('moyasar-signature')
    if (expected && secretToken !== expected) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const eventId = String(body.id ?? body.event_id ?? `${Date.now()}-${Math.random()}`)
    const eventType = String(body.type ?? body.event ?? 'unknown')
    const data = (body.data as Record<string, unknown> | undefined) ?? body
    const paymentId =
      (typeof data.id === 'string' && data.id) ||
      (typeof body.payment_id === 'string' && body.payment_id) ||
      null

    const { data: existing } = await supabase.from('webhook_events').select('id').eq('event_id', eventId).maybeSingle()
    if (existing) {
      return NextResponse.json({ status: 'already_processed' })
    }

    const { error: insErr } = await supabase.from('webhook_events').insert({
      event_id: eventId,
      event_type: eventType,
      payment_id: paymentId,
      payload: body as unknown as Record<string, unknown>,
      processed: false,
    })
    if (insErr) {
      console.error('[moyasar webhook insert]', insErr.message)
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    const metadata = (data.metadata as Record<string, string> | undefined) ?? {}
    const metaType = metadata.type ?? ''

    try {
      switch (eventType) {
        case 'payment_authorized':
        case 'payment_verified':
          if (metaType === 'bid_guarantee' && paymentId) {
            await supabase
              .from('bids')
              .update({ guarantee_status: 'authorized', payment_status: 'authorized', moyasar_payment_id: paymentId })
              .eq('guarantee_payment_id', paymentId)
          }
          break
        case 'payment_captured':
        case 'payment_paid':
          if ((metaType === 'deal_full_payment' || metadata.deal_id) && paymentId) {
            await supabase
              .from('deals')
              .update({
                full_payment_status: 'captured',
                captured_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('full_payment_id', paymentId)
          }
          break
        case 'payment_voided':
          if (metaType === 'bid_guarantee' && paymentId) {
            await supabase
              .from('bids')
              .update({ guarantee_status: 'voided', payment_status: 'voided' })
              .eq('guarantee_payment_id', paymentId)
          }
          if (metaType === 'deal_full_payment' && paymentId) {
            await supabase
              .from('deals')
              .update({
                full_payment_status: 'voided',
                updated_at: new Date().toISOString(),
              })
              .eq('full_payment_id', paymentId)
          }
          break
        case 'payment_refunded':
          if (paymentId) {
            await supabase
              .from('deals')
              .update({
                full_payment_status: 'refunded',
                refunded_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('full_payment_id', paymentId)
          }
          break
        case 'payment_faild':
        case 'payment_failed':
          break
        default:
          break
      }
    } catch (e) {
      console.error('[moyasar webhook handler]', e)
    }

    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('event_id', eventId)

    return NextResponse.json({ status: 'ok' })
  } catch (e) {
    console.error('[moyasar webhook]', e)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
