import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateSellerResponsiveness } from '@/lib/services/seller-responsiveness-service'

export const revalidate = 3600

function bidderMask(userId: string): string {
  const tail = userId.replace(/-/g, '').slice(-4).toUpperCase()
  return `مزايد #${tail}`
}

function sellerMask(userId: string): string {
  const tail = userId.replace(/-/g, '').slice(-4).toUpperCase()
  return `بائع #${tail}`
}

export async function GET(req: NextRequest) {
  const viewerId = req.nextUrl.searchParams.get('user_id')?.trim() || null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'إعدادات الخادم ناقصة' }, { status: 500 })
  }

  const supabase = createClient(url, key)

  const { data: bidders, error: bErr } = await supabase
    .from('buyer_profiles')
    .select('user_id, xp, level, level_name, auctions_won')
    .order('xp', { ascending: false })
    .limit(10)

  if (bErr) {
    return NextResponse.json({ error: bErr.message }, { status: 500 })
  }

  const topBidders = (bidders ?? []).map((row, i) => ({
    rank: i + 1,
    label: bidderMask(String(row.user_id)),
    level: row.level,
    level_name: row.level_name,
    xp: row.xp,
    auctions_won: row.auctions_won,
    is_viewer: Boolean(viewerId && row.user_id === viewerId),
  }))

  let viewer_bidder: { rank: number; in_top_10: boolean; xp: number } | null = null
  if (viewerId) {
    const { data: mine } = await supabase.from('buyer_profiles').select('xp').eq('user_id', viewerId).maybeSingle()
    if (mine && mine.xp != null) {
      const xp = Number(mine.xp)
      const { count, error: cErr } = await supabase
        .from('buyer_profiles')
        .select('*', { count: 'exact', head: true })
        .gt('xp', xp)
      if (!cErr) {
        const rank = (count ?? 0) + 1
        viewer_bidder = { rank, in_top_10: rank <= 10, xp }
      }
    }
  }

  const { data: sellers, error: sErr } = await supabase
    .from('seller_profiles')
    .select('user_id, trust_score, trust_level, successful_sales')
    .neq('trust_level', 'banned')
    .order('trust_score', { ascending: false })
    .limit(10)

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 })
  }

  const topSellers = await Promise.all(
    (sellers ?? []).map(async (row, i) => {
      const uid = String(row.user_id)
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle()
      const raw = prof?.full_name != null ? String(prof.full_name).trim() : ''
      const display_name = raw.length > 0 ? raw : sellerMask(uid)
      const responsiveness = await calculateSellerResponsiveness(uid)
      return {
        rank: i + 1,
        display_name,
        trust_score: row.trust_score,
        trust_level: row.trust_level,
        successful_sales: row.successful_sales,
        responsiveness,
        is_viewer: Boolean(viewerId && uid === viewerId),
      }
    })
  )

  const [{ count: totalAuctions }, { count: totalBids }, { count: totalDeals }, pfResult, catResult] =
    await Promise.all([
      supabase.from('auctions').select('*', { count: 'exact', head: true }).neq('status', 'draft'),
      supabase.from('bids').select('*', { count: 'exact', head: true }),
      supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase
        .from('pricing_feedback')
        .select('final_price, actual_starting_bid')
        .eq('had_bids', true)
        .limit(800),
      supabase.from('auctions').select('category').order('created_at', { ascending: false }).limit(4000),
    ])

  let avg_price_increase_pct = 0
  const pf = pfResult.data ?? []
  let pn = 0
  let psum = 0
  for (const r of pf) {
    const a = Number(r.actual_starting_bid)
    const f = Number(r.final_price)
    if (a > 0 && f > 0) {
      psum += ((f - a) / a) * 100
      pn += 1
    }
  }
  if (pn > 0) avg_price_increase_pct = Math.round((psum / pn) * 10) / 10

  const catMap = new Map<string, number>()
  for (const c of catResult.data ?? []) {
    const k = String((c as { category?: string }).category ?? '').trim() || '—'
    catMap.set(k, (catMap.get(k) ?? 0) + 1)
  }
  let most_active_category = ''
  let most_active_count = 0
  for (const [k, v] of catMap) {
    if (v > most_active_count) {
      most_active_category = k
      most_active_count = v
    }
  }

  return NextResponse.json({
    topBidders,
    topSellers,
    viewer_bidder,
    platformStats: {
      total_auctions: totalAuctions ?? 0,
      total_bids: totalBids ?? 0,
      deals_completed: totalDeals ?? 0,
      avg_price_increase_pct,
      most_active_category: most_active_category || '—',
      most_active_category_count: most_active_count,
    },
  })
}
