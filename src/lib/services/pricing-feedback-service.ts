import 'server-only'

import { createClient } from '@/lib/supabase-server'
import { suggestAuctionPricing } from '@/lib/smart-pricing'
import type { EnhancedSuggestion, PricingInsight } from '@/lib/types/pricing-feedback'

function sarToHalalas(sar: number): number {
  return Math.round(Math.max(0, sar) * 100)
}

export async function recordPricingOutcome(auctionId: string): Promise<void> {
  const supabase = createClient()
  try {
    const { data: auction, error: aErr } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
    if (aErr || !auction) return

    const a = auction as Record<string, unknown>
    const category = String(a.category ?? '')
    const condition = String(a.condition ?? 'good')
    const title = String(a.title ?? '')
    const startSar = Number(a.start_price ?? 0)
    const originalPrice =
      a.original_price != null && Number.isFinite(Number(a.original_price))
        ? Number(a.original_price)
        : undefined

    const suggested = suggestAuctionPricing({
      category,
      condition: condition as 'new' | 'like_new' | 'good' | 'fair' | 'poor',
      title,
      originalPrice,
    })

    const { data: bids } = await supabase.from('bids').select('bidder_id, amount').eq('auction_id', auctionId)
    const bidRows = bids ?? []
    const totalBids = bidRows.length
    const uniqueBidders = new Set(bidRows.map((b) => b.bidder_id as string).filter(Boolean)).size
    const hadBids = totalBids > 0

    let finalHalalas = 0
    if (bidRows.length) {
      const top = bidRows.reduce((x, y) => (Number(y.amount) > Number(x.amount) ? y : x))
      finalHalalas = Math.round(Number(top.amount))
    }

    const suggestedHalalas = sarToHalalas(suggested.suggestedStartingBid)
    const actualHalalas = sarToHalalas(startSar)
    let priceRatio: number | null = null
    if (suggestedHalalas > 0 && finalHalalas > 0) {
      priceRatio = Math.round((finalHalalas / suggestedHalalas) * 10000) / 10000
    }

    const { error: insErr } = await supabase.from('pricing_feedback').insert({
      auction_id: auctionId,
      category,
      condition,
      suggested_starting_bid: suggestedHalalas,
      actual_starting_bid: actualHalalas,
      final_price: finalHalalas,
      total_bids: totalBids,
      unique_bidders: uniqueBidders,
      had_bids: hadBids,
      price_ratio: priceRatio,
    })

    if (insErr) {
      console.error('[recordPricingOutcome]', insErr.message)
    }
  } catch (e) {
    console.error('[recordPricingOutcome]', e)
  }
}

export async function getCategoryPricingInsights(category: string): Promise<PricingInsight> {
  const empty: PricingInsight = {
    category,
    avgPriceRatio: 0,
    medianFinalPrice: 0,
    avgBidsWhenSold: 0,
    bestStartingBidRange: '',
    sampleSize: 0,
  }

  const supabase = createClient()
  try {
    const { data: rows, error } = await supabase
      .from('pricing_feedback')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[getCategoryPricingInsights]', error.message)
      return empty
    }

    const list = rows ?? []
    const sampleSize = list.length
    if (!sampleSize) return empty

    const withBids = list.filter((r) => r.had_bids && r.price_ratio != null)
    const ratios = withBids.map((r) => Number(r.price_ratio))
    const avgPriceRatio =
      ratios.length > 0 ? ratios.reduce((s, x) => s + x, 0) / ratios.length : 0

    const finals = list
      .filter((r) => r.final_price != null && Number(r.final_price) > 0)
      .map((r) => Number(r.final_price))
      .sort((a, b) => a - b)
    const mid = Math.floor(finals.length / 2)
    const medianFinalPrice =
      finals.length === 0 ? 0 : finals.length % 2 ? finals[mid] : (finals[mid - 1] + finals[mid]) / 2

    const soldish = list.filter((r) => r.had_bids && Number(r.final_price) > 0)
    const avgBidsWhenSold =
      soldish.length > 0
        ? soldish.reduce((s, r) => s + Number(r.total_bids ?? 0), 0) / soldish.length
        : 0

    const bins = new Map<string, { sumBids: number; n: number; minS: number; maxS: number }>()
    for (const r of list) {
      if (!r.had_bids) continue
      const ah = Number(r.actual_starting_bid ?? 0)
      if (ah <= 0) continue
      const sar = ah / 100
      const bucket = sar < 100 ? '0-100' : sar < 500 ? '100-500' : sar < 2000 ? '500-2000' : sar < 10000 ? '2000-10000' : '10000+'
      const cur = bins.get(bucket) ?? { sumBids: 0, n: 0, minS: sar, maxS: sar }
      cur.sumBids += Number(r.total_bids ?? 0)
      cur.n += 1
      cur.minS = Math.min(cur.minS, sar)
      cur.maxS = Math.max(cur.maxS, sar)
      bins.set(bucket, cur)
    }
    let bestKey = ''
    let bestAvg = -1
    for (const [k, v] of bins) {
      const av = v.n > 0 ? v.sumBids / v.n : 0
      if (av > bestAvg) {
        bestAvg = av
        bestKey = k
      }
    }
    const bestBin = bestKey ? bins.get(bestKey) : null
    const bestStartingBidRange = bestBin
      ? `حوالي ${Math.round(bestBin.minS).toLocaleString('ar-SA')}–${Math.round(bestBin.maxS).toLocaleString('ar-SA')} ر.س`
      : ''

    return {
      category,
      avgPriceRatio: Math.round(avgPriceRatio * 1000) / 1000,
      medianFinalPrice: Math.round(medianFinalPrice),
      avgBidsWhenSold: Math.round(avgBidsWhenSold * 10) / 10,
      bestStartingBidRange,
      sampleSize,
    }
  } catch (e) {
    console.error('[getCategoryPricingInsights]', e)
    return empty
  }
}

export async function enhancePricingSuggestion(input: {
  category: string
  condition: string
  originalPrice?: number
  title?: string
}): Promise<EnhancedSuggestion> {
  const base = suggestAuctionPricing({
    category: input.category,
    condition: (input.condition || 'good') as 'new' | 'like_new' | 'good' | 'fair' | 'poor',
    title: input.title ?? '',
    originalPrice: input.originalPrice,
  })

  let suggestedStartingBid = base.suggestedStartingBid
  let suggestedReservePrice = base.suggestedReservePrice
  let minimumBidIncrement = base.minimumBidIncrement
  let estimatedFMV = base.estimatedFMV
  let adjusted = false
  let adjustmentReason_ar: string | undefined
  let categoryInsight: PricingInsight | undefined

  try {
    const insight = await getCategoryPricingInsights(input.category)
    categoryInsight = insight.sampleSize >= 10 ? insight : undefined

    if (insight.sampleSize >= 10) {
      if (insight.avgPriceRatio > 3) {
        const f = 0.92
        suggestedStartingBid = Math.max(1, Math.round(suggestedStartingBid * f))
        suggestedReservePrice = Math.max(1, Math.round(suggestedReservePrice * f))
        minimumBidIncrement = Math.max(1, Math.round(minimumBidIncrement * f))
        estimatedFMV = Math.max(1, Math.round(estimatedFMV * f))
        adjusted = true
        adjustmentReason_ar =
          'خفّضنا سعر الافتتاح قليلاً لأن المزادات في هذه الفئة غالباً ترتفع كثيراً بعد المزايدة.'
      } else if (insight.avgPriceRatio < 1.5 && insight.avgPriceRatio > 0) {
        const f = 1.08
        suggestedStartingBid = Math.round(suggestedStartingBid * f)
        suggestedReservePrice = Math.round(suggestedReservePrice * f)
        minimumBidIncrement = Math.max(1, Math.round(minimumBidIncrement * f))
        estimatedFMV = Math.round(estimatedFMV * f)
        adjusted = true
        adjustmentReason_ar =
          'رفعنا سعر الافتتاح قليلاً لأن النتائج الأخيرة في الفئة كانت أقل من التوقعات.'
      }
    }
  } catch (e) {
    console.error('[enhancePricingSuggestion]', e)
  }

  return {
    estimatedFMV,
    suggestedStartingBid,
    suggestedReservePrice,
    minimumBidIncrement,
    breakdown: base.breakdown,
    tips_ar: base.tips_ar,
    adjusted,
    adjustmentReason_ar,
    categoryInsight,
  }
}
