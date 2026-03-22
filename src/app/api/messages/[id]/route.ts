import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await context.params
  const userId = req.nextUrl.searchParams.get('user_id')
  const markRead = req.nextUrl.searchParams.get('mark_read') === '1'

  if (!conversationId) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  if (!userId) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

  const { data: conv, error: cErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (conv.participant_1 !== userId && conv.participant_2 !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const peerId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1

  const { data: peerProfile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', peerId)
    .maybeSingle()

  const { data: messages, error: mErr } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  if (markRead) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false)
  }

  return NextResponse.json({
    messages: messages ?? [],
    peer: {
      id: peerId,
      full_name:
        (peerProfile?.full_name && String(peerProfile.full_name).trim()) ||
        'مستخدم',
      avatar_url: peerProfile?.avatar_url ?? null,
    },
    auction_id: conv.auction_id,
  })
}
