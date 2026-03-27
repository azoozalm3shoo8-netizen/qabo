import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { sendTelegramAlert } from '@/lib/telegram'

function tgEsc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function db() {
  return createClient()
}

async function actorEmail(actorId: string): Promise<string | undefined> {
  const { data } = await db().from('profiles').select('phone, full_name').eq('id', actorId).maybeSingle()
  if (!data) return undefined
  return (data.phone as string | null) || (data.full_name as string | null) || undefined
}

export async function GET(req: NextRequest) {
  const actorId = req.nextUrl.searchParams.get('user_id')
  const gate = await requirePermission(actorId, 'auctions_view')
  if (!gate.ok) return gate.res

  const singleId = (req.nextUrl.searchParams.get('id') || '').trim()
  if (singleId) {
    const { data: row, error } = await db().from('auctions').select('*').eq('id', singleId).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    const { data: prof } = await db()
      .from('profiles')
      .select('full_name')
      .eq('id', row.seller_id as string)
      .maybeSingle()
    return NextResponse.json({
      auction: {
        ...row,
        seller_full_name: prof?.full_name ? String(prof.full_name).trim() : '—',
      },
    })
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 20))
  const search = (req.nextUrl.searchParams.get('search') || '').trim()
  const status = (req.nextUrl.searchParams.get('status') || 'all').toLowerCase()
  const category = (req.nextUrl.searchParams.get('category') || '').trim()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let q = db().from('auctions').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (status === 'active') q = q.eq('status', 'active')
  else if (status === 'ended') q = q.eq('status', 'ended')

  if (search.length > 0) {
    const esc = search.replace(/%/g, '')
    q = q.ilike('title', `%${esc}%`)
  }

  const { data: rows, error, count } = await q.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sellerIds = [...new Set((rows ?? []).map((a) => a.seller_id as string))]
  const { data: profs } = sellerIds.length
    ? await db().from('profiles').select('id, full_name').in('id', sellerIds)
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

  const { auction_id, status, user_id: actorId } = body
  const gate = await requirePermission(actorId, 'auctions_edit')
  if (!gate.ok) return gate.res

  if (!auction_id || !status) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const { data, error } = await db()
    .from('auctions')
    .update({ status })
    .eq('id', auction_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const email = await actorEmail(actorId!)
  await logAdminAction({
    actorId: actorId!,
    actorEmail: email,
    action: 'admin.auction.status',
    targetType: 'auction',
    targetId: auction_id,
    details: { status },
    ipAddress: clientIp(req),
  })

  void sendTelegramAlert(
    `🛡️ <b>قبو</b> — تحديث مزاد\nالمعرف: <code>${tgEsc(auction_id)}</code>\nالحالة: <b>${tgEsc(status)}</b>`
  )

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  let body: { auction_id?: string; user_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { auction_id, user_id: actorId } = body
  const gate = await requirePermission(actorId, 'auctions_delete')
  if (!gate.ok) return gate.res

  if (!auction_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const { error } = await db().from('auctions').delete().eq('id', auction_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const email = await actorEmail(actorId!)
  await logAdminAction({
    actorId: actorId!,
    actorEmail: email,
    action: 'admin.auction.delete',
    targetType: 'auction',
    targetId: auction_id,
    ipAddress: clientIp(req),
  })

  void sendTelegramAlert(`🛡️ <b>قبو</b> — <b>حذف مزاد</b>\nالمعرف: <code>${tgEsc(auction_id)}</code>`)

  return NextResponse.json({ ok: true })
}
