import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { escalateDispute, sendDisputeMessage } from '@/lib/services/dispute-service'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const uid = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(uid)) return unauthorized()
  const { id: dealId } = await context.params
  const supabase = createClient()
  const { data: d } = await supabase.from('deals').select('buyer_id,seller_id').eq('id', dealId).maybeSingle()
  if (!d) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (d.buyer_id !== uid && d.seller_id !== uid) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { data: disp } = await supabase.from('disputes').select('*').eq('deal_id', dealId).maybeSingle()
  if (!disp) return NextResponse.json({ dispute: null, messages: [] })

  const { data: msgs } = await supabase
    .from('dispute_messages')
    .select('*')
    .eq('dispute_id', disp.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ dispute: disp, messages: msgs ?? [] })
}

const postSchema = z.object({
  user_id: z.string().uuid(),
  message: z.string().min(1),
  attachments: z.array(z.string()).optional(),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  if (!isValidUserId(parsed.data.user_id)) return unauthorized()

  const supabase = createClient()
  const { data: disp } = await supabase.from('disputes').select('id').eq('deal_id', dealId).maybeSingle()
  if (!disp) return NextResponse.json({ error: 'لا يوجد نزاع' }, { status: 404 })

  await sendDisputeMessage(disp.id, parsed.data.user_id, parsed.data.message, parsed.data.attachments)
  return NextResponse.json({ ok: true })
}

const putSchema = z.object({ user_id: z.string().uuid() })

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  if (!isValidUserId(parsed.data.user_id)) return unauthorized()

  const supabase = createClient()
  const { data: disp } = await supabase.from('disputes').select('id').eq('deal_id', dealId).maybeSingle()
  if (!disp) return NextResponse.json({ error: 'لا يوجد نزاع' }, { status: 404 })

  await escalateDispute(disp.id)
  return NextResponse.json({ ok: true })
}
