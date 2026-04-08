import 'server-only'

import { normalizeAuctionImages } from '@/lib/auction-images'
import { createClient } from '@/lib/supabase-server'
import type { AuctionRecommendation } from '@/lib/types/recommendations'

function priceSar(row: Record<string, unknown>): number {
  if (row.current_price != null && row.current_price !== '') {
    return Math.round(Number(row.current_price)) / 100
  }
  return Math.round(Number(row.current_bid ?? row.start_price ?? 0))
}

function rowToRec(
  row: Record<string, unknown>,
  reason_ar: string,
  watcherCount = 0
): AuctionRecommendation {
  const imgs = normalizeAuctionImages(row.images)
  return {
    auctionId: String(row.id),
    title: String(row.title ?? 'مزاد'),
    currentPrice: priceSar(row),
    imageUrl: imgs[0] ?? null,
    endsAt: String(row.ends_at ?? ''),
    bidCount: Math.round(Number(row.bid_count ?? 0)),
    watcherCount,
    category: String(row.category ?? ''),
    reason_ar,
  }
}

async function watcherCountsForAuctions(
  supabase: ReturnType<typeof createClient>,
  ids: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!ids.length) return map
  const chunk = 80
  for (let i = 0; i < ids.length; i += chunk) {
    const part = ids.slice(i, i + chunk)
    try {
      const { data } = await supabase.from('favorites').select('auction_id').in('auction_id', part)
      for (const r of data ?? []) {
        const aid = r.auction_id as string
        map.set(aid, (map.get(aid) ?? 0) + 1)
      }
    } catch {
      /* ignore */
    }
  }
  return map
}

export async function getRecommendationsForUser(userId: string, limit = 12): Promise<AuctionRecommendation[]> {
  const supabase = createClient()
  const cap = Math.min(40, Math.max(1, limit))
  try {
    const { data: bids } = await supabase
      .from('bids')
      .select('auction_id, created_at')
      .eq('bidder_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const bidAuctionIds = [...new Set((bids ?? []).map((b) => b.auction_id as string).filter(Boolean))]
    if (!bidAuctionIds.length) {
      return getTrendingAuctions(cap)
    }

    const { data: pastAuctions } = await supabase
      .from('auctions')
      .select('id, category')
      .in('id', bidAuctionIds)

    const catWeights = new Map<string, number>()
    let w = 20
    for (const b of bids ?? []) {
      const aid = b.auction_id as string
      const cat = (pastAuctions ?? []).find((a) => a.id === aid)?.category as string | undefined
      if (cat) {
        catWeights.set(cat, (catWeights.get(cat) ?? 0) + w)
        w = Math.max(1, w - 1)
      }
    }

    const topCats = [...catWeights.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 5)
    if (!topCats.length) return getTrendingAuctions(cap)

    const { data: candidates } = await supabase
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .in('category', topCats)
      .order('bid_count', { ascending: false })
      .limit(80)

    const rows = (candidates ?? []).filter((r) => !bidAuctionIds.includes(String(r.id)))
    const scored = rows
      .map((r) => {
        const cat = String(r.category ?? '')
        const score = (catWeights.get(cat) ?? 0) * 10 + Number(r.bid_count ?? 0)
        return { r: r as Record<string, unknown>, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, cap)

    const ids = scored.map((s) => String(s.r.id))
    const wm = await watcherCountsForAuctions(supabase, ids)
    return scored.map((s) =>
      rowToRec(s.r, 'بناءً على مزايداتك السابقة', wm.get(String(s.r.id)) ?? 0)
    )
  } catch (e) {
    console.error('[getRecommendationsForUser]', e)
    return []
  }
}

export async function getSimilarAuctions(auctionId: string, limit = 10): Promise<AuctionRecommendation[]> {
  const supabase = createClient()
  const cap = Math.min(30, Math.max(1, limit))
  try {
    const { data: base, error } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
    if (error || !base) return []

    const b = base as Record<string, unknown>
    const category = String(b.category ?? '')
    const sellerId = String(b.seller_id ?? '')
    const mid = priceSar(b)
    const low = mid * 0.5
    const high = mid * 1.5

    const { data: rows } = await supabase
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .eq('category', category)
      .neq('id', auctionId)
      .order('bid_count', { ascending: false })
      .limit(80)

    const filtered = (rows ?? [])
      .filter((r) => String((r as { seller_id?: string }).seller_id) !== sellerId)
      .filter((r) => {
        const p = priceSar(r as Record<string, unknown>)
        return p >= low && p <= high
      })
      .sort((a, c) => {
        const ta = new Date(String((a as { ends_at?: string }).ends_at)).getTime()
        const tc = new Date(String((c as { ends_at?: string }).ends_at)).getTime()
        const ba = Number((a as { bid_count?: number }).bid_count ?? 0)
        const bc = Number((c as { bid_count?: number }).bid_count ?? 0)
        if (bc !== ba) return bc - ba
        return ta - tc
      })
      .slice(0, cap)

    const ids = filtered.map((r) => String((r as { id: string }).id))
    const wm = await watcherCountsForAuctions(supabase, ids)
    return filtered.map((r) =>
      rowToRec(r as Record<string, unknown>, 'مشابه لهذا المزاد', wm.get(String((r as { id: string }).id)) ?? 0)
    )
  } catch (e) {
    console.error('[getSimilarAuctions]', e)
    return []
  }
}

export async function getTrendingAuctions(limit = 12): Promise<AuctionRecommendation[]> {
  const supabase = createClient()
  const cap = Math.min(40, Math.max(1, limit))
  try {
    const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString()

    const { data: recentBids } = await supabase
      .from('bids')
      .select('auction_id')
      .gte('created_at', dayAgo)

    const bidCounts = new Map<string, number>()
    for (const r of recentBids ?? []) {
      const id = r.auction_id as string
      if (id) bidCounts.set(id, (bidCounts.get(id) ?? 0) + 1)
    }

    const { data: recentFav } = await supabase
      .from('favorites')
      .select('auction_id')
      .gte('created_at', dayAgo)

    const favCounts = new Map<string, number>()
    for (const r of recentFav ?? []) {
      const id = r.auction_id as string
      if (id) favCounts.set(id, (favCounts.get(id) ?? 0) + 1)
    }

    const { data: hot } = await supabase
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .order('bid_count', { ascending: false })
      .limit(40)

    const scored = (hot ?? []).map((r) => {
      const id = String((r as { id: string }).id)
      const s = (bidCounts.get(id) ?? 0) * 3 + (favCounts.get(id) ?? 0) * 2 + Number((r as { bid_count?: number }).bid_count ?? 0)
      return { r: r as Record<string, unknown>, s }
    })
    scored.sort((a, b) => b.s - a.s)
    const top = scored.slice(0, cap).map((x) => x.r)
    const ids = top.map((r) => String(r.id))
    const wm = await watcherCountsForAuctions(supabase, ids)
    return top.map((r) => rowToRec(r, '🔥 رائج الآن', wm.get(String(r.id)) ?? 0))
  } catch (e) {
    console.error('[getTrendingAuctions]', e)
    return []
  }
}
