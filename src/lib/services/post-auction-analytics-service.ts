import 'server-only'

import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { createClient } from '@/lib/supabase-server'
import { suggestAuctionPricing } from '@/lib/smart-pricing'
import type { PostAuctionReport } from '@/lib/types/post-auction-analytics'

const DAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function auctionPriceSar(a: Record<string, unknown>): number {
  if (a.current_price != null && a.current_price !== '') {
    return Math.round(Number(a.current_price)) / 100
  }
  return Math.round(Number(a.current_bid ?? a.start_price ?? 0))
}

function formatDurationAr(from: Date, to: Date): string {
  const ms = to.getTime() - from.getTime()
  if (ms <= 0) return 'مباشرة بعد النشر'
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d > 0) return `بعد ${d} ${d === 1 ? 'يوم' : 'أيام'} من النشر`
  if (h > 0) return `بعد ${h} ${h === 1 ? 'ساعة' : 'ساعات'} من النشر`
  const m = Math.floor(ms / 60000)
  return `بعد ${Math.max(1, m)} دقيقة من النشر`
}

function mostActiveFromBids(rows: { created_at?: string }[]): string | null {
  if (!rows.length) return null
  const buckets = new Map<string, number>()
  for (const r of rows) {
    const t = r.created_at ? new Date(r.created_at) : null
    if (!t || Number.isNaN(t.getTime())) continue
    const key = `${t.getDay()}_${t.getHours()}`
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  let best = ''
  let bestC = 0
  for (const [k, c] of buckets) {
    if (c > bestC) {
      bestC = c
      best = k
    }
  }
  if (!best) return null
  const [dayStr, hStr] = best.split('_')
  const day = DAY_AR[Number(dayStr)] ?? ''
  const h = Number(hStr)
  const start = h
  const end = Math.min(23, h + 2)
  return `${day} ${start}:00–${end}:00 تقريباً`
}

function buildTips(r: PostAuctionReport): string[] {
  const tips: string[] = []
  const generic = 'شارك مزاداتك على وسائل التواصل لجذب مزايدين أكثر'

  if (r.status === 'no_bids') {
    tips.push('جرّب سعر افتتاحي أقل — المزادات بسعر منخفض تجذب مزايدين أكثر')
    tips.push('أضف صوراً أكثر أو فيديو 360° لزيادة الثقة')
  }
  if (r.questionsAsked > 0 && r.questionsAnswered === 0) {
    tips.push('أجب على أسئلة المشترين — البائع المتجاوب يبيع أسرع بـ 40%')
  }
  if (r.totalWatchers > 5 && r.totalBids < 2) {
    tips.push('مزادك جذب اهتماماً لكن مزايدات قليلة — قد يكون السعر الافتتاحي عالياً')
  }
  if (r.priceIncrease != null && r.priceIncrease > 200) {
    tips.push(`أداء ممتاز! السعر ارتفع ${Math.round(r.priceIncrease)}% — استمر بنفس الأسلوب`)
  }
  if (r.antiSnipeExtensions > 0) {
    tips.push('المزاد شهد منافسة حامية في اللحظات الأخيرة — علامة ممتازة!')
  }

  tips.push(generic)
  return [...new Set(tips)].slice(0, 6)
}

export async function generatePostAuctionReport(auctionId: string): Promise<PostAuctionReport | null> {
  const supabase = createClient()
  try {
    const { data: auction, error: aErr } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
    if (aErr || !auction) return null

    const a = auction as Record<string, unknown>
    const title = String(a.title ?? 'مزاد')
    const statusStr = String(a.status ?? '')
    const category = String(a.category ?? 'أخرى')
    const startingBid = Math.round(Number(a.start_price ?? 0))

    const { data: bidRows } = await supabase
      .from('bids')
      .select('id, bidder_id, amount, created_at')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: true })

    const bids = bidRows ?? []
    const totalBids = bids.length
    const uniqueBidders = new Set(bids.map((b) => b.bidder_id as string).filter(Boolean)).size

    const { count: watcherCount } = await supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('auction_id', auctionId)

    const { data: qRows } = await supabase.from('auction_questions').select('id, answer').eq('auction_id', auctionId)
    const questions = qRows ?? []
    const questionsAsked = questions.length
    const questionsAnswered = questions.filter((q) => q.answer != null && String(q.answer).trim() !== '').length

    let reportStatus: PostAuctionReport['status'] = 'no_bids'
    let finalPrice: number | null = null
    let priceIncrease: number | null = null

    if (statusStr === 'sold') {
      reportStatus = 'sold'
      const top = [...bids].sort((x, y) => Number(y.amount) - Number(x.amount))[0]
      if (top) {
        finalPrice = Math.round(Number(top.amount)) / 100
        if (startingBid > 0) {
          priceIncrease = ((finalPrice - startingBid) / startingBid) * 100
        }
      }
    } else if (statusStr === 'cancelled') {
      reportStatus = 'reserve_not_met'
      const top = [...bids].sort((x, y) => Number(y.amount) - Number(x.amount))[0]
      if (top) finalPrice = Math.round(Number(top.amount)) / 100
    } else if (totalBids === 0 || statusStr === 'expired') {
      reportStatus = 'no_bids'
    }

    const createdAt = a.created_at ? new Date(String(a.created_at)) : new Date()
    let firstBidAfter: string | null = null
    if (bids[0]?.created_at) {
      firstBidAfter = formatDurationAr(createdAt, new Date(String(bids[0].created_at)))
    }

    const mostActivePeriod = mostActiveFromBids(bids as { created_at?: string }[])

    const antiSnipeExtensions = Number((a.extension_count as number | undefined) ?? 0)

    const cond = String(a.condition ?? 'good')
    const pricing = suggestAuctionPricing({
      category,
      condition: cond as 'new' | 'like_new' | 'good' | 'fair' | 'poor',
      title,
      originalPrice: a.original_price != null ? Number(a.original_price) : undefined,
    })
    const estimatedFMV = pricing.estimatedFMV

    const { data: catAuctions } = await supabase
      .from('auctions')
      .select('bid_count, current_bid, current_price')
      .eq('category', category)
      .eq('status', 'sold')
      .neq('id', auctionId)
      .limit(150)

    const rows = catAuctions ?? []
    let categoryAvgBids = 0
    let categoryAvgPrice = 0
    if (rows.length) {
      categoryAvgBids =
        rows.reduce((s, r) => s + Number((r as { bid_count?: number }).bid_count ?? 0), 0) / rows.length
      const prices = rows.map((r) => auctionPriceSar(r as Record<string, unknown>))
      categoryAvgPrice = prices.reduce((s, p) => s + p, 0) / prices.length
    }

    let performanceVsCategory: PostAuctionReport['performanceVsCategory'] = 'average'
    if (rows.length) {
      const bidScore = totalBids >= categoryAvgBids * 1.15 ? 1 : totalBids <= categoryAvgBids * 0.85 ? -1 : 0
      const priceScore =
        finalPrice != null && categoryAvgPrice > 0
          ? finalPrice >= categoryAvgPrice * 1.1
            ? 1
            : finalPrice <= categoryAvgPrice * 0.9
              ? -1
              : 0
          : 0
      const sum = bidScore + priceScore
      if (sum > 0) performanceVsCategory = 'above'
      else if (sum < 0) performanceVsCategory = 'below'
    }

    let trustScoreChange = 0
    let newTrustScore = 0
    try {
      const { data: sp } = await supabase.from('seller_profiles').select('trust_score').eq('user_id', a.seller_id).maybeSingle()
      newTrustScore = Math.round(Number((sp as { trust_score?: number })?.trust_score ?? 0))
    } catch {
      /* ignore */
    }

    const draft: PostAuctionReport = {
      auctionId,
      title,
      status: reportStatus,
      startingBid,
      finalPrice,
      priceIncrease,
      estimatedFMV,
      totalBids,
      uniqueBidders,
      totalWatchers: watcherCount ?? 0,
      questionsAsked,
      questionsAnswered,
      firstBidAfter,
      mostActivePeriod,
      antiSnipeExtensions,
      categoryAvgBids: Math.round(categoryAvgBids * 10) / 10,
      categoryAvgPrice: Math.round(categoryAvgPrice),
      performanceVsCategory,
      tips_ar: [],
      trustScoreChange,
      newTrustScore,
    }
    draft.tips_ar = buildTips(draft)
    return draft
  } catch (e) {
    console.error('[generatePostAuctionReport]', e)
    return null
  }
}

export async function persistPostAuctionReport(auctionId: string): Promise<void> {
  const supabase = createClient()
  try {
    const report = await generatePostAuctionReport(auctionId)
    if (!report) return

    const { data: auc } = await supabase.from('auctions').select('seller_id, title').eq('id', auctionId).maybeSingle()
    const sellerId = auc?.seller_id as string | undefined
    if (!sellerId) return

    const { error } = await supabase.from('post_auction_reports').upsert(
      {
        auction_id: auctionId,
        seller_id: sellerId,
        report: report as unknown as Record<string, unknown>,
      },
      { onConflict: 'auction_id' }
    )

    if (error) {
      console.error('[persistPostAuctionReport]', error.message)
      return
    }

    await insertFinancialNotification(supabase, {
      user_id: sellerId,
      type: 'post_auction_report',
      title: '📊 تقرير المزاد جاهز',
      body: `📊 تقرير مزادك (${String(auc?.title ?? '')}) جاهز — اطّلع على الأداء`,
      auction_id: auctionId,
    })
  } catch (e) {
    console.error('[persistPostAuctionReport]', e)
  }
}
