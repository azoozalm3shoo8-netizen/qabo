import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePostAuctionReport } from '@/lib/services/post-auction-analytics-service'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: auctionId } = await context.params
  const userId = req.nextUrl.searchParams.get('user_id')

  if (!auctionId) {
    return NextResponse.json({ error: 'معرّف المزاد مطلوب' }, { status: 400 })
  }
  if (!isValidUserId(userId)) return unauthorized()

  try {
    const { data: auction, error: aErr } = await supabase
      .from('auctions')
      .select('seller_id')
      .eq('id', auctionId)
      .maybeSingle()

    if (aErr || !auction) {
      return NextResponse.json({ error: 'المزاد غير موجود' }, { status: 404 })
    }
    if (auction.seller_id !== userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { data: row } = await supabase
      .from('post_auction_reports')
      .select('report')
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (row?.report) {
      return NextResponse.json(row.report, {
        headers: { 'Cache-Control': 'private, max-age=60' },
      })
    }

    const live = await generatePostAuctionReport(auctionId)
    if (!live) {
      return NextResponse.json({ error: 'تعذر إنشاء التقرير' }, { status: 404 })
    }
    return NextResponse.json(live, {
      headers: { 'Cache-Control': 'private, max-age=60' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
