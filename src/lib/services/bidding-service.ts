import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { createClient } from '@/lib/supabase-server'
import { createAuthorization, voidPayment } from '@/lib/moyasar-client'
import { createDeal } from '@/lib/services/deal-service'
import { onAuctionClosed, onBidPlaced } from '@/lib/services/platform-orchestrator'
import { notifySellerAuctionActivityOnNewBid } from '@/lib/services/smart-notification-service'
import type { BidRow } from '@/lib/types/financial-types'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

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

export async function placeBid(
  auctionId: string,
  bidderId: string,
  amount: number,
  cardToken: string,
  maxAutoBid?: number
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
    is_auto_bid: Boolean(maxAutoBid),
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
  const orch = await onBidPlaced(auctionId, bidderId, bidTime)

  const newTotalBids =
    typeof patch.bid_count === 'number'
      ? (patch.bid_count as number)
      : typeof auction.bid_count === 'number'
        ? auction.bid_count + 1
        : 1

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

  const prev = auction.highest_bidder_id as string | undefined

  const sellerId = auction.seller_id as string
  await insertFinancialNotification(supabase, {
    user_id: sellerId,
    type: 'new_bid',
    title: 'مزايدة جديدة',
    body: `مزايدة جديدة على: ${String(auction.title ?? '')}`,
    auction_id: auctionId,
  })

  if (prev && prev !== bidderId) {
    await insertFinancialNotification(supabase, {
      user_id: prev,
      type: 'outbid',
      title: 'تم تجاوز مزايدتك',
      body: `تم تجاوز مزايدتك في المزاد: ${String(auction.title ?? '')}`,
      auction_id: auctionId,
    })
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

  const { data: deal } = await createDeal(auctionId, winnerId, top.id as string)

  await supabase
    .from('auctions')
    .update({
      status: 'sold',
      winner_id: winnerId,
      winning_bid_id: top.id,
      highest_bidder_id: winnerId,
    })
    .eq('id', auctionId)

  await insertFinancialNotification(supabase, {
    user_id: winnerId,
    type: 'auction_won',
    title: 'مبروك! لديك 48 ساعة لإتمام الدفع',
    body: `فزت بالمزاد: ${String(auction.title ?? '')}. أكمل الدفع من صفحة الصفقات.`,
    auction_id: auctionId,
    deal_id: deal.id,
  })
  await insertFinancialNotification(supabase, {
    user_id: auction.seller_id as string,
    type: 'auction_sold',
    title: 'تم بيع منتجك!',
    body: `تم بيع مزادك: ${String(auction.title ?? '')}`,
    auction_id: auctionId,
    deal_id: deal.id,
  })

  await onAuctionClosed(auctionId, {
    winnerId,
    salePriceHalalas: winningHalalas,
    category: String(auction.category ?? ''),
  })
}
