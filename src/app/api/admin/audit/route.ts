import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission } from '@/lib/admin-guard'

export async function GET(req: NextRequest) {
  const actorId = req.nextUrl.searchParams.get('user_id')
  const gate = await requirePermission(actorId, 'audit_view')
  if (!gate.ok) return gate.res

  const sp = req.nextUrl.searchParams
  const actionFilter = (sp.get('action') || '').trim()
  const actorFilter = (sp.get('actor') || '').trim()
  const search = (sp.get('search') || '').trim()
  const dateFrom = (sp.get('date_from') || '').trim()
  const dateTo = (sp.get('date_to') || '').trim()
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const limit = Math.min(200, Math.max(1, Number(sp.get('limit')) || 50))
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = createClient()
  let q = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (actionFilter) q = q.ilike('action', `%${actionFilter}%`)
  if (actorFilter) q = q.eq('actor_id', actorFilter)
  if (dateFrom) q = q.gte('created_at', dateFrom)
  if (dateTo) q = q.lte('created_at', dateTo)

  const { data, error, count } = await q.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let logs = data ?? []
  if (search.length > 0) {
    const s = search.toLowerCase()
    logs = logs.filter(
      (row) =>
        String(row.action).toLowerCase().includes(s) ||
        String(row.target_id || '').toLowerCase().includes(s) ||
        String(row.actor_email || '').toLowerCase().includes(s)
    )
  }

  return NextResponse.json({
    logs,
    total: count ?? logs.length,
    page,
    limit,
  })
}
