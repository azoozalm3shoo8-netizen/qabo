import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { canManageRole, ROLE_HIERARCHY, ROLE_LABELS, type AdminRole } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/audit'
import { requireSuperAdmin, clientIp, getActorContext } from '@/lib/admin-guard'
import { sendTelegramAlert } from '@/lib/telegram'

const supabase = () => createClient()

function tgEsc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function actorEmail(actorId: string): Promise<string | undefined> {
  const { data } = await supabase().from('profiles').select('phone, full_name').eq('id', actorId).maybeSingle()
  if (!data) return undefined
  return (data.phone as string | null) || (data.full_name as string | null) || undefined
}

/** GET ?user_id= — قائمة أدوار الإدارة (مدير أعلى فقط) */
export async function GET(req: NextRequest) {
  const actorId = req.nextUrl.searchParams.get('user_id')
  const gate = await requireSuperAdmin(actorId)
  if (!gate.ok) return gate.res

  const { data: rows, error } = await supabase().from('admin_roles').select('*').order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = [...new Set((rows ?? []).map((r) => r.user_id as string))]
  let profMap = new Map<string, { full_name: string | null }>()
  if (ids.length) {
    const { data: profs } = await supabase().from('profiles').select('id, full_name').in('id', ids)
    profMap = new Map((profs ?? []).map((p) => [p.id as string, { full_name: p.full_name as string | null }]))
  }

  const roles = (rows ?? []).map((r) => ({
    ...r,
    role_label: ROLE_LABELS[r.role as AdminRole] ?? r.role,
    full_name: profMap.get(r.user_id as string)?.full_name ?? null,
  }))

  return NextResponse.json({ roles })
}

/** POST — إضافة/تحديث دور (مدير أعلى، ممنوع تعديل دور النفس) */
export async function POST(req: NextRequest) {
  let body: {
    user_id?: string
    target_user_id?: string
    role?: AdminRole
    permissions?: Record<string, boolean>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id: actorId, target_user_id, role, permissions } = body
  const gate = await requireSuperAdmin(actorId)
  if (!gate.ok) return gate.res

  if (!target_user_id || !role) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  if (target_user_id === actorId) {
    return NextResponse.json({ error: 'لا يمكن تعديل دورك الخاص عبر هذه الواجهة' }, { status: 403 })
  }

  const validRoles: AdminRole[] = ['super_admin', 'admin', 'moderator', 'support', 'viewer']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'دور غير صالح' }, { status: 400 })
  }

  const ctx = await getActorContext(actorId)
  const { data: existing } = await supabase()
    .from('admin_roles')
    .select('role')
    .eq('user_id', target_user_id)
    .maybeSingle()

  if (existing?.role && ctx && ctx.role !== 'super_admin') {
    const prev = existing.role as AdminRole
    if (!canManageRole(ctx.role, prev)) {
      return NextResponse.json({ error: 'لا يمكنك تعديل مستخدم بمستوى مساوٍ أو أعلى' }, { status: 403 })
    }
  }

  if (ctx && ctx.role !== 'super_admin' && ROLE_HIERARCHY[ctx.role] <= ROLE_HIERARCHY[role]) {
    return NextResponse.json({ error: 'لا يمكنك منح هذا الدور' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const { data: row, error } = await supabase()
    .from('admin_roles')
    .upsert(
      {
        user_id: target_user_id,
        role,
        permissions: permissions ?? {},
        granted_by: actorId,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const email = await actorEmail(actorId!)
  const ip = clientIp(req)
  await logAdminAction({
    actorId: actorId!,
    actorEmail: email,
    action: 'admin.role.upsert',
    targetType: 'admin_role',
    targetId: target_user_id,
    details: { role, permissions: permissions ?? {} },
    ipAddress: ip,
  })

  await sendTelegramAlert(
    `<b>قبو — أدوار الإدارة</b>\nتم تعيين/تحديث دور: ${tgEsc(role)}\nالمستخدم: <code>${tgEsc(target_user_id)}</code>\nبواسطة: <code>${tgEsc(actorId!)}</code>`
  )

  return NextResponse.json(row)
}

/** DELETE — body JSON { user_id, target_user_id } */
export async function DELETE(req: NextRequest) {
  let body: { user_id?: string; target_user_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id: actorId, target_user_id } = body
  const gate = await requireSuperAdmin(actorId)
  if (!gate.ok) return gate.res

  if (!target_user_id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  if (target_user_id === actorId) {
    return NextResponse.json({ error: 'لا يمكن حذف دورك الخاص' }, { status: 403 })
  }

  const { error } = await supabase().from('admin_roles').delete().eq('user_id', target_user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const email = await actorEmail(actorId!)
  const ip = clientIp(req)
  await logAdminAction({
    actorId: actorId!,
    actorEmail: email,
    action: 'admin.role.delete',
    targetType: 'admin_role',
    targetId: target_user_id,
    ipAddress: ip,
  })

  await sendTelegramAlert(
    `<b>قبو — أدوار الإدارة</b>\nتم حذف دور إداري للمستخدم:\n<code>${tgEsc(target_user_id)}</code>\nبواسطة: <code>${tgEsc(actorId!)}</code>`
  )

  return NextResponse.json({ ok: true })
}
