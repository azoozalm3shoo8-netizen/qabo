import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/admin-guard'

export async function GET(req: NextRequest) {
  const actorId = req.nextUrl.searchParams.get('user_id')
  const gate = await requirePermission(actorId, 'finance_view')
  if (!gate.ok) return gate.res

  const sp = req.nextUrl.searchParams
  const statusFilter = (sp.get('status') || 'all').toLowerCase()
  const dateFrom = sp.get('date_from')
  const dateTo = sp.get('date_to')

  const supabase = createClient()

  const [{ count: deliveredCount }, { data: delivered }, { count: auctionCount }, { data: txs }] =
    await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabase.from('orders').select('product_amount').eq('status', 'delivered'),
      supabase.from('auctions').select('*', { count: 'exact', head: true }),
      supabase
        .from('wallet_transactions')
        .select('id, user_id, amount, type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

  const total_revenue = (delivered ?? []).reduce(
    (s, r) => s + Number((r as { product_amount: number }).product_amount ?? 0),
    0
  )
  const completed = deliveredCount ?? 0
  const avgAuction =
    (auctionCount ?? 0) > 0 ? total_revenue / Number(auctionCount) : 0

  let ordersQuery = supabase
    .from('orders')
    .select('id, buyer_id, seller_id, status, product_amount, created_at, auction_id')
    .order('created_at', { ascending: false })
    .limit(80)

  if (statusFilter === 'delivered') ordersQuery = ordersQuery.eq('status', 'delivered')
  else if (statusFilter === 'pending') ordersQuery = ordersQuery.neq('status', 'delivered')

  if (dateFrom) ordersQuery = ordersQuery.gte('created_at', dateFrom)
  if (dateTo) ordersQuery = ordersQuery.lte('created_at', dateTo)

  const { data: recentOrders } = await ordersQuery

  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    d.setUTCHours(0, 0, 0, 0)
    labels.push(d.toISOString().slice(0, 10))
  }
  const start7 = new Date(labels[0] + 'T00:00:00.000Z')
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
  const revenue_by_day = labels.map((date) => ({
    date,
    amount: Math.round((revByDay[date] ?? 0) * 100) / 100,
  }))

  const commission_estimate = Math.round(total_revenue * 0.05 * 100) / 100

  return NextResponse.json({
    total_revenue,
    completed_transactions: completed,
    avg_auction_value: Math.round(avgAuction * 100) / 100,
    total_commissions_estimate: commission_estimate,
    recent_wallet_transactions: txs ?? [],
    recent_orders: recentOrders ?? [],
    revenue_by_day,
  })
}
