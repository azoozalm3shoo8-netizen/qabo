import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  const auctionId = req.nextUrl.searchParams.get('auction_id')
  if (!isValidUserId(userId) || !auctionId) {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('auto_bids')
    .select('max_amount, is_active')
    .eq('user_id', userId)
    .eq('auction_id', auctionId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const active = Boolean(data?.is_active)
  return NextResponse.json({
    has_autobid: active,
    max_amount: active && data?.max_amount != null ? Number(data.max_amount) : null,
  })
}

export async function POST(req: NextRequest) {
  let body: { user_id?: string; auction_id?: string; max_amount?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id, auction_id, max_amount } = body
  if (!isValidUserId(user_id)) return unauthorized()
  if (!auction_id) {
    return NextResponse.json({ error: 'معرّف المزاد مطلوب' }, { status: 400 })
  }

  const maxAmt = Number(max_amount)
  if (!Number.isFinite(maxAmt) || maxAmt <= 0) {
    return NextResponse.json({ error: 'الحد الأقصى غير صالح' }, { status: 400 })
  }

  const { data: auction, error: aErr } = await supabase.from('auctions').select('*').eq('id', auction_id).single()
  if (aErr || !auction) {
    return NextResponse.json({ error: 'المزاد غير موجود' }, { status: 404 })
  }
  if (auction.status !== 'active') {
    return NextResponse.json({ error: 'المزاد غير نشط' }, { status: 400 })
  }
  if (new Date(auction.ends_at as string) < new Date()) {
    return NextResponse.json({ error: 'انتهى المزاد' }, { status: 400 })
  }

  const minNext = Number(auction.current_bid) + Number(auction.bid_increment)
  if (maxAmt < minNext) {
    return NextResponse.json(
      { error: 'الحد الأقصى يجب أن يكون على الأقل ' + minNext.toLocaleString() + ' ر.س' },
      { status: 400 }
    )
  }

  if (user_id === auction.seller_id) {
    return NextResponse.json({ error: 'لا يمكن تفعيل المزايدة التلقائية على مزادك' }, { status: 400 })
  }

  const { error: upErr } = await supabase.from('auto_bids').upsert(
    {
      user_id,
      auction_id,
      max_amount: maxAmt,
      is_active: true,
    },
    { onConflict: 'user_id,auction_id' }
  )

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  let body: { user_id?: string; auction_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id, auction_id } = body
  if (!isValidUserId(user_id)) return unauthorized()
  if (!auction_id) {
    return NextResponse.json({ error: 'معرّف المزاد مطلوب' }, { status: 400 })
  }

  const { error } = await supabase
    .from('auto_bids')
    .update({ is_active: false })
    .eq('user_id', user_id)
    .eq('auction_id', auction_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
