import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  checkAndExtendAuction,
  notifyBiddersAuctionExtended,
} from '@/lib/services/anti-snipe-service'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'
import { awardXP } from '@/lib/services/buyer-gamification-service'
import { notifySellerAuctionActivityOnNewBid } from '@/lib/services/smart-notification-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { auction_id, bidder_id, amount, user_id } = body

  if (!isValidUserId(user_id)) return unauthorized()
  if (!isValidUserId(bidder_id) || bidder_id !== user_id) {
    return NextResponse.json({ error: 'معرّف المزايد غير صالح' }, { status: 403 })
  }

  if (!auction_id) {
    return NextResponse.json({ error: 'معرّف المزاد مطلوب' }, { status: 400 })
  }

  const amt = Number(amount)
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: 'مبلغ المزايدة يجب أن يكون رقماً موجباً' }, { status: 400 })
  }

  const rl = checkRateLimit(`bid:${auction_id}:${bidder_id}`, 5000, 1)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'يرجى الانتظار قبل مزايدة جديدة', retryAfter: rl.retryAfter },
      { status: 429 }
    )
  }

  const { data: auction } = await supabase.from('auctions').select('*').eq('id', auction_id).single()

  if (!auction) return NextResponse.json({ error: 'auction not found' }, { status: 404 })
  if (auction.status !== 'active') return NextResponse.json({ error: 'auction ended' }, { status: 400 })
  if (new Date(auction.ends_at) < new Date()) {
    return NextResponse.json({ error: 'auction expired' }, { status: 400 })
  }

  const current = Number(auction.current_bid)
  const maxBid = current * 10
  if (amt > maxBid) {
    return NextResponse.json(
      { error: 'المزايدة تتجاوز الحد المسموح (10× السعر الحالي)' },
      { status: 400 }
    )
  }

  if (amt < auction.current_bid + auction.bid_increment) {
    return NextResponse.json(
      { error: 'bid too low, minimum: ' + (auction.current_bid + auction.bid_increment) },
      { status: 400 }
    )
  }
  if (bidder_id === auction.seller_id) {
    return NextResponse.json({ error: 'cannot bid on own auction' }, { status: 400 })
  }

  const prevHighest = auction.highest_bidder_id as string | null
  const title = (auction.title as string) || 'مزاد'

  const { error: bidError } = await supabase.from('bids').insert({ auction_id, listing_id: auction_id, bidder_id, amount: amt })
  if (bidError) return NextResponse.json({ error: bidError.message }, { status: 500 })

  const newBidCount = Number(auction.bid_count ?? 0) + 1

  const { error: updateError } = await supabase
    .from('auctions')
    .update({
      current_bid: amt,
      highest_bidder_id: bidder_id,
      bid_count: newBidCount,
    })
    .eq('id', auction_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const bidTime = new Date()
  const snipe = await checkAndExtendAuction(auction_id, bidTime)
  if (snipe.extended) {
    await notifyBiddersAuctionExtended(supabase, auction_id)
  }

  await notifySellerAuctionActivityOnNewBid({
    auctionId: auction_id,
    sellerId: auction.seller_id as string,
    title,
    newTotalBids: newBidCount,
  })

  const notifs: {
    user_id: string
    type: string
    title: string
    message: string
    auction_id: string
  }[] = [
    {
      user_id: auction.seller_id,
      type: 'new_bid',
      title: 'مزايدة جديدة',
      message: `مزايدة جديدة بمبلغ ${Number(amt).toLocaleString()} ر.س على: ${title}`,
      auction_id,
    },
  ]

  if (prevHighest && prevHighest !== bidder_id) {
    notifs.push({
      user_id: prevHighest,
      type: 'outbid',
      title: 'تم تجاوز مزايدتك',
      message: `تم تجاوز مزايدتك في المزاد: ${title}`,
      auction_id,
    })
  }

  const { error: nErr } = await supabase.from('notifications').insert(notifs)
  if (nErr) console.error('notifications insert:', nErr.message)

  try {
    await awardXP(bidder_id, 'bid')
  } catch (e) {
    console.error('[bids POST gamification]', e)
  }

  return NextResponse.json({
    success: true,
    new_bid: amt,
    bid_count: newBidCount,
    auctionExtended: snipe.extended,
    newEndsAt: snipe.newEndTime?.toISOString(),
    extensionCount: snipe.extensionCount,
  })
}
