import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: 'معرّف المستخدم غير صالح' }, { status: 400 })
  }

  const { data: rows, error } = await supabase
    .from('payments')
    .select('id, payment_id, auction_id, user_id, amount, currency, status, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = rows ?? []
  const auctionIds = [...new Set(list.map((p) => p.auction_id).filter(Boolean))] as string[]
  let auctionMap = new Map<string, { id: string; title: string; images: unknown }>()
  if (auctionIds.length) {
    const { data: aucs, error: aErr } = await supabase
      .from('auctions')
      .select('id, title, images')
      .in('id', auctionIds)
    if (!aErr && aucs) {
      auctionMap = new Map(aucs.map((a) => [a.id as string, a as { id: string; title: string; images: unknown }]))
    }
  }

  const enriched = list.map((p) => ({
    ...p,
    auction: p.auction_id ? auctionMap.get(p.auction_id as string) ?? null : null,
  }))

  return NextResponse.json({ payments: enriched })
}
