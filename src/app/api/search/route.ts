import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SELECT_COLS =
  'id, title, description, category, city, images, start_price, current_bid, bid_count, highest_bidder_id, status, ends_at, created_at'

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qRaw = (sp.get('q') || '').trim()
  const category = (sp.get('category') || '').trim()
  const city = (sp.get('city') || '').trim()
  const minPrice = sp.get('min_price')
  const maxPrice = sp.get('max_price')
  const statusParam = (sp.get('status') || 'active').trim()
  const sort = (sp.get('sort') || 'newest').trim()
  const page = Math.max(1, Number.parseInt(sp.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get('limit') || '20', 10) || 20))
  const from = (page - 1) * limit
  const to = page * limit - 1

  const applyToQuery = <S extends string>(
    selectPart: S,
    countOpts?: { count: 'exact'; head: true }
  ) => {
    const base = countOpts
      ? supabase.from('auctions').select(selectPart, countOpts)
      : supabase.from('auctions').select(selectPart)

    let qb = base

    if (qRaw) {
      const safe = escapeIlike(qRaw)
      qb = qb.ilike('title', '%' + safe + '%')
    }
    if (category) {
      qb = qb.eq('category', category)
    }
    if (city) {
      qb = qb.eq('city', city)
    }
    if (minPrice !== null && minPrice !== '' && !Number.isNaN(Number(minPrice))) {
      qb = qb.gte('current_bid', Number(minPrice))
    }
    if (maxPrice !== null && maxPrice !== '' && !Number.isNaN(Number(maxPrice))) {
      qb = qb.lte('current_bid', Number(maxPrice))
    }

    if (sort === 'ending_soon') {
      qb = qb.eq('status', 'active')
    } else if (statusParam) {
      qb = qb.eq('status', statusParam)
    }

    switch (sort) {
      case 'newest':
        qb = qb.order('created_at', { ascending: false })
        break
      case 'cheapest':
        qb = qb.order('current_bid', { ascending: true })
        break
      case 'expensive':
        qb = qb.order('current_bid', { ascending: false })
        break
      case 'ending_soon':
        qb = qb.order('ends_at', { ascending: true })
        break
      default:
        qb = qb.order('created_at', { ascending: false })
    }

    return qb
  }

  const { count, error: countErr } = await applyToQuery('id', { count: 'exact', head: true })

  if (countErr) {
    return NextResponse.json({ error: 'تعذر العد: ' + countErr.message }, { status: 500 })
  }

  const { data: results, error: dataErr } = await applyToQuery(SELECT_COLS).range(from, to)

  if (dataErr) {
    return NextResponse.json({ error: 'تعذر البحث: ' + dataErr.message }, { status: 500 })
  }

  return NextResponse.json({
    results: results ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}
