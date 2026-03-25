import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function sortParticipants(a: string, b: string) {
  return a < b ? [a, b] : [b, a]
}

/** Find or create conversation between two users (optional auction context) */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, other_user_id, auction_id } = body

  if (!user_id || !other_user_id) {
    return NextResponse.json({ error: 'missing user_id or other_user_id' }, { status: 400 })
  }
  if (user_id === other_user_id) {
    return NextResponse.json({ error: 'invalid pair' }, { status: 400 })
  }

  if (auction_id) {
    const { data: auc } = await supabase
      .from('auctions')
      .select('seller_id, highest_bidder_id, status, ends_at')
      .eq('id', auction_id)
      .maybeSingle()
    if (auc) {
      const ended =
        auc.status !== 'active' || new Date(String(auc.ends_at)).getTime() <= Date.now()
      if (ended) {
        const winner = auc.highest_bidder_id as string | null
        const seller = String(auc.seller_id)
        const ok =
          winner &&
          ((user_id === seller && other_user_id === winner) ||
            (user_id === winner && other_user_id === seller))
        if (!ok) {
          return NextResponse.json(
            { error: 'محادثة المزاد المنتهي متاحة للبائع والفائز فقط' },
            { status: 403 }
          )
        }
      }
    }
  }

  const [p1, p2] = sortParticipants(user_id, other_user_id)
  const aid = auction_id || null

  let q = supabase
    .from('conversations')
    .select('id')
    .eq('participant_1', p1)
    .eq('participant_2', p2)

  if (aid) q = q.eq('auction_id', aid)
  else q = q.is('auction_id', null)

  const { data: existing } = await q.maybeSingle()
  if (existing?.id) {
    return NextResponse.json({ conversation_id: existing.id })
  }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      participant_1: p1,
      participant_2: p2,
      auction_id: aid,
      last_message: null,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation_id: created.id })
}
