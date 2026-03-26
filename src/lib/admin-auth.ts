import { createClient } from '@/lib/supabase-server'

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support' | 'viewer'

export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 100,
  admin: 80,
  moderator: 60,
  support: 40,
  viewer: 20,
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'مدير أعلى',
  admin: 'مدير',
  moderator: 'مشرف',
  support: 'دعم فني',
  viewer: 'مشاهد',
}

export const PERMISSIONS = {
  dashboard: ['super_admin', 'admin', 'moderator', 'support', 'viewer'],
  users_view: ['super_admin', 'admin', 'moderator', 'support'],
  users_edit: ['super_admin', 'admin'],
  users_ban: ['super_admin', 'admin', 'moderator'],
  auctions_view: ['super_admin', 'admin', 'moderator'],
  auctions_edit: ['super_admin', 'admin'],
  auctions_delete: ['super_admin'],
  finance_view: ['super_admin', 'admin'],
  finance_approve: ['super_admin'],
  reports_view: ['super_admin', 'admin', 'moderator'],
  reports_action: ['super_admin', 'admin', 'moderator'],
  settings: ['super_admin'],
  roles_manage: ['super_admin'],
  audit_view: ['super_admin', 'admin'],
  export_data: ['super_admin', 'admin'],
} as const

export type Permission = keyof typeof PERMISSIONS

export async function getAdminRole(
  userId: string
): Promise<{ role: AdminRole; permissions: Record<string, boolean> } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('admin_roles')
    .select('role, permissions')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return { role: data.role as AdminRole, permissions: (data.permissions || {}) as Record<string, boolean> }
}

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

export function canManageRole(actorRole: AdminRole, targetRole: AdminRole): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}
