import 'server-only'

import { createClient } from '@/lib/supabase-server'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { getAuctionSocialProof } from '@/lib/services/social-proof-service'

function startOfUtcDayIso(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)).toISOString()
}

function currentPriceSar(auction: Record<string, unknown>): number {
  if (auction.current_price != null && auction.current_price !== '') {
    return Math.round(Number(auction.current_price)) / 100
  }
  return Math.round(Number(auction.current_bid ?? 0))
}

/**
 * إشعارات ذكية دورية (تُستدعى من cron). تستخدم جدول notifications مع أنواع مميّزة لتفادي التكرار.
 */
export async function processSmartNotifications(): Promise<void> {
  const supabase = createClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const in1hIso = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
  const twentyMinAgo = new Date(now.getTime() - 20 * 60 * 1000).toISOString()
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
  const dayStart = startOfUtcDayIso()

  try {
    const { data: endingSoon, error: e1 } = await supabase
      .from('auctions')
      .select('id, title')
      .eq('status', 'active')
      .gt('ends_at', nowIso)
      .lte('ends_at', in1hIso)

    if (e1) console.error('[processSmartNotifications] endingSoon', e1.message)
    else {
      for (const a of endingSoon ?? []) {
        try {
          const aid = a.id as string
          const title = String(a.title ?? 'مزاد')
          const { data: favs, error: fErr } = await supabase
            .from('favorites')
            .select('user_id')
            .eq('auction_id', aid)
          if (fErr) {
            console.error('[processSmartNotifications] favorites', fErr.message)
            continue
          }
          for (const f of favs ?? []) {
            const uid = f.user_id as string
            if (!uid) continue
            const { data: dup } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', uid)
              .eq('type', 'auction_ending_watched')
              .eq('auction_id', aid)
              .maybeSingle()
            if (dup) continue
            await insertFinancialNotification(supabase, {
              user_id: uid,
              type: 'auction_ending_watched',
              title: '⏰ المزاد ينتهي قريباً',
              body: `⏰ المزاد اللي تراقبه (${title}) ينتهي خلال ساعة!`,
              auction_id: aid,
            })
          }
        } catch (e) {
          console.error('[processSmartNotifications] one ending', e)
        }
      }
    }
  } catch (e) {
    console.error('[processSmartNotifications] block a', e)
  }

  try {
    const { data: outbidNotes, error: e2 } = await supabase
      .from('notifications')
      .select('id, user_id, auction_id, created_at')
      .eq('type', 'outbid')
      .lt('created_at', thirtyMinAgo)
      .order('created_at', { ascending: false })
      .limit(300)

    if (e2) console.error('[processSmartNotifications] outbid query', e2.message)
    else {
      for (const n of outbidNotes ?? []) {
        try {
          const uid = n.user_id as string
          const aid = n.auction_id as string | null
          if (!uid || !aid) continue

          const { data: already } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', uid)
            .eq('type', 'outbid_reminder')
            .eq('auction_id', aid)
            .maybeSingle()
          if (already) continue

          const { data: auction, error: aErr } = await supabase
            .from('auctions')
            .select('id, title, status, highest_bidder_id, current_bid, current_price')
            .eq('id', aid)
            .maybeSingle()
          if (aErr || !auction) continue
          if (String(auction.status) !== 'active') continue
          if (auction.highest_bidder_id === uid) continue

          const title = String(auction.title ?? 'مزاد')
          const price = currentPriceSar(auction as Record<string, unknown>)
          await insertFinancialNotification(supabase, {
            user_id: uid,
            type: 'outbid_reminder',
            title: '🔔 تذكير: تم تجاوز مزايدتك',
            body: `🔔 تم تجاوز مزايدتك على (${title}) — السعر الحالي ${price.toLocaleString('ar-SA')} ر.س`,
            auction_id: aid,
          })
        } catch (e) {
          console.error('[processSmartNotifications] one outbid', e)
        }
      }
    }
  } catch (e) {
    console.error('[processSmartNotifications] block b', e)
  }

  try {
    const { data: freshAuctions, error: e3 } = await supabase
      .from('auctions')
      .select('id, title, category, seller_id')
      .eq('status', 'active')
      .gte('created_at', twentyMinAgo)

    if (e3) console.error('[processSmartNotifications] new auctions', e3.message)
    else {
      for (const auc of freshAuctions ?? []) {
        try {
          const aid = auc.id as string
          const cat = String(auc.category ?? '')
          const title = String(auc.title ?? 'مزاد')
          const sellerId = String((auc as { seller_id?: string }).seller_id ?? '')
          if (!cat) continue

          const { data: sameCatAuctions, error: catErr } = await supabase
            .from('auctions')
            .select('id')
            .eq('category', cat)
            .neq('id', aid)

          if (catErr) {
            console.error('[processSmartNotifications] same category auctions', catErr.message)
            continue
          }

          const otherIds = (sameCatAuctions ?? []).map((x) => x.id as string).filter(Boolean)
          const interested = new Set<string>()
          if (otherIds.length) {
            const chunkSize = 200
            for (let i = 0; i < otherIds.length; i += chunkSize) {
              const chunk = otherIds.slice(i, i + chunkSize)
              const { data: bidRows, error: pbErr } = await supabase
                .from('bids')
                .select('bidder_id')
                .in('auction_id', chunk)
              if (pbErr) {
                console.error('[processSmartNotifications] past bidders', pbErr.message)
                break
              }
              for (const row of bidRows ?? []) {
                const bid = row.bidder_id as string
                if (bid) interested.add(bid)
              }
            }
          }

          for (const uid of interested) {
            if (uid === sellerId) continue
            const { data: todayRows } = await supabase
              .from('notifications')
              .select('id, data')
              .eq('user_id', uid)
              .eq('type', 'similar_category_auction')
              .gte('created_at', dayStart)

            const dup = (todayRows ?? []).some((r) => {
              const d = r.data as { category?: string } | null
              return d?.category === cat
            })
            if (dup) continue

            await insertFinancialNotification(supabase, {
              user_id: uid,
              type: 'similar_category_auction',
              title: '🆕 مزاد جديد قد يهمك',
              body: `🆕 مزاد جديد في (${cat}) قد يهمك: ${title}`,
              auction_id: aid,
              data: { category: cat },
            })
          }
        } catch (e) {
          console.error('[processSmartNotifications] one similar', e)
        }
      }
    }
  } catch (e) {
    console.error('[processSmartNotifications] block c', e)
  }

  try {
    const { data: pendingDeals, error: e4 } = await supabase
      .from('deals')
      .select('id, buyer_id, auction_id, status, created_at')
      .eq('status', 'pending_payment')
      .lt('created_at', threeHoursAgo)
      .limit(200)

    if (e4) console.error('[processSmartNotifications] deals', e4.message)
    else {
      for (const d of pendingDeals ?? []) {
        try {
          const dealId = d.id as string
          const buyer = d.buyer_id as string
          const aid = d.auction_id as string
          const { data: nudge } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', buyer)
            .eq('type', 'win_payment_nudge')
            .eq('deal_id', dealId)
            .maybeSingle()
          if (nudge) continue

          const { data: auc } = await supabase.from('auctions').select('title').eq('id', aid).maybeSingle()
          const title = String(auc?.title ?? 'مزاد')

          await insertFinancialNotification(supabase, {
            user_id: buyer,
            type: 'win_payment_nudge',
            title: '🎉 أكمل الدفع',
            body: `🎉 مبروك! فزت بمزاد (${title}) — أكمل الدفع الآن`,
            auction_id: aid,
            deal_id: dealId,
          })
        } catch (e) {
          console.error('[processSmartNotifications] one deal nudge', e)
        }
      }
    }
  } catch (e) {
    console.error('[processSmartNotifications] block d', e)
  }
}

/**
 * بعد كل مزايدة: إشعارات بائع عند أول مزايدة، المزايدة الخامسة، أو دخول المزاد حالة «ساخن» (مرة واحدة).
 */
export async function notifySellerAuctionActivityOnNewBid(opts: {
  auctionId: string
  sellerId: string
  title: string
  newTotalBids: number
}): Promise<void> {
  const supabase = createClient()
  const { auctionId, sellerId, title, newTotalBids } = opts

  try {
    if (newTotalBids === 1) {
      await insertFinancialNotification(supabase, {
        user_id: sellerId,
        type: 'seller_auction_first_bid',
        title: '🎯 أول مزايدة',
        body: `🎯 مزادك (${title}) حصل على أول مزايدة!`,
        auction_id: auctionId,
      })
    }

    if (newTotalBids === 5) {
      await insertFinancialNotification(supabase, {
        user_id: sellerId,
        type: 'seller_auction_fifth_bid',
        title: '🔥 نشاط قوي',
        body: `🔥 مزادك (${title}) وصل إلى 5 مزايدات!`,
        auction_id: auctionId,
      })
    }

    const proof = await getAuctionSocialProof(auctionId)
    if (proof.isHot) {
      const { data: hotSent } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', sellerId)
        .eq('type', 'seller_auction_hot')
        .eq('auction_id', auctionId)
        .maybeSingle()
      if (!hotSent) {
        await insertFinancialNotification(supabase, {
          user_id: sellerId,
          type: 'seller_auction_hot',
          title: '🔥 مزادك أصبح ساخناً',
          body: `🔥 مزادك أصبح ساخناً — ${proof.totalBids} مزايدات!`,
          auction_id: auctionId,
          data: { hotReason: proof.hotReason ?? null },
        })
      }
    }
  } catch (e) {
    console.error('[notifySellerAuctionActivityOnNewBid]', e)
  }
}
