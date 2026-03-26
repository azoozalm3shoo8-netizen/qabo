import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'

function db() {
  return createClient()
}

async function profileEmail(actorId: string): Promise<string | undefined> {
  const { data } = await db().from('profiles').select('phone, full_name').eq('id', actorId).maybeSingle()
  if (!data) return undefined
  return (data.phone as string | null) || (data.full_name as string | null) || undefined
}

/** GET ?user_id= — تفاصيل مستخدم */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await context.params
  const actorId = req.nextUrl.searchParams.get('user_id')
  const gate = await requirePermission(actorId, 'users_view')
  if (!gate.ok) return gate.res

  const { data: profile, error: pErr } = await db().from('profiles').select('*').eq('id', targetId).maybeSingle()
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })

  const [
    { data: auctions },
    { data: bids },
    { data: orders },
    { data: reviewsReceived },
    { data: reports },
    { data: adminRole },
    { data: bans },
  ] = await Promise.all([
    db().from('auctions').select('*').eq('seller_id', targetId).order('created_at', { ascending: false }).limit(50),
    db().from('bids').select('*').eq('bidder_id', targetId).order('created_at', { ascending: false }).limit(100),
    db()
      .from('orders')
      .select('*')
      .or(`buyer_id.eq.${targetId},seller_id.eq.${targetId}`)
      .order('created_at', { ascending: false })
      .limit(50),
    db().from('reviews').select('*').eq('reviewed_id', targetId).order('created_at', { ascending: false }).limit(50),
    db()
      .from('reports')
      .select('*')
      .or(`reporter_id.eq.${targetId},reported_user_id.eq.${targetId}`)
      .order('created_at', { ascending: false })
      .limit(50),
    db().from('admin_roles').select('*').eq('user_id', targetId).maybeSingle(),
    db().from('user_bans').select('*').eq('user_id', targetId).order('created_at', { ascending: false }).limit(30),
  ])

  return NextResponse.json({
    profile,
    auctions: auctions ?? [],
    bids: bids ?? [],
    orders: orders ?? [],
    reviews: reviewsReceived ?? [],
    reports: reports ?? [],
    admin_role: adminRole ?? null,
    bans: bans ?? [],
  })
}

/** PATCH — تعليق / إلغاء تعليق { user_id, suspended } */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await context.params
  let body: { user_id?: string; suspended?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id: actorId, suspended } = body
  const gate = await requirePermission(actorId, 'users_edit')
  if (!gate.ok) return gate.res

  if (typeof suspended !== 'boolean') {
    return NextResponse.json({ error: 'حقل suspended مطلوب (boolean)' }, { status: 400 })
  }

  const { data: updated, error } = await db()
    .from('profiles')
    .update({ suspended, updated_at: new Date().toISOString() })
    .eq('id', targetId)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 })

  const email = actorId ? await profileEmail(actorId) : undefined
  await logAdminAction({
    actorId: actorId!,
    actorEmail: email,
    action: suspended ? 'admin.user.suspend' : 'admin.user.unsuspend',
    targetType: 'profile',
    targetId: targetId,
    details: { suspended },
    ipAddress: clientIp(req),
  })

  return NextResponse.json(updated)
}
