import { createClient } from '@/lib/supabase-server'

export async function logAdminAction(params: {
  actorId: string
  actorEmail?: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}) {
  const supabase = createClient()
  await supabase.from('audit_logs').insert({
    actor_id: params.actorId,
    actor_email: params.actorEmail || null,
    action: params.action,
    target_type: params.targetType || null,
    target_id: params.targetId || null,
    details: params.details || {},
    ip_address: params.ipAddress || null,
  })
}
