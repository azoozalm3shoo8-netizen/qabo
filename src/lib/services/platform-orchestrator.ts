/**
 * منسّق أحداث المنصة (جانب الخادم).
 *
 * الهدف طويل المدى (مرجع للتوسعة):
 * - `onBidPlaced`: سلسلة auto-bid، anti-snipe، بث realtime، إشعارات (تجاوز/بائع)، awardXP، شارات social proof.
 * - `onAuctionClosed`: فائز، deal، إشعارات (فائز/خاسرين/بائع)، تحرير ودائع، awardXP، تسعير، تقرير ما بعد المزاد، بث `auction_closed`.
 * - دفع/شحن/فحص/نزاع: ربط Moyasar capture، مؤقتات الشحن والفحص، فتح نزاع تلقائي عند الرفض.
 *
 * التنفيذ الحالي يغطي جزءاً من ذلك؛ توسّعه تدريجياً دون كسر المسارات الحرجة.
 */
import 'server-only'

import { broadcastAuctionPayload } from '@/lib/server/auction-realtime-broadcast'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { createClient } from '@/lib/supabase-server'
import { createNotification } from '@/lib/services/notification-service'
import {
  checkAndExtendAuction,
  notifyBiddersAuctionExtended,
} from '@/lib/services/anti-snipe-service'
import { updateTrustScore } from '@/lib/services/auction-protection-service'
import { awardXP } from '@/lib/services/buyer-gamification-service'
import { persistPostAuctionReport } from '@/lib/services/post-auction-analytics-service'
import { recordPricingOutcome } from '@/lib/services/pricing-feedback-service'

async function runSafe(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[platform-orchestrator:${label}]`, msg)
  }
}

export type BidPlacedOrchestrationResult = {
  extended: boolean
  newEndTime?: string
  extensionCount?: number
}

/**
 * تأثيرات جانبية بعد مزايدة ناجحة — لا تُعطل المسار الرئيسي عند الفشل.
 */
export async function onBidPlaced(
  auctionId: string,
  bidderId: string,
  bidTime: Date = new Date()
): Promise<BidPlacedOrchestrationResult> {
  let extended = false
  let newEndTime: string | undefined
  let extensionCount: number | undefined

  await runSafe('anti_snipe', async () => {
    const r = await checkAndExtendAuction(auctionId, bidTime)
    extended = Boolean(r.extended)
    if (r.newEndTime) newEndTime = r.newEndTime.toISOString()
    if (r.extensionCount != null) extensionCount = r.extensionCount
    if (r.extended) {
      const supabase = createClient()
      await notifyBiddersAuctionExtended(supabase, auctionId)
      void broadcastAuctionPayload(auctionId, 'auction_extended', {
        auction_id: auctionId,
        new_ends_at: r.newEndTime?.toISOString(),
        extension_number: r.extensionCount,
      })
    }
  })

  await runSafe('buyer_xp_bid', async () => {
    await awardXP(bidderId, 'bid')
  })

  return { extended, newEndTime, extensionCount }
}

export type AuctionClosedContext = {
  winnerId?: string
  salePriceHalalas?: number
  category?: string
}

/**
 * بعد انتهاء المزاد (أي حالة نهائية): تسعير تعلُّمي، تقرير بائع، ونقاط فوز عند البيع.
 */
export async function onAuctionClosed(auctionId: string, ctx?: AuctionClosedContext): Promise<void> {
  await runSafe('pricing_feedback', async () => {
    await recordPricingOutcome(auctionId)
  })
  await runSafe('post_auction_report', async () => {
    await persistPostAuctionReport(auctionId)
  })
  if (ctx?.winnerId) {
    await runSafe('buyer_xp_win', async () => {
      await awardXP(ctx.winnerId!, 'win', {
        salePriceHalalas: ctx.salePriceHalalas ?? 0,
        category: ctx.category ?? '',
      })
    })
  }

  await runSafe('notify_auction_losers', async () => {
    if (!ctx?.winnerId) return
    const supabase = createClient()
    const { data: auction } = await supabase.from('auctions').select('title').eq('id', auctionId).maybeSingle()
    const title = String(auction?.title ?? 'مزاد')
    const { data: bidRows } = await supabase.from('bids').select('bidder_id').eq('auction_id', auctionId)
    const losers = [...new Set((bidRows ?? []).map((b) => String(b.bidder_id)).filter(Boolean))].filter(
      (id) => id !== ctx.winnerId
    )
    for (const lid of losers) {
      await createNotification({
        userId: lid,
        type: 'system',
        title: `انتهى مزاد «${title.slice(0, 60)}»`,
        body: 'لم تفز هذه المرة — تصفح مزادات أخرى',
        link: `/auction/${auctionId}`,
        auctionId,
      })
    }
  })
}

/** TODO: ربط من مسار الدفع بعد التأكيد (Moyasar/Tap) */
export async function onPaymentReceivedOrchestration(_data: {
  sellerId: string
  dealId: string
  auctionId?: string
}): Promise<void> {
  // await notifyPaymentReceived(_data.sellerId, _data.dealId, _data.auctionId)
}

/** TODO: ربط من PATCH الطلب عند mark_shipped */
export async function onShipmentConfirmedOrchestration(_data: {
  buyerId: string
  dealId: string
  trackingNumber: string
  auctionId?: string
}): Promise<void> {
  // await notifyShipped(...)
}

/** TODO: ربط من مسار إكمال الفحص */
export async function onInspectionCompleteOrchestration(_dealId: string): Promise<void> {
  void _dealId
}

/** TODO: ربط من مسار النزاع */
export async function onDisputeOpenedOrchestration(_dealId: string, _targetUserId: string): Promise<void> {
  void _dealId
  void _targetUserId
}

/**
 * بعد قبول المشتري للصفقة واكتمال التسليم (مسار acceptDeal).
 */
export async function onDealCompleted(dealId: string): Promise<void> {
  const supabase = createClient()
  let deal: Record<string, unknown> | null = null
  try {
    const { data } = await supabase.from('deals').select('*').eq('id', dealId).maybeSingle()
    deal = data as Record<string, unknown> | null
  } catch (e) {
    console.error('[platform-orchestrator:onDealCompleted] load deal', e)
    return
  }
  if (!deal) return

  const buyerId = String(deal.buyer_id ?? '')
  const sellerId = String(deal.seller_id ?? '')
  const auctionId = String(deal.auction_id ?? '')

  await runSafe('buyer_xp_deal', async () => {
    await awardXP(buyerId, 'deal_complete')
  })

  await runSafe('seller_trust', async () => {
    if (sellerId && auctionId) {
      await updateTrustScore(sellerId, 'sale_success', auctionId)
    }
  })

  await runSafe('notify_buyer_deal_done', async () => {
    await insertFinancialNotification(supabase, {
      user_id: buyerId,
      type: 'deal_completed',
      title: 'تم إتمام الصفقة',
      body: 'تم إتمام الصفقة بنجاح — شكراً لاستخدامك قبو.',
      auction_id: auctionId || undefined,
      deal_id: dealId,
    })
  })

  await runSafe('notify_seller_deal_done', async () => {
    await insertFinancialNotification(supabase, {
      user_id: sellerId,
      type: 'deal_completed',
      title: 'تم إتمام الصفقة',
      body: 'أكمل المشتري استلام الطلب — تم تحديث حالة الصفقة.',
      auction_id: auctionId || undefined,
      deal_id: dealId,
    })
  })
}

export async function onFavoriteAdded(userId: string, _auctionId: string): Promise<void> {
  await runSafe('buyer_xp_watch', async () => {
    await awardXP(userId, 'watch')
  })
}
