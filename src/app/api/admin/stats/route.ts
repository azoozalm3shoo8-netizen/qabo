import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminUserId } from '@/lib/admin-ids'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!isAdminUserId(userId)) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 403 })
  }

  const [
    { count: total_auctions, error: e1 },
    { count: active_auctions, error: e2 },
    { count: ended_auctions, error: e3 },
    { count: total_users, error: e4 },
    { count: total_orders, error: e5 },
    { data: deliveredOrders, error: e6 },
    { data: recentAuctions, error: e7 },
  ] = await Promise.all([
    supabase.from('auctions').select('*', { count: 'exact', head: true }),
    supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'ended'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('product_amount').eq('status', 'delivered'),
    supabase
      .from('auctions')
      .select('id, title, status, current_bid, created_at, seller_id')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (e1 || e2 || e3 || e4 || e5 || e6 || e7) {
    const err = e1 || e2 || e3 || e4 || e5 || e6 || e7
    return NextResponse.json({ error: err?.message || 'خطأ في الاستعلام' }, { status: 500 })
  }

  const total_revenue = (deliveredOrders ?? []).reduce(
    (s, r) => s + Number((r as { product_amount: number }).product_amount ?? 0),
    0
  )

  const sellerIds = [...new Set((recentAuctions ?? []).map((a) => a.seller_id as string))]
  const { data: sellers } = sellerIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', sellerIds)
    : { data: [] as { id: string; full_name: string | null }[] }

  const sMap = new Map((sellers ?? []).map((p) => [p.id, p]))

  const recent_auctions_enriched = (recentAuctions ?? []).map((a) => ({
    ...a,
    seller_name:
      (sMap.get(a.seller_id as string)?.full_name &&
        String(sMap.get(a.seller_id as string)!.full_name).trim()) ||
      '—',
  }))

  let recent_reports: unknown[] = []
  try {
    const { data: reps, error: rErr } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!rErr && reps?.length) {
      const rIds = [...new Set(reps.map((r) => r.reporter_id as string))]
      const aIds = [
        ...new Set(
          reps.map((r) => r.reported_auction_id as string | null).filter(Boolean) as string[]
        ),
      ]
      const [{ data: rp }, { data: ra }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', rIds),
        aIds.length ? supabase.from('auctions').select('id, title').in('id', aIds) : { data: [] },
      ])
      const rpMap = new Map((rp ?? []).map((p) => [p.id, p]))
      const raMap = new Map((ra ?? []).map((x) => [x.id, x]))
      recent_reports = reps.map((r) => ({
        ...r,
        reporter_name:
          (rpMap.get(r.reporter_id as string)?.full_name &&
            String(rpMap.get(r.reporter_id as string)!.full_name).trim()) ||
          '—',
        auction_title: r.reported_auction_id
          ? raMap.get(r.reported_auction_id as string)?.title ?? null
          : null,
      }))
    }
  } catch {
    recent_reports = []
  }

  return NextResponse.json({
    total_auctions: total_auctions ?? 0,
    active_auctions: active_auctions ?? 0,
    ended_auctions: ended_auctions ?? 0,
    total_users: total_users ?? 0,
    total_orders: total_orders ?? 0,
    total_revenue,
    recent_auctions: recent_auctions_enriched,
    recent_reports,
  })
}
