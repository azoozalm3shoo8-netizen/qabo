import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

  const { count: unread } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    notifications: data ?? [],
    unread_count: unread ?? 0,
  })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { user_id, notification_ids, mark_all_read } = body

  if (!user_id) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

  if (mark_all_read) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user_id)
      .eq('is_read', false)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (!Array.isArray(notification_ids) || !notification_ids.length) {
    return NextResponse.json({ error: 'missing notification_ids' }, { status: 400 })
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user_id)
    .in('id', notification_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** إشعار إداري لمستخدم: { user_id (المشرف), target_user_id, title, message } */
export async function POST(req: NextRequest) {
  let body: { user_id?: string; target_user_id?: string; title?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id: actorId, target_user_id, title, message } = body
  const gate = await requirePermission(actorId, 'users_edit')
  if (!gate.ok) return gate.res

  if (!target_user_id || !title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: target_user_id,
      type: 'admin',
      title: title.trim().slice(0, 200),
      message: message.trim().slice(0, 2000),
      is_read: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: prof } = await supabase.from('profiles').select('phone, full_name').eq('id', actorId!).maybeSingle()
  const actorEmail = (prof?.phone as string) || (prof?.full_name as string) || undefined

  await logAdminAction({
    actorId: actorId!,
    actorEmail,
    action: 'admin.notification.send',
    targetType: 'profile',
    targetId: target_user_id,
    details: { title: title.trim().slice(0, 80) },
    ipAddress: clientIp(req),
  })

  return NextResponse.json(data)
}
