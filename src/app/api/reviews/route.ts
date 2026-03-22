import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('user_id')
  const auctionId = sp.get('auction_id')
  const reviewerId = sp.get('reviewer_id')

  if (auctionId && reviewerId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('auction_id', auctionId)
      .eq('reviewer_id', reviewerId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ exists: Boolean(data) })
  }

  if (!userId) {
    return NextResponse.json({ error: 'missing user_id' }, { status: 400 })
  }

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('reviewed_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reviews?.length) return NextResponse.json([])

  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))]
  const auctionIds = [...new Set(reviews.map((r) => r.auction_id).filter(Boolean))]

  const [{ data: profs }, { data: aucs }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', reviewerIds),
    auctionIds.length
      ? supabase.from('auctions').select('id, title').in('id', auctionIds as string[])
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ])

  const pMap = new Map((profs ?? []).map((p) => [p.id, p]))
  const aMap = new Map((aucs ?? []).map((a) => [a.id, a]))

  const list = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    reviewer_name:
      (pMap.get(r.reviewer_id)?.full_name &&
        String(pMap.get(r.reviewer_id)!.full_name).trim()) ||
      'مستخدم',
    auction_title: r.auction_id ? aMap.get(r.auction_id)?.title ?? 'مزاد' : 'مزاد',
  }))

  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { auction_id, reviewed_id, rating, comment, reviewer_id, user_id } = body

  if (!isValidUserId(user_id)) return unauthorized()
  if (!isValidUserId(reviewer_id) || reviewer_id !== user_id) {
    return NextResponse.json({ error: 'معرّف المراجع غير صالح' }, { status: 403 })
  }
  if (!auction_id || !reviewed_id) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  const r = Number(rating)
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: 'التقييم يجب أن يكون بين 1 و 5' }, { status: 400 })
  }
  const c = typeof comment === 'string' ? comment.trim().slice(0, 200) : ''

  const { data: auction, error: aErr } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auction_id)
    .maybeSingle()

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
  if (!auction) return NextResponse.json({ error: 'المزاد غير موجود' }, { status: 404 })
  if (auction.status !== 'ended') {
    return NextResponse.json({ error: 'يمكن التقييم بعد انتهاء المزاد فقط' }, { status: 400 })
  }
  if (auction.highest_bidder_id !== reviewer_id) {
    return NextResponse.json({ error: 'فقط الفائز بالمزاد يمكنه التقييم' }, { status: 403 })
  }
  if (auction.seller_id !== reviewed_id) {
    return NextResponse.json({ error: 'التقييم يجب أن يكون للبائع' }, { status: 400 })
  }

  const { data: dup } = await supabase
    .from('reviews')
    .select('id')
    .eq('auction_id', auction_id)
    .eq('reviewer_id', reviewer_id)
    .maybeSingle()
  if (dup) {
    return NextResponse.json({ error: 'تم التقييم مسبقاً لهذا المزاد' }, { status: 400 })
  }

  const { error: insErr } = await supabase.from('reviews').insert({
    auction_id,
    reviewer_id,
    reviewed_id,
    rating: r,
    comment: c || null,
  })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  const { data: allR } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewed_id', reviewed_id)

  const ratings = (allR ?? []).map((x) => Number(x.rating))
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

  await supabase
    .from('profiles')
    .update({
      rating: Math.round(avg * 10) / 10,
      total_reviews: ratings.length,
    })
    .eq('id', reviewed_id)

  return NextResponse.json({ success: true })
}
