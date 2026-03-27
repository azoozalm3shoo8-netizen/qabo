import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { analyzeToxicity } from '@/lib/ai-moderation'

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

  const result = await analyzeToxicity(text)

  await logAdminAction({
    actorId: body.user_id!,
    action: 'admin.ai.analyze_toxicity',
    details: { source: result.source },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({
    attributes: result.attributes,
    source: result.source,
    message: result.message,
  })
}
