import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { processFullPayment } from '@/lib/services/deal-service'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const schema = z.object({
  user_id: z.string().uuid(),
  cardToken: z.string().optional(),
  cardId: z.string().uuid().optional(),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  if (!isValidUserId(parsed.data.user_id)) return unauthorized()

  const supabase = createClient()
  const { data: deal } = await supabase.from('deals').select('buyer_id').eq('id', id).maybeSingle()
  if (!deal || deal.buyer_id !== parsed.data.user_id) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  let token = parsed.data.cardToken
  if (!token && parsed.data.cardId) {
    const { data: c } = await supabase
      .from('saved_cards')
      .select('moyasar_token')
      .eq('id', parsed.data.cardId)
      .eq('user_id', parsed.data.user_id)
      .maybeSingle()
    token = c?.moyasar_token
  }
  if (!token) return NextResponse.json({ error: 'بطاقة مطلوبة' }, { status: 400 })

  try {
    const r = await processFullPayment(id, token)
    return NextResponse.json(r)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل الدفع'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
