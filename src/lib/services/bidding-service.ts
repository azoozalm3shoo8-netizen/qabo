/**
 * إشعارات المزايدة (تجاوز / إغلاق مزاد / فوز) تُرسل من `platform-orchestrator` + `notification-service`.
 * إشعارات مالية (ضمان، مزايدة تلقائية، إلخ) تبقى عبر `insertFinancialNotification` حيث يلزم.
 */
import { broadcastAuctionPayload } from '@/lib/server/auction-realtime-broadcast'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { createClient } from '@/lib/supabase-server'
import { createAuthorization, voidPayment } from '@/lib/moyasar-client'
import { createDeal } from '@/lib/services/deal-service'
import { onAuctionClosed, onBidPlaced } from '@/lib/services/platform-orchestrator'
import { notifySellerAuctionActivityOnNewBid } from '@/lib/services/smart-notification-service'
import type { BidRow } from '@/lib/types/financial-types'
import { formatSAR } from '@/lib/utils/currency'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export type PlaceBidOptions = {
  /** مزايدة نيابية من محرك المزايدة التلقائية — لا يُعاد تشغيل السلسلة داخلياً */
  fromAutoBidEngine?: boolean
  skipAutoBidChain?: boolean
}

/** السعر الحالي بالهللات — يدعم current_price (هللات) أو current_bid (ريال كعدد صحيح) */
export function auctionCurrentHalalas(auction: Record<string, unknown>): number {
  if (auction.current_price != null && auction.current_price !== '') {
    return Math.round(Number(auction.current_price))
  }
  const cb = Number(auction.current_bid ?? auction.start_price ?? 0)
  return Math.round(cb * 100)
}

function minBidStepHalalas(auction: Record<string, unknown>): number {
  const inc = Number(auction.min_increment ?? auction.bid_increment ?? 1)
  if (auction.current_price != null && auction.current_price !== '') {
    return Math.max(1, Math.round(inc))
  }
  return Math.max(100, Math.round(inc * 100))
}

/**
 * max_amount في auto_bids يُخزَّن تاريخياً بالريال (مثل واجهة autobid).
 * إذا كان الرقم كبيراً جداً نفترض أنه بالهللات مسبقاً.
 */
function autoBidMaxToHalalas(stored: number): number {
  if (!Number.isFinite(stored) || stored <= 0) return 0
  if (stored >= 50_000_000) return Math.round(stored)
  return Math.round(stored * 100)
}

function anonymizeBidderForBroadcast(userId: string): string {
  const c = userId.replace(/-/g, '')
  if (c.length < 4) return 'مزايد'
  return `م***${c.slice(-2)}`
}

/**
 * سلسلة مزايدات تلقائية بعد مزايدة بشرية أو خطوة سابقة في السلسلة.
 */
async function processAutoBidChain(auctionId: string): Promise<void> {
  const maxRounds = 14
  for (let round = 0; round < maxRounds; round++) {
    const supabase = createClient()
    let auction: Record<string, unknown> | null = null
    try {
      const { data, error } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
      if (error || !data) return
      auction = data as Record<string, unknown>
    } catch {
      return
    }
    if (String(auction.status) !== 'active') return
    if (new Date(String(auction.ends_at)) <= new Date()) return

    const currentH = auctionCurrentHalalas(auction)
    const step = minBidStepHalalas(auction)
    const highestId = (auction.highest_bidder_id as string | null) ?? null

    let autoRows: { user_id: string; max_amount: number | string }[] = []
    try {
      const { data, error } = await supabase
        .from('auto_bids')
        .select('user_id, max_amount')
        .eq('auction_id', auctionId)
        .eq('is_active', true)
      if (error || !data?.length) return
      autoRows = data as { user_id: string; max_amount: number | string }[]
    } catch {
      return
    }

    const candidates = autoRows
      .map((row) => ({
        user_id: String(row.user_id),
        maxHalalas: autoBidMaxToHalalas(Number(row.max_amount)),
      }))
      .filter(
        (r) =>
          r.user_id !== String(auction!.seller_id) &&
          r.maxHalalas >= currentH + step &&
          r.user_id !== highestId
      )
      .sort((a, b) => b.maxHalalas - a.maxHalalas)

    if (!candidates.length) return

    const top = candidates[0]
    const second = candidates[1]

    let newAmt: number
    if (second) {
      newAmt = Math.max(currentH + step, Math.min(second.maxHalalas + step, top.maxHalalas))
    } else {
      newAmt = Math.min(currentH + step, top.maxHalalas)
    }

    if (newAmt > top.maxHalalas) newAmt = top.maxHalalas
    if (newAmt <= currentH) return

    let token: string | null = null
    try {
      const { data: card } = await supabase
        .from('saved_cards')
        .select('moyasar_token')
        .eq('user_id', top.user_id)
        .eq('is_verified', true)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle()
      token = (card?.moyasar_token as string | null) ?? null
    } catch {
      token = null
    }

    if (!token) {
      try {
        await supabase
          .from('auto_bids')
          .update({ is_active: false })
          .eq('auction_id', auctionId)
          .eq('user_id', top.user_id)
      } catch {
        /* ignore */
      }
      continue
    }

    try {
      await placeBid(auctionId, top.user_id, newAmt, token, undefined, { fromAutoBidEngine: true })
    } catch (e) {
      console.error('[processAutoBidChain placeBid]', e)
      return
    }

    try {
      if (newAmt >= top.maxHalalas) {
        await supabase
          .from('auto_bids')
          .update({ is_active: false })
          .eq('auction_id', auctionId)
          .eq('user_id', top.user_id)
      }
    } catch {
      /* ignore */
    }

    try {
      await insertFinancialNotification(supabase, {
        user_id: top.user_id,
        type: 'auto_bid_executed',
        title: 'تمت مزايدة تلقائية',
        body: `تمت المزايدة نيابةً عنك بمبلغ ${formatSAR(newAmt, true)}`,
        auction_id: auctionId,
      })
    } catch {
      /* ignore */
    }
  }
}

/**
 * تسجيل مزايدة بدون ضمان Moyasar (مسار الواجهة القديم /api/bids).
 * amountHalalas بالهللات؛ يُحدّث المزاد ويُشغّل المزايدة التلقائية.
 */
export async function recordSimpleBid(
  auctionId: string,
  bidderId: string,
  amountHalalas: number
): Promise<{
  bid: BidRow
  auctionExtended?: boolean
  newEndsAt?: string
  extensionCount?: number
}> {
  const supabase = createClient()

  const { data: auction, error: aErr } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
  if (aErr || !auction) throw new Error('المزاد غير موجود')
  if (auction.seller_id === bidderId) throw new Error('لا يمكنك المزايدة على مزادك')
  if (auction.status !== 'active') throw new Error('المزاد غير نشط')
  if (new Date(String(auction.ends_at)) <= new Date()) throw new Error('انتهى المزاد')

  const currentH = auctionCurrentHalalas(auction as Record<string, unknown>)
  const step = minBidStepHalalas(auction as Record<string, unknown>)
  if (amountHalalas <= currentH || amountHalalas < currentH + step) {
    throw new Error(`المزايدة أقل من الحد الأدنى (${currentH + step} هللة)`)
  }

  const maxBidHalalas = currentH * 10
  if (amountHalalas > maxBidHalalas) {
    throw new Error('المزايدة تتجاوز الحد المسموح (10× السعر الحالي)')
  }

  const bidRow: Record<string, unknown> = {
    auction_id: auctionId,
    listing_id: auctionId,
    bidder_id: bidderId,
    amount: amountHalalas,
    is_winning: true,
    is_auto_bid: false,
  }

  const { data: bid, error: bErr } = await supabase.from('bids').insert(bidRow).select().single()
  if (bErr) {
    console.error('[recordSimpleBid insert]', bErr.message)
    throw new Error(bErr.message)
  }

  await supabase.from('bids').update({ is_winning: false }).eq('auction_id', auctionId).neq('id', bid.id)

  const patch: Record<string, unknown> = {
    current_bid: Math.round(amountHalalas / 100),
    highest_bidder_id: bidderId,
  }
  if (typeof auction.bid_count === 'number') patch.bid_count = auction.bid_count + 1
  if (typeof auction.total_bids === 'number') patch.total_bids = auction.total_bids + 1

  await supabase.from('auctions').update(patch).eq('id', auctionId)

  const bidTime = new Date()
  const titleRs = String(auction.title ?? 'مزاد')
  const prevHighRs = auction.highest_bidder_id as string | undefined
  const orch = await onBidPlaced(auctionId, bidderId, bidTime, {
    previousHighBidderId: prevHighRs,
    auctionTitle: titleRs,
  })

  const newTotalBids =
    typeof patch.bid_count === 'number'
      ? (patch.bid_count as number)
      : typeof auction.bid_count === 'number'
        ? auction.bid_count + 1
        : 1

  const currentBidRiyals = Math.round(amountHalalas / 100)
  void broadcastAuctionPayload(auctionId, 'new_bid', {
    auction_id: auctionId,
    current_bid_riyals: currentBidRiyals,
    bid_amount_halalas: amountHalalas,
    bidder_display: anonymizeBidderForBroadcast(bidderId),
    bid_count: newTotalBids,
    is_auto_bid: false,
    timestamp: new Date().toISOString(),
  })

  await notifySellerAuctionActivityOnNewBid({
    auctionId,
    sellerId: auction.seller_id as string,
    title: String(auction.title ?? 'مزاد'),
    newTotalBids,
  })

  const sellerId = auction.seller_id as string
  await insertFinancialNotification(supabase, {
    user_id: sellerId,
    type: 'new_bid',
    title: 'مزايدة جديدة',
    body: `مزايدة جديدة على: ${String(auction.title ?? '')}`,
    auction_id: auctionId,
  })

  try {
    await processAutoBidChain(auctionId)
  } catch (e) {
    console.error('[recordSimpleBid processAutoBidChain]', e)
  }

  return {
    bid: bid as BidRow,
    auctionExtended: orch.extended,
    newEndsAt: orch.newEndTime,
    extensionCount: orch.extensionCount,
  }
}

export async function placeBid(
  auctionId: string,
  bidderId: string,
  amount: number,
  cardToken: string,
  maxAutoBid?: number,
  options?: PlaceBidOptions
): Promise<{
  bid: BidRow
  guaranteePaymentId: string
  auctionExtended?: boolean
  newEndsAt?: string
  extensionCount?: number
}> {
  const supabase = createClient()

  const { data: verified } = await supabase
    .from('saved_cards')
    .select('id')
    .eq('user_id', bidderId)
    .eq('moyasar_token', cardToken)
    .eq('is_verified', true)
    .maybeSingle()
  if (!verified) {
    throw new Error('يجب تسجيل بطاقة متحققة قبل المزايدة')
  }

  const { data: auction, error: aErr } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
  if (aErr || !auction) throw new Error('المزاد غير موجود')
  if (auction.seller_id === bidderId) throw new Error('لا يمكنك المزايدة على مزادك')
  if (auction.status !== 'active') throw new Error('المزاد غير نشط')
  if (new Date(String(auction.ends_at)) <= new Date()) throw new Error('انتهى المزاد')

  const currentH = auctionCurrentHalalas(auction as Record<string, unknown>)
  const step = minBidStepHalalas(auction as Record<string, unknown>)
  if (amount <= currentH || amount < currentH + step) {
    throw new Error(`المزايدة أقل من الحد الأدنى (${currentH + step} هللة)`)
  }

  const { data: prevBids } = await supabase
    .from('bids')
    .select('id, guarantee_payment_id, guarantee_status')
    .eq('auction_id', auctionId)
    .eq('bidder_id', bidderId)

  for (const pb of prevBids ?? []) {
    const pid = pb.guarantee_payment_id as string | null | undefined
    if (pid && pb.guarantee_status === 'authorized') {
      try {
        await voidPayment(pid)
      } catch (e) {
        console.error('[placeBid void old guarantee]', e)
      }
    }
  }

  const guarantee = Math.max(1, Math.round(amount * 0.1))
  let payment
  try {
    payment = await createAuthorization({
      amount: guarantee,
      token: cardToken,
      description: `ضمان مزايدة — مزاد ${auctionId.slice(0, 8)}`,
      callbackUrl: `${APP_URL()}/api/payment/callback?auction_id=${auctionId}`,
      metadata: {
        auction_id: auctionId,
        bidder_id: bidderId,
        type: 'bid_guarantee',
      },
      idempotencyId: `${auctionId}-${bidderId}-${amount}-${Date.now()}`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل تفويض الضمان'
    throw new Error(msg)
  }

  const gStatus =
    payment.status === 'authorized' || payment.status === 'paid' || payment.status === 'initiated'
      ? 'authorized'
      : 'pending'

  const bidRow: Record<string, unknown> = {
    auction_id: auctionId,
    listing_id: auctionId,
    bidder_id: bidderId,
    amount,
    guarantee_amount: guarantee,
    guarantee_payment_id: payment.id,
    guarantee_status: gStatus,
    is_winning: true,
    is_auto_bid: Boolean(options?.fromAutoBidEngine || maxAutoBid),
    max_auto_bid: maxAutoBid ?? null,
  }

  const { data: bid, error: bErr } = await supabase.from('bids').insert(bidRow).select().single()
  if (bErr) {
    console.error('[placeBid insert]', bErr.message)
    throw new Error(bErr.message)
  }

  await supabase.from('bids').update({ is_winning: false }).eq('auction_id', auctionId).neq('id', bid.id)

  const patch: Record<string, unknown> = {
    current_bid: Math.round(amount / 100),
    highest_bidder_id: bidderId,
  }
  if (typeof auction.bid_count === 'number') patch.bid_count = auction.bid_count + 1
  if (typeof auction.total_bids === 'number') patch.total_bids = auction.total_bids + 1

  await supabase.from('auctions').update(patch).eq('id', auctionId)

  const bidTime = new Date()
  const titlePb = String(auction.title ?? 'مزاد')
  const prevHighPb = auction.highest_bidder_id as string | undefined
  const orch = await onBidPlaced(auctionId, bidderId, bidTime, {
    previousHighBidderId: prevHighPb,
    auctionTitle: titlePb,
  })

  const newTotalBids =
    typeof patch.bid_count === 'number'
      ? (patch.bid_count as number)
      : typeof auction.bid_count === 'number'
        ? auction.bid_count + 1
        : 1

  const currentBidRiyals = Math.round(amount / 100)

  void broadcastAuctionPayload(auctionId, 'new_bid', {
    auction_id: auctionId,
    current_bid_riyals: currentBidRiyals,
    bid_amount_halalas: amount,
    bidder_display: anonymizeBidderForBroadcast(bidderId),
    bid_count: newTotalBids,
    is_auto_bid: Boolean(options?.fromAutoBidEngine),
    timestamp: new Date().toISOString(),
  })

  await notifySellerAuctionActivityOnNewBid({
    auctionId,
    sellerId: auction.seller_id as string,
    title: String(auction.title ?? 'مزاد'),
    newTotalBids,
  })

  await supabase.from('financial_transactions').insert({
    user_id: bidderId,
    auction_id: auctionId,
    type: 'bid_guarantee',
    moyasar_payment_id: payment.id,
    amount: guarantee,
    status: gStatus === 'authorized' ? 'authorized' : 'initiated',
    description: 'ضمان جدية مزايدة',
    metadata: { auction_id: auctionId },
  })

  const sellerId = auction.seller_id as string
  await insertFinancialNotification(supabase, {
    user_id: sellerId,
    type: 'new_bid',
    title: 'مزايدة جديدة',
    body: `مزايدة جديدة على: ${String(auction.title ?? '')}`,
    auction_id: auctionId,
  })

  if (!options?.fromAutoBidEngine && !options?.skipAutoBidChain) {
    try {
      await processAutoBidChain(auctionId)
    } catch (e) {
      console.error('[placeBid processAutoBidChain]', e)
    }
  }

  return {
    bid: bid as BidRow,
    guaranteePaymentId: payment.id,
    auctionExtended: orch.extended,
    newEndsAt: orch.newEndTime,
    extensionCount: orch.extensionCount,
  }
}

export async function releaseLosingBidGuarantees(auctionId: string, winnerId: string): Promise<void> {
  const supabase = createClient()
  const { data: rows } = await supabase
    .from('bids')
    .select('guarantee_payment_id, guarantee_status, bidder_id')
    .eq('auction_id', auctionId)

  for (const r of rows ?? []) {
    if (winnerId && r.bidder_id === winnerId) continue
    const pid = r.guarantee_payment_id as string | null | undefined
    if (!pid || r.guarantee_status !== 'authorized') continue
    try {
      await voidPayment(pid)
      await supabase.from('bids').update({ guarantee_status: 'voided' }).eq('guarantee_payment_id', pid)
    } catch (e) {
      console.error('[releaseLosingBidGuarantees]', pid, e)
    }
  }
}

export async function handleAuctionEnd(auctionId: string): Promise<void> {
  const supabase = createClient()
  const { data: auction, error } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
  if (error || !auction) return

  const terminal = ['sold', 'cancelled', 'expired', 'failed']
  if (terminal.includes(String(auction.status))) return

  const ended =
    String(auction.status) === 'ended' || new Date(String(auction.ends_at)) <= new Date()
  if (!ended) return

  if (String(auction.status) === 'active') {
    await supabase.from('auctions').update({ status: 'ended' }).eq('id', auctionId)
  }

  const { data: dealExists } = await supabase.from('deals').select('id').eq('auction_id', auctionId).maybeSingle()
  if (dealExists) return

  const { data: bids } = await supabase
    .from('bids')
    .select('*')
    .eq('auction_id', auctionId)
    .order('amount', { ascending: false })

  const top = bids?.[0]
  const auctionType = String(auction.auction_type ?? 'open')
  const reserve = auction.reserve_price != null ? Math.round(Number(auction.reserve_price)) : null
  const winningHalalas = top ? Math.round(Number(top.amount)) : 0

  if (!top) {
    await supabase.from('auctions').update({ status: 'expired' }).eq('id', auctionId)
    await onAuctionClosed(auctionId)
    return
  }

  if (auctionType === 'reserve' && reserve != null && winningHalalas < reserve) {
    await releaseLosingBidGuarantees(auctionId, '')
    await supabase.from('auctions').update({ status: 'cancelled', winner_id: null, winning_bid_id: null }).eq('id', auctionId)
    await onAuctionClosed(auctionId)
    return
  }

  const winnerId = top.bidder_id as string
  await releaseLosingBidGuarantees(auctionId, winnerId)

  const { data: dealRow } = await createDeal(auctionId, winnerId, top.id as string)

  await supabase
    .from('auctions')
    .update({
      status: 'sold',
      winner_id: winnerId,
      winning_bid_id: top.id,
      highest_bidder_id: winnerId,
    })
    .eq('id', auctionId)

  const loserIds = [...new Set((bids ?? []).map((b) => String(b.bidder_id)).filter(Boolean))].filter(
    (id) => id !== winnerId
  )

  await onAuctionClosed(auctionId, {
    winnerId,
    sellerId: sellerIdStr,
    auctionTitle: auctionTitleStr,
    loserIds,
    salePriceHalalas: winningHalalas,
    category: String(auction.category ?? ''),
  })
}
