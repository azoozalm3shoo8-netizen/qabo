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

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 20))
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { count, error: cErr } = await supabase
    .from('auctions')
    .select('*', { count: 'exact', head: true })

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  const { data: rows, error } = await supabase
    .from('auctions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sellerIds = [...new Set((rows ?? []).map((a) => a.seller_id as string))]
  const { data: profs } = sellerIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', sellerIds)
    : { data: [] as { id: string; full_name: string | null }[] }

  const pMap = new Map((profs ?? []).map((p) => [p.id, p]))

  const auctions = (rows ?? []).map((a) => ({
    ...a,
    seller_full_name:
      (pMap.get(a.seller_id as string)?.full_name &&
        String(pMap.get(a.seller_id as string)!.full_name).trim()) ||
      '—',
  }))

  return NextResponse.json({
    auctions,
    total: count ?? 0,
    page,
    limit,
  })
}

export async function PATCH(req: NextRequest) {
  let body: { auction_id?: string; status?: string; user_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { auction_id, status, user_id } = body
  if (!auction_id || !status || !isAdminUserId(user_id)) {
    return NextResponse.json({ error: 'غير مصرّح أو بيانات ناقصة' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('auctions')
    .update({ status })
    .eq('id', auction_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
