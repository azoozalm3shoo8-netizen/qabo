import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { awardXP } from '@/lib/services/buyer-gamification-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

  const auctionCheck = req.nextUrl.searchParams.get('auction_id')
  if (auctionCheck) {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('auction_id', auctionCheck)
      .maybeSingle()
    return NextResponse.json({ is_favorite: Boolean(data) })
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('id, created_at, auctions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((row: { id: string; created_at: string; auctions: unknown }) => ({
    favorite_id: row.id,
    created_at: row.created_at,
    auction: row.auctions,
  }))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { user_id, auction_id } = await req.json()
  if (!user_id || !auction_id) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id, auction_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, already: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await awardXP(user_id, 'watch')
  } catch (e) {
    console.error('[favorites POST gamification]', e)
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  const auctionId = req.nextUrl.searchParams.get('auction_id')
  if (!userId || !auctionId) {
    return NextResponse.json({ error: 'missing user_id or auction_id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('auction_id', auctionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
