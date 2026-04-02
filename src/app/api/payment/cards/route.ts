import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchPayment, voidPayment, deleteToken } from '@/lib/moyasar-client'
import { createClient } from '@/lib/supabase-server'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const saveSchema = z.object({
  user_id: z.string().uuid(),
  payment_id: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(uid)) return unauthorized()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('saved_cards')
    .select('*')
    .eq('user_id', uid)
    .order('is_default', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }
  if (!isValidUserId(parsed.data.user_id)) return unauthorized()

  const rl = checkRateLimit(`card-save:${parsed.data.user_id}`, 60_000, 15)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'طلبات كثيرة', retryAfter: rl.retryAfter }, { status: 429 })
  }

  try {
    const payment = await fetchPayment(parsed.data.payment_id)
    const token = payment.source?.token
    if (!token) return NextResponse.json({ error: 'لا يوجد رمز بطاقة في الدفع' }, { status: 400 })

    try {
      await voidPayment(parsed.data.payment_id)
    } catch (e) {
      console.error('[cards POST void]', e)
    }

    const supabase = createClient()
    const lastFour = payment.source?.number?.slice(-4) ?? '0000'
    const brand = (payment.source?.company ?? 'unknown').toLowerCase()
    const row = {
      user_id: parsed.data.user_id,
      moyasar_token: token,
      brand,
      funding: 'credit',
      last_four: lastFour,
      holder_name: payment.source?.name ?? '—',
      exp_month: 12,
      exp_year: new Date().getFullYear() + 3,
      is_verified: true,
    }

    const { error: upE } = await supabase.from('saved_cards').upsert(row, { onConflict: 'user_id,moyasar_token' })
    if (upE) return NextResponse.json({ error: upE.message }, { status: 500 })

    await supabase.from('financial_transactions').insert({
      user_id: parsed.data.user_id,
      type: 'card_verify',
      moyasar_payment_id: payment.id,
      amount: 100,
      status: 'voided',
      description: 'تحقق بطاقة (1 ر.س) وإرجاع فوري',
      metadata: { free_period: true },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل حفظ البطاقة'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const uid = req.nextUrl.searchParams.get('user_id')
  if (!id || !isValidUserId(uid)) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })

  const supabase = createClient()
  const { data: card, error: fE } = await supabase
    .from('saved_cards')
    .select('moyasar_token')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()
  if (fE || !card) return NextResponse.json({ error: 'البطاقة غير موجودة' }, { status: 404 })

  try {
    await deleteToken(card.moyasar_token as string)
  } catch (e) {
    console.error('[cards DELETE token]', e)
  }

  const { error: dE } = await supabase.from('saved_cards').delete().eq('id', id).eq('user_id', uid)
  if (dE) return NextResponse.json({ error: dE.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
