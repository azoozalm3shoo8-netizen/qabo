import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'

const BATCH = 200

export async function POST(req: NextRequest) {
  let body: { user_id?: string; title?: string; body?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const actorId = body.user_id
  const gate = await requirePermission(actorId, 'users_edit')
  if (!gate.ok) return gate.res

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const message = typeof body.body === 'string' ? body.body.trim() : ''
  if (!title || !message) {
    return NextResponse.json({ error: 'العنوان والنص مطلوبان' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id')
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const ids = (profiles ?? []).map((p) => p.id as string)
  let inserted = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    const rows = chunk.map((user_id) => ({
      user_id,
      type: 'admin',
      title: title.slice(0, 200),
      message: message.slice(0, 2000),
      is_read: false,
    }))
    const { error } = await supabase.from('notifications').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted += chunk.length
  }

  await logAdminAction({
    actorId: actorId!,
    action: 'admin.notification.broadcast',
    details: { count: inserted, title: title.slice(0, 80) },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({ ok: true, sent: inserted })
}
