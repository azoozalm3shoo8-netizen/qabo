/**
 * منسّق أحداث المنصة (جانب الخادم).
 *
 * إشعارات المزايدة (تجاوز / فوز / خاسرين / بائع عند الإغلاق) → `notification-service.ts`
 * إشعارات مالية (دفع، استرداد، إتمام صفقة…) → `insertFinancialNotification` في `financial-notifications.ts`
 */
import 'server-only'

import { broadcastAuctionPayload } from '@/lib/server/auction-realtime-broadcast'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { createClient } from '@/lib/supabase-server'
import {
  createNotification,
  notifyOutbid,
  notifyWin,
} from '@/lib/services/notification-service'
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

/** سياق إشعار التجاوز — يُمرَّر من `bidding-service` بعد قراءة أعلى مزايد سابق */
export type BidPlacedNotifyContext = {
  previousHighBidderId?: string
  auctionTitle: string
}

/**
 * تأثيرات جانبية بعد مزايدة ناجحة — لا تُعطل المسار الرئيسي عند الفشل.
 * إشعار التجاوز يُرسل هنا مرة واحدة فقط (لا تكرار في bidding-service).
 */
export async function onBidPlaced(
  auctionId: string,
  bidderId: string,
  bidTime: Date = new Date(),
  notify?: BidPlacedNotifyContext
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

  await runSafe('notify_outbid_once', async () => {
    const prev = notify?.previousHighBidderId
    const title = notify?.auctionTitle?.trim() || 'مزاد'
    if (prev && prev !== bidderId) {
      await notifyOutbid(prev, auctionId, title)
    }
  })

  return { extended, newEndTime, extensionCount }
}

export type AuctionClosedContext = {
  winnerId?: string | null
  sellerId?: string
  auctionTitle?: string
  loserIds?: string[]
  salePriceHalalas?: number
  category?: string
}

/**
 * بعد انتهاء المزاد: تسعير، تقرير، XP، ثم إشعارات الإغلاق (فائز / بائع / خاسرين) عبر notification-service.
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

  await runSafe('auction_closed_notifications', async () => {
    const title = (ctx?.auctionTitle && ctx.auctionTitle.trim()) || 'مزاد'
    const sellerId = ctx?.sellerId
    const winnerId = ctx?.winnerId ?? null
    const losers = ctx?.loserIds ?? []

    if (winnerId) {
      await notifyWin(winnerId, auctionId, title)
    }

    if (sellerId) {
      await createNotification({
        userId: sellerId,
        type: 'system',
        title: winnerId ? `تم بيع «${title.slice(0, 60)}»` : `انتهى مزاد «${title.slice(0, 60)}» بدون فائز`,
        body: winnerId ? 'تابع الصفقة من لوحة الطلبات.' : 'يمكنك إعادة إدراج المنتج لاحقاً.',
        link: `/auction/${auctionId}`,
        auctionId,
      })
    }

    for (const lid of losers) {
      if (!lid || lid === winnerId) continue
      await createNotification({
        userId: lid,
        type: 'system',
        title: `انتهى مزاد «${title.slice(0, 55)}»`,
        body: 'لم يحالفك الحظ هذه المرة — تصفح مزادات أخرى',
        link: `/auction/${auctionId}`,
        auctionId,
      })
    }
  })
}

/** ربط من مسار الدفع بعد التأكيد — إشعارات عبر notification-service */
export async function onPaymentReceived(data: {
  dealId: string
  buyerId: string
  sellerId: string
  auctionTitle: string
}): Promise<void> {
  try {
    const t = data.auctionTitle.slice(0, 80)
    await createNotification({
      userId: data.sellerId,
      type: 'payment',
      title: `تم استلام دفعة «${t}»`,
      body: 'يرجى شحن القطعة خلال 3 أيام',
      link: `/orders/${data.dealId}`,
      dealId: data.dealId,
    })
    await createNotification({
      userId: data.buyerId,
      type: 'payment',
      title: 'تم الدفع بنجاح',
      body: 'في انتظار شحن البائع',
      link: `/orders/${data.dealId}`,
      dealId: data.dealId,
    })
  } catch (error) {
    console.error('[Orchestrator] onPaymentReceived error:', error)
  }
}

export async function onShipmentConfirmed(data: {
  dealId: string
  buyerId: string
  trackingNumber: string
  shippingProvider: string
}): Promise<void> {
  try {
    await createNotification({
      userId: data.buyerId,
      type: 'shipping',
      title: 'تم شحن قطعتك! 📦',
      body: `شركة الشحن: ${data.shippingProvider} — رقم التتبع: ${data.trackingNumber}`,
      link: `/orders/${data.dealId}`,
      dealId: data.dealId,
    })
  } catch (error) {
    console.error('[Orchestrator] onShipmentConfirmed error:', error)
  }
}

export async function onInspectionComplete(data: {
  dealId: string
  buyerId: string
  sellerId: string
  accepted: boolean
  auctionTitle: string
}): Promise<void> {
  try {
    const t = data.auctionTitle.slice(0, 60)
    if (data.accepted) {
      await createNotification({
        userId: data.sellerId,
        type: 'payment',
        title: `تم قبول «${t}» ✅`,
        body: 'سيتم تحويل المبلغ لحسابك',
        link: `/orders/${data.dealId}`,
        dealId: data.dealId,
      })
    } else {
      await createNotification({
        userId: data.sellerId,
        type: 'dispute',
        title: `المشتري رفض «${t}» ⚠️`,
        body: 'تم فتح نزاع — يرجى الرد خلال 48 ساعة',
        link: `/orders/${data.dealId}`,
        dealId: data.dealId,
      })
    }
  } catch (error) {
    console.error('[Orchestrator] onInspectionComplete error:', error)
  }
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
