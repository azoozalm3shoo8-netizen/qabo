import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/admin-guard'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  const gate = await requirePermission(userId, 'dashboard')
  if (!gate.ok) return gate.res

  const supabase = createClient()

  const sod = new Date()
  sod.setUTCHours(0, 0, 0, 0)

  const [
    { count: total_auctions, error: e1 },
    { count: active_auctions, error: e2 },
    { count: ended_auctions, error: e3 },
    { count: total_users, error: e4 },
    { count: total_orders, error: e5 },
    { data: deliveredOrders, error: e6 },
    { data: recentAuctions, error: e7 },
    { count: pending_reports, error: e8 },
    { count: new_users_today, error: e9 },
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
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sod.toISOString()),
  ])

  if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9) {
    const err = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9
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

  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    d.setUTCHours(0, 0, 0, 0)
    labels.push(d.toISOString().slice(0, 10))
  }

  const start7 = new Date(labels[0] + 'T00:00:00.000Z')
  const { data: auc7 } = await supabase
    .from('auctions')
    .select('created_at')
    .gte('created_at', start7.toISOString())

  const dayCounts: Record<string, number> = {}
  for (const day of labels) dayCounts[day] = 0
  for (const row of auc7 ?? []) {
    const day = new Date(row.created_at as string).toISOString().slice(0, 10)
    if (day in dayCounts) dayCounts[day]++
  }
  const auctions_by_day = labels.map((date) => ({ date, count: dayCounts[date] ?? 0 }))

  const { data: ord7 } = await supabase
    .from('orders')
    .select('product_amount, created_at')
    .eq('status', 'delivered')
    .gte('created_at', start7.toISOString())

  const revByDay: Record<string, number> = {}
  for (const day of labels) revByDay[day] = 0
  for (const row of ord7 ?? []) {
    const day = new Date(row.created_at as string).toISOString().slice(0, 10)
    if (day in revByDay) revByDay[day] += Number((row as { product_amount: number }).product_amount ?? 0)
  }
  const revenue_by_day = labels.map((date) => ({ date, amount: Math.round((revByDay[date] ?? 0) * 100) / 100 }))

  const { count: users_active_today } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', sod.toISOString())

  let audit_preview: unknown[] = []
  try {
    const { data: aud } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    audit_preview = aud ?? []
  } catch {
    audit_preview = []
  }

  return NextResponse.json({
    total_auctions: total_auctions ?? 0,
    active_auctions: active_auctions ?? 0,
    ended_auctions: ended_auctions ?? 0,
    total_users: total_users ?? 0,
    total_orders: total_orders ?? 0,
    total_revenue,
    pending_reports: pending_reports ?? 0,
    new_users_today: new_users_today ?? 0,
    recent_auctions: recent_auctions_enriched,
    recent_reports,
    auctions_by_day,
    revenue_by_day,
    users_active_today: users_active_today ?? 0,
    audit_preview,
  })
}
