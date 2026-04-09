import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { closeExpiredAuctions } from '@/lib/server/close-expired-auctions'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'
import { isFreePeriodActive } from '@/lib/services/free-period-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_DURATIONS = new Set([1, 3, 6, 12, 24, 48, 72, 120, 168])

export async function GET(req: NextRequest) {
  await closeExpiredAuctions(supabase)

  const sp = req.nextUrl.searchParams
  const seller_id = sp.get('seller_id')
  const participant_id = sp.get('participant_id')
  const q = sp.get('q')
  const city = sp.get('city')
  const category = sp.get('category')
  const status = sp.get('status')

  let query = supabase.from('auctions').select('*')

  if (seller_id) query = query.eq('seller_id', seller_id)

  if (participant_id) {
    const { data: bidRows, error: bErr } = await supabase
      .from('bids')
      .select('auction_id')
      .eq('bidder_id', participant_id)
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })
    const ids = [...new Set((bidRows ?? []).map((b) => b.auction_id))]
    if (ids.length === 0) return NextResponse.json([])
    query = query.in('id', ids)
  }

  if (q?.trim()) {
    const safe = q.trim().replace(/[%_]/g, '')
    if (safe) query = query.ilike('title', `%${safe}%`)
  }
  if (city) query = query.eq('city', city)
  if (category) query = query.eq('category', category)

  if (status) query = query.eq('status', status)
  else if (!seller_id && !participant_id) query = query.eq('status', 'active')

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    user_id,
    seller_id,
    id: clientId,
    title: rawTitle,
    description: rawDescription,
    category,
    condition,
    city,
    start_price,
    buy_now_price,
    bid_increment,
    duration_hours,
    images: rawImages,
    delivery_method: rawDelivery,
    ai_description_accepted: rawAiAccepted,
  } = body

  if (!isValidUserId(user_id)) return unauthorized()
  if (!isValidUserId(seller_id) || seller_id !== user_id) {
    return NextResponse.json({ error: 'معرّف البائع غير صالح' }, { status: 403 })
  }

  const createRl = checkRateLimit(`auction-create:${seller_id}`, 3_600_000, 3)
  if (!createRl.allowed) {
    return NextResponse.json(
      { error: 'تجاوزت حد إنشاء المزادات في الساعة. حاول لاحقاً.', retryAfter: createRl.retryAfter },
      { status: 429 }
    )
  }

  const title = typeof rawTitle === 'string' ? rawTitle.trim().slice(0, 100) : ''
  if (!title) {
    return NextResponse.json({ error: 'عنوان المزاد مطلوب (حتى 100 حرف)' }, { status: 400 })
  }

  const description =
    typeof rawDescription === 'string' ? rawDescription.trim().slice(0, 2000) : ''

  if (!category || typeof category !== 'string') {
    return NextResponse.json({ error: 'التصنيف مطلوب' }, { status: 400 })
  }

  const price = Number(start_price)
  if (!Number.isFinite(price) || price <= 0 || price >= 10_000_000) {
    return NextResponse.json(
      { error: 'سعر البداية يجب أن يكون أكبر من صفر وأقل من 10,000,000 ر.س' },
      { status: 400 }
    )
  }

  const dh = Number(duration_hours)
  if (!ALLOWED_DURATIONS.has(dh)) {
    return NextResponse.json(
      { error: 'مدة المزاد غير مسموحة. اختر مدة صالحة من القائمة' },
      { status: 400 }
    )
  }

  const images = Array.isArray(rawImages)
    ? rawImages.filter((x: unknown) => typeof x === 'string' && x.length > 0).slice(0, 10)
    : []
  if (images.length < 1) {
    return NextResponse.json({ error: 'يجب رفع صورة واحدة على الأقل' }, { status: 400 })
  }

  const inc = Number(bid_increment)
  const increment = Number.isFinite(inc) && inc > 0 ? inc : 100

  const ends_at = new Date(Date.now() + dh * 60 * 60 * 1000).toISOString()

  const cityNorm =
    typeof city === 'string' && city.trim() ? city.trim().slice(0, 80) : 'الرياض'
  const dm =
    typeof rawDelivery === 'string' && rawDelivery.trim()
      ? rawDelivery.trim().slice(0, 40)
      : 'flexible'

  const row: Record<string, unknown> = {
    seller_id,
    title,
    description,
    category,
    condition: condition || 'new',
    city: cityNorm,
    start_price: price,
    current_bid: price,
    buy_now_price:
      buy_now_price != null && buy_now_price !== ''
        ? Number(buy_now_price)
        : null,
    bid_increment: increment,
    min_increment: increment,
    ends_at,
    images,
    delivery_method: dm,
    ai_description_accepted: Boolean(rawAiAccepted),
  }

  if (isValidUserId(clientId)) {
    row.id = clientId.trim()
  }

  const freePeriod = await isFreePeriodActive()
  const { count: prevListings } = await supabase
    .from('auctions')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', seller_id)

  if (freePeriod) {
    row.reserve_fee_halalas = 0
    row.relisting_fee_halalas = 0
    row.platform_metadata = {
      listing_fees_waived: true,
      free_period: true,
    }
  }
  row.listing_count = (prevListings ?? 0) + 1

  const { data, error } = await supabase.from('auctions').insert(row).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
