import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { acceptDeal } from '@/lib/services/deal-service'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const schema = z.object({ user_id: z.string().uuid() })

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  if (!isValidUserId(parsed.data.user_id)) return unauthorized()

  const supabase = createClient()
  const { data: deal } = await supabase.from('deals').select('buyer_id').eq('id', id).maybeSingle()
  if (!deal || deal.buyer_id !== parsed.data.user_id) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  try {
    await acceptDeal(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
