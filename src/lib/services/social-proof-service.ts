import 'server-only'

import { createClient } from '@/lib/supabase-server'
import type { SocialProof } from '@/lib/types/social-proof'

export type { SocialProof } from '@/lib/types/social-proof'

function formatRelativeArFromMs(agoMs: number): string {
  if (!Number.isFinite(agoMs) || agoMs < 0) return '—'
  const sec = Math.floor(agoMs / 1000)
  if (sec < 45) return 'الآن'
  const min = Math.floor(sec / 60)
  if (min < 60) {
    if (min === 1) return 'قبل دقيقة'
    if (min === 2) return 'قبل دقيقتين'
    return `قبل ${min} دقائق`
  }
  const h = Math.floor(min / 60)
  if (h < 24) {
    if (h === 1) return 'قبل ساعة'
    if (h === 2) return 'قبل ساعتين'
    return `قبل ${h} ساعات`
  }
  const d = Math.floor(h / 24)
  if (d === 1) return 'قبل يوم'
  return `قبل ${d} أيام`
}

function pickHotReason(watcherCount: number, bidderCount: number, totalBids: number): string | undefined {
  if (watcherCount >= 10) return '🔥 10+ شخص يراقبون'
  if (bidderCount >= 3) return '🔥 منافسة قوية — 3 مزايدين أو أكثر'
  if (totalBids >= 5) return '🔥 منافسة قوية — 5 مزايدات أو أكثر'
  return undefined
}

export async function getAuctionSocialProof(auctionId: string): Promise<SocialProof> {
  const supabase = createClient()
  const empty: SocialProof = {
    watcherCount: 0,
    bidderCount: 0,
    totalBids: 0,
    lastBidAgo: '—',
    isHot: false,
  }

  try {
    const [favRes, bidCountRes, bidRowsRes, lastBidRes] = await Promise.all([
      supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('auction_id', auctionId),
      supabase.from('bids').select('*', { count: 'exact', head: true }).eq('auction_id', auctionId),
      supabase.from('bids').select('bidder_id').eq('auction_id', auctionId),
      supabase
        .from('bids')
        .select('created_at')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (favRes.error) console.error('[getAuctionSocialProof] favorites', favRes.error.message)
    if (bidCountRes.error) console.error('[getAuctionSocialProof] bid count', bidCountRes.error.message)
    if (bidRowsRes.error) console.error('[getAuctionSocialProof] bidders', bidRowsRes.error.message)
    if (lastBidRes.error) console.error('[getAuctionSocialProof] last bid', lastBidRes.error.message)

    const watcherCount = favRes.count ?? 0
    const totalBids = bidCountRes.count ?? 0
    const bidderSet = new Set((bidRowsRes.data ?? []).map((b) => b.bidder_id as string).filter(Boolean))
    const bidderCount = bidderSet.size

    let lastBidAgo = '—'
    if (lastBidRes.data?.created_at) {
      const t = new Date(String(lastBidRes.data.created_at)).getTime()
      lastBidAgo = formatRelativeArFromMs(Date.now() - t)
    }

    const isHot = watcherCount >= 10 || bidderCount >= 3 || totalBids >= 5
    const hotReason = isHot ? pickHotReason(watcherCount, bidderCount, totalBids) : undefined

    return {
      watcherCount,
      bidderCount,
      totalBids,
      lastBidAgo,
      isHot,
      hotReason,
    }
  } catch (e) {
    console.error('[getAuctionSocialProof]', e)
    return empty
  }
}
