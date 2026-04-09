/**
 * مزايدة مع تفويض ضمان عبر Moyasar وبطاقة محفوظة.
 *
 * @deprecated للواجهة الحالية: المزايدة السريعة تمر عبر `POST /api/bids` (بدون بطاقة في نفس الطلب).
 * احتفظ بهذا المسار لتطبيقات تتطلب ضمان Moyasar حتى يتم دمج المسارين في واجهة واحدة.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { placeBid } from '@/lib/services/bidding-service'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const postSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int().positive(),
  card_token: z.string().min(1),
  max_auto_bid: z.number().int().positive().optional(),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: auctionId } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  if (!isValidUserId(parsed.data.user_id)) return unauthorized()

  const rl = checkRateLimit(`bid:${auctionId}:${parsed.data.user_id}`, 5000, 1)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'يرجى الانتظار', retryAfter: rl.retryAfter }, { status: 429 })
  }

  try {
    const r = await placeBid(
      auctionId,
      parsed.data.user_id,
      parsed.data.amount,
      parsed.data.card_token,
      parsed.data.max_auto_bid
    )
    return NextResponse.json({
      bid: r.bid,
      guaranteeStatus: r.guaranteePaymentId,
      auctionExtended: r.auctionExtended,
      newEndsAt: r.newEndsAt,
      extensionCount: r.extensionCount,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل المزايدة'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const uid = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(uid)) return unauthorized()
  const { id: auctionId } = await context.params
  const supabase = createClient()

  const { data: auction } = await supabase.from('auctions').select('seller_id').eq('id', auctionId).maybeSingle()
  if (!auction) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  let q = supabase.from('bids').select('*').eq('auction_id', auctionId).order('amount', { ascending: false })
  if (auction.seller_id !== uid) {
    q = q.eq('bidder_id', uid)
  }
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
