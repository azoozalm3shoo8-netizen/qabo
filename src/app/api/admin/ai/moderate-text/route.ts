import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { moderateText } from '@/lib/ai-moderation'

export async function POST(req: NextRequest) {
  let body: { user_id?: string; text?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const gate = await requirePermission(body.user_id, 'reports_view')
  if (!gate.ok) return gate.res

  const text = typeof body.text === 'string' ? body.text : ''
  if (!text.trim()) return NextResponse.json({ error: 'النص فارغ' }, { status: 400 })

  const result = await moderateText(text)

  await logAdminAction({
    actorId: body.user_id!,
    action: 'admin.ai.moderate_text',
    details: { source: result.source, flagged: result.flagged },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({
    flagged: result.flagged,
    categories: result.categories,
    scores: result.scores,
    source: result.source,
  })
}
