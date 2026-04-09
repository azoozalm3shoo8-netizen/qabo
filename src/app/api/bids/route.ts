/**
 * مسار المزايدة الذي تستدعيه الواجهة (`LiveBidPanel` وغيرها).
 * المبالغ في الطلب بالريال؛ التخزين في `bids.amount` بالهللات.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'
import { recordSimpleBid } from '@/lib/services/bidding-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { auction_id, bidder_id, amount, user_id } = body

    if (!isValidUserId(user_id)) return unauthorized()
    if (!isValidUserId(bidder_id) || bidder_id !== user_id) {
      return NextResponse.json({ error: 'معرّف المزايد غير صالح' }, { status: 403 })
    }

    if (!auction_id) {
      return NextResponse.json({ error: 'معرّف المزاد مطلوب' }, { status: 400 })
    }

    const amtRiyals = Number(amount)
    if (!Number.isFinite(amtRiyals) || amtRiyals <= 0) {
      return NextResponse.json({ error: 'مبلغ المزايدة يجب أن يكون رقماً موجباً' }, { status: 400 })
    }

    /** الواجهة ترسل الريال؛ التخزين بالهللات */
    const amountHalalas = Math.round(amtRiyals * 100)

    const rlMin = checkRateLimit(`bid:${auction_id}:${bidder_id}`, 5000, 1)
    if (!rlMin.allowed) {
      return NextResponse.json(
        { error: 'يرجى الانتظار قبل مزايدة جديدة', retryAfter: rlMin.retryAfter },
        { status: 429 }
      )
    }

    const rlBurst = checkRateLimit(`bids-post-user:${bidder_id}`, 60_000, 10)
    if (!rlBurst.allowed) {
      return NextResponse.json(
        { error: 'عدد مزايدات كبير في دقيقة واحدة. انتظر قليلاً.', retryAfter: rlBurst.retryAfter },
        { status: 429 }
      )
    }

    const { data: auction } = await supabase.from('auctions').select('*').eq('id', auction_id).single()

    if (!auction) return NextResponse.json({ error: 'المزاد غير موجود' }, { status: 404 })
    if (auction.status !== 'active') {
      return NextResponse.json({ error: 'انتهى المزاد' }, { status: 400 })
    }
    if (new Date(auction.ends_at) < new Date()) {
      return NextResponse.json({ error: 'انتهى وقت المزاد' }, { status: 400 })
    }

    if (bidder_id === auction.seller_id) {
      return NextResponse.json({ error: 'لا يمكنك المزايدة على مزادك' }, { status: 400 })
    }

    const result = await recordSimpleBid(auction_id, bidder_id, amountHalalas)

    const { data: fresh } = await supabase.from('auctions').select('bid_count').eq('id', auction_id).maybeSingle()
    const bc = typeof fresh?.bid_count === 'number' ? fresh.bid_count : (auction.bid_count ?? 0) + 1

    return NextResponse.json({
      success: true,
      new_bid: amountHalalas,
      bid_count: bc,
      auctionExtended: result.auctionExtended,
      newEndsAt: result.newEndsAt,
      extensionCount: result.extensionCount,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل تسجيل المزايدة'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
