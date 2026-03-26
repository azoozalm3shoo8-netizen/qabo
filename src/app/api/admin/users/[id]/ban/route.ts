import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { sendTelegramAlert } from '@/lib/telegram'

function db() {
  return createClient()
}

function tgEsc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function actorEmail(actorId: string): Promise<string | undefined> {
  const { data } = await db().from('profiles').select('phone, full_name').eq('id', actorId).maybeSingle()
  if (!data) return undefined
  return (data.phone as string | null) || (data.full_name as string | null) || undefined
}

/** أقصى مستوى حظر سُجّل سابقاً لهذا المستخدم */
async function maxBanLevel(targetUserId: string): Promise<number> {
  const { data } = await db()
    .from('user_bans')
    .select('ban_level')
    .eq('user_id', targetUserId)
  const levels = (data ?? []).map((r) => Number(r.ban_level ?? 0))
  return levels.length ? Math.max(...levels) : 0
}

function banWindowForLevel(level: number): { ends_at: string | null; is_permanent: boolean } {
  const now = Date.now()
  if (level <= 1) return { ends_at: null, is_permanent: false }
  if (level === 2) return { ends_at: new Date(now + 24 * 3600 * 1000).toISOString(), is_permanent: false }
  if (level === 3) return { ends_at: new Date(now + 7 * 24 * 3600 * 1000).toISOString(), is_permanent: false }
  if (level === 4) return { ends_at: new Date(now + 30 * 24 * 3600 * 1000).toISOString(), is_permanent: false }
  return { ends_at: null, is_permanent: true }
}

/**
 * POST { user_id, reason }
 * حظر متدرج تلقائي حسب المستوى التالي
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await context.params
  let body: { user_id?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id: actorId, reason } = body
  const gate = await requirePermission(actorId, 'users_ban')
  if (!gate.ok) return gate.res

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return NextResponse.json({ error: 'سبب الحظر مطلوب' }, { status: 400 })
  }

  if (targetUserId === actorId) {
    return NextResponse.json({ error: 'لا يمكنك حظر نفسك' }, { status: 403 })
  }

  const prevMax = await maxBanLevel(targetUserId)
  if (prevMax >= 5) {
    return NextResponse.json({ error: 'المستخدم لديه أقصى درجة حظر بالفعل' }, { status: 409 })
  }

  const nextLevel = prevMax + 1
  const { ends_at, is_permanent } = banWindowForLevel(nextLevel)

  const { data: row, error } = await db()
    .from('user_bans')
    .insert({
      user_id: targetUserId,
      ban_level: nextLevel,
      reason: reason.trim().slice(0, 2000),
      banned_by: actorId!,
      starts_at: new Date().toISOString(),
      ends_at,
      is_permanent,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const email = await actorEmail(actorId!)
  const ip = clientIp(req)
  await logAdminAction({
    actorId: actorId!,
    actorEmail: email,
    action: 'admin.user.ban',
    targetType: 'user_ban',
    targetId: row.id as string,
    details: {
      target_user_id: targetUserId,
      ban_level: nextLevel,
      ends_at,
      is_permanent,
      reason: reason.trim().slice(0, 500),
    },
    ipAddress: ip,
  })

  await sendTelegramAlert(
    `<b>قبو — حظر مستخدم</b>\nالمستوى: ${nextLevel}\nالمستخدم: <code>${tgEsc(targetUserId)}</code>\nالسبب: ${tgEsc(reason.trim().slice(0, 200))}\nبواسطة: <code>${tgEsc(actorId!)}</code>`
  )

  return NextResponse.json(row)
}
