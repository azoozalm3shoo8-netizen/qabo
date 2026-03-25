import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** يسجّل عملية إيداع محفظة قبل إكمال 3DS (يُكمّلها /api/payments/verify) */
export async function POST(req: NextRequest) {
  let body: { payment_id?: string; user_id?: string; amount?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const payment_id = typeof body.payment_id === 'string' ? body.payment_id.trim() : ''
  const user_id = body.user_id
  const amount = Number(body.amount)

  if (!payment_id || !isValidUserId(user_id) || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  const row = {
    payment_id,
    auction_id: null as string | null,
    user_id,
    amount,
    currency: 'SAR',
    status: 'initiated',
    moyasar_data: { kind: 'wallet_topup' } as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  }

  const { error: insErr } = await supabase.from('payments').insert(row)
  if (insErr) {
    const { error: updErr } = await supabase
      .from('payments')
      .update({
        user_id,
        amount,
        status: 'initiated',
        moyasar_data: row.moyasar_data,
        updated_at: row.updated_at,
      })
      .eq('payment_id', payment_id)
    if (updErr) return NextResponse.json({ error: insErr.message || updErr.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
