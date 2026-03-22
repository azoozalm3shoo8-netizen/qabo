import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function sortParticipants(a: string, b: string) {
  return a < b ? [a, b] : [b, a]
}

/** GET: list conversations for user */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

  const { data: convs, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!convs?.length) return NextResponse.json([])

  const otherIds = new Set<string>()
  for (const c of convs) {
    otherIds.add(c.participant_1 === userId ? c.participant_2 : c.participant_1)
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', [...otherIds])

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

  const { data: unreadRows } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('receiver_id', userId)
    .eq('is_read', false)

  const unreadByConv = new Map<string, number>()
  for (const row of unreadRows ?? []) {
    const k = row.conversation_id
    unreadByConv.set(k, (unreadByConv.get(k) ?? 0) + 1)
  }

  const list = convs.map((c) => {
    const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1
    const p = profileMap.get(otherId)
    return {
      id: c.id,
      auction_id: c.auction_id,
      last_message: c.last_message,
      last_message_at: c.last_message_at,
      other_user: {
        id: otherId,
        full_name:
          (p?.full_name && String(p.full_name).trim()) || 'مستخدم',
        avatar_url: p?.avatar_url ?? null,
      },
      unread_count: unreadByConv.get(c.id) ?? 0,
    }
  })

  return NextResponse.json(list)
}

/** POST: send message (creates conversation if needed) */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sender_id, receiver_id, content, auction_id, user_id } = body

  if (!isValidUserId(user_id)) return unauthorized()
  if (!isValidUserId(sender_id) || sender_id !== user_id) {
    return NextResponse.json({ error: 'معرّف المرسل غير صالح' }, { status: 403 })
  }

  const text = typeof content === 'string' ? content.trim() : ''
  if (!text) {
    return NextResponse.json({ error: 'نص الرسالة مطلوب' }, { status: 400 })
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: 'الرسالة طويلة جداً (حد أقصى 1000 حرف)' }, { status: 400 })
  }

  if (!receiver_id) {
    return NextResponse.json({ error: 'المستلم مطلوب' }, { status: 400 })
  }
  if (sender_id === receiver_id) {
    return NextResponse.json({ error: 'invalid receiver' }, { status: 400 })
  }

  const rl = checkRateLimit(`msg:${sender_id}`, 2000, 1)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'يرجى الانتظار قبل إرسال رسالة أخرى', retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  const [p1, p2] = sortParticipants(sender_id, receiver_id)
  const aid = auction_id || null

  let convId: string | null = null

  let q = supabase
    .from('conversations')
    .select('id')
    .eq('participant_1', p1)
    .eq('participant_2', p2)

  if (aid) q = q.eq('auction_id', aid)
  else q = q.is('auction_id', null)

  const { data: existing } = await q.maybeSingle()

  if (existing?.id) {
    convId = existing.id
  } else {
    const { data: created, error: cErr } = await supabase
      .from('conversations')
      .insert({
        participant_1: p1,
        participant_2: p2,
        auction_id: aid,
        last_message: text,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    convId = created.id
  }

  if (!convId) return NextResponse.json({ error: 'conversation failed' }, { status: 500 })

  const { data: msg, error: mErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      sender_id,
      receiver_id,
      auction_id: aid,
      content: text,
      is_read: false,
    })
    .select()
    .single()

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  await supabase
    .from('conversations')
    .update({
      last_message: text,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', convId)

  return NextResponse.json({ conversation_id: convId, message: msg })
}
