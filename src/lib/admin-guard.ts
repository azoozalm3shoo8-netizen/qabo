import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminRole, hasPermission, type AdminRole, type Permission } from '@/lib/admin-auth'
import { isAdminUserId } from '@/lib/admin-ids'

export function clientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || undefined
  return req.headers.get('x-real-ip') ?? undefined
}

/** سياق المشرف: صف admin_roles أو المعرفات الورقية في admin-ids (bootstrap). */
export async function getActorContext(
  userId: string | null | undefined
): Promise<{ actorId: string; role: AdminRole } | null> {
  if (!userId) return null
  const r = await getAdminRole(userId)
  if (r) return { actorId: userId, role: r.role }
  if (isAdminUserId(userId)) return { actorId: userId, role: 'super_admin' }
  return null
}

export async function requireSuperAdmin(userId: string | null | undefined) {
  const ctx = await getActorContext(userId)
  if (!ctx || ctx.role !== 'super_admin') {
    return {
      ok: false as const,
      res: NextResponse.json({ error: 'غير مصرّح — مطلوب مدير أعلى' }, { status: 403 }),
    }
  }
  return { ok: true as const, ctx }
}

export async function requirePermission(userId: string | null | undefined, p: Permission) {
  const ctx = await getActorContext(userId)
  if (!ctx || !hasPermission(ctx.role, p)) {
    return { ok: false as const, res: NextResponse.json({ error: 'غير مصرّح' }, { status: 403 }) }
  }
  return { ok: true as const, ctx }
}
