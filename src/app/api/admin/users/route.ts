import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/admin-guard'

function db() {
  return createClient()
}

/** أحدث حظر لكل مستخدم ثم تحديد من هم «محظورون فعلياً» (مستوى ≥ 2 ونافذ). */
async function getActiveBannedUserIds(): Promise<string[]> {
  const { data } = await db()
    .from('user_bans')
    .select('user_id, ban_level, ends_at, is_permanent, created_at')
    .order('created_at', { ascending: false })

  const latest = new Map<
    string,
    { ban_level: number; ends_at: string | null; is_permanent: boolean }
  >()
  for (const r of data ?? []) {
    const uid = r.user_id as string
    if (latest.has(uid)) continue
    latest.set(uid, {
      ban_level: Number(r.ban_level ?? 1),
      ends_at: (r.ends_at as string | null) ?? null,
      is_permanent: Boolean(r.is_permanent),
    })
  }

  const out: string[] = []
  const now = Date.now()
  for (const [uid, b] of latest) {
    if (b.ban_level <= 1) continue
    if (b.is_permanent) {
      out.push(uid)
      continue
    }
    if (b.ends_at && new Date(b.ends_at).getTime() > now) out.push(uid)
  }
  return out
}

/**
 * GET ?user_id=&search=&page=&limit=&status=
 * status: all | active | suspended | banned
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const actorId = sp.get('user_id')
  const gate = await requirePermission(actorId, 'users_view')
  if (!gate.ok) return gate.res

  const searchRaw = (sp.get('search') || '').trim()
  const search = searchRaw.replace(/%/g, '').replace(/,/g, '')
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 20))
  const status = (sp.get('status') || 'all').toLowerCase()

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = db().from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (search.length > 0) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  if (status === 'suspended') {
    query = query.eq('suspended', true)
  }

  if (status === 'banned') {
    const bannedIds = await getActiveBannedUserIds()
    if (bannedIds.length === 0) {
      return NextResponse.json({ users: [], total: 0, page, limit })
    }
    query = db()
      .from('profiles')
      .select('*', { count: 'exact' })
      .in('id', bannedIds)
      .order('created_at', { ascending: false })
    if (search.length > 0) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
    }
  }

  if (status === 'active') {
    const bannedIds = await getActiveBannedUserIds()
    query = query.or('suspended.is.null,suspended.eq.false')
    if (bannedIds.length > 0) {
      query = query.not('id', 'in', `(${bannedIds.join(',')})`)
    }
  }

  const { data: rows, error, count } = await query.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (rows ?? []).map((r) => r.id as string)
  let roleMap = new Map<string, string>()
  let bansByUser = new Map<string, { ban_level: number; ends_at: string | null; is_permanent: boolean }>()

  if (ids.length) {
    const [{ data: roles }, { data: banRows }] = await Promise.all([
      db().from('admin_roles').select('user_id, role').in('user_id', ids),
      db()
        .from('user_bans')
        .select('user_id, ban_level, ends_at, is_permanent, created_at')
        .in('user_id', ids)
        .order('created_at', { ascending: false }),
    ])

    for (const r of roles ?? []) {
      roleMap.set(r.user_id as string, r.role as string)
    }

    for (const b of banRows ?? []) {
      const uid = b.user_id as string
      if (bansByUser.has(uid)) continue
      bansByUser.set(uid, {
        ban_level: Number(b.ban_level ?? 1),
        ends_at: (b.ends_at as string | null) ?? null,
        is_permanent: Boolean(b.is_permanent),
      })
    }
  }

  const now = Date.now()
  const users = (rows ?? []).map((p) => {
    const id = p.id as string
    const ban = bansByUser.get(id)
    let banActive = false
    if (ban && ban.ban_level > 1) {
      banActive = ban.is_permanent || Boolean(ban.ends_at && new Date(ban.ends_at).getTime() > now)
    }
    return {
      ...p,
      admin_role: roleMap.get(id) ?? null,
      latest_ban: ban ?? null,
      is_banned_active: banActive,
    }
  })

  return NextResponse.json({
    users,
    total: count ?? 0,
    page,
    limit,
  })
}
