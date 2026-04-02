import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const bodySchema = z.object({
  user_id: z.string().uuid(),
})

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success || !isValidUserId(parsed.data.user_id)) return unauthorized()

  const supabase = createClient()
  await supabase.from('saved_cards').update({ is_default: false }).eq('user_id', parsed.data.user_id)
  const { error } = await supabase
    .from('saved_cards')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', parsed.data.user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
