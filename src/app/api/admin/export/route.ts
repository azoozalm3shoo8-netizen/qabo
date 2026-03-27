import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/admin-guard'

function csvEscape(s: string) {
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(req: NextRequest) {
  const actorId = req.nextUrl.searchParams.get('user_id')
  const gate = await requirePermission(actorId, 'export_data')
  if (!gate.ok) return gate.res

  const type = (req.nextUrl.searchParams.get('type') || 'users').toLowerCase()
  const supabase = createClient()

  if (type === 'orders') {
    const { data, error } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, auction_id, status, product_amount, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const header = ['id', 'buyer_id', 'seller_id', 'auction_id', 'status', 'product_amount', 'created_at']
    const lines = [header.join(',')]
    for (const row of data ?? []) {
      lines.push(
        [
          csvEscape(String(row.id)),
          csvEscape(String(row.buyer_id ?? '')),
          csvEscape(String(row.seller_id ?? '')),
          csvEscape(String(row.auction_id ?? '')),
          csvEscape(String(row.status ?? '')),
          String(row.product_amount ?? ''),
          csvEscape(String(row.created_at ?? '')),
        ].join(',')
      )
    }
    const csv = '\uFEFF' + lines.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orders-export.csv"',
      },
    })
  }

  if (type === 'auctions') {
    const { data, error } = await supabase
      .from('auctions')
      .select('id, title, status, current_bid, seller_id, created_at, city, category')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const header = ['id', 'title', 'status', 'current_bid', 'seller_id', 'created_at', 'city', 'category']
    const lines = [header.join(',')]
    for (const row of data ?? []) {
      lines.push(
        [
          csvEscape(String(row.id)),
          csvEscape(String(row.title ?? '')),
          csvEscape(String(row.status ?? '')),
          String(row.current_bid ?? ''),
          csvEscape(String(row.seller_id ?? '')),
          csvEscape(String(row.created_at ?? '')),
          csvEscape(String(row.city ?? '')),
          csvEscape(String(row.category ?? '')),
        ].join(',')
      )
    }
    const csv = '\uFEFF' + lines.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="auctions-export.csv"',
      },
    })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, city, created_at, suspended')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const header = ['id', 'full_name', 'phone', 'city', 'created_at', 'suspended']
  const lines = [header.join(',')]
  for (const row of data ?? []) {
    lines.push(
      [
        csvEscape(String(row.id)),
        csvEscape(String(row.full_name ?? '')),
        csvEscape(String(row.phone ?? '')),
        csvEscape(String(row.city ?? '')),
        csvEscape(String(row.created_at ?? '')),
        String(Boolean(row.suspended)),
      ].join(',')
    )
  }
  const csv = '\uFEFF' + lines.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="users-export.csv"',
    },
  })
}
