import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { checkImageSafety } from '@/lib/ai-moderation'

export async function POST(req: NextRequest) {
  let body: { user_id?: string; image_url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const gate = await requirePermission(body.user_id, 'reports_view')
  if (!gate.ok) return gate.res

  const url = typeof body.image_url === 'string' ? body.image_url.trim() : ''
  if (!url) return NextResponse.json({ error: 'رابط الصورة مطلوب' }, { status: 400 })

  const result = await checkImageSafety(url)

  await logAdminAction({
    actorId: body.user_id!,
    action: 'admin.ai.check_image',
    details: { source: result.source, nsfw: result.nsfw },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({
    safe: result.safe,
    nsfw: result.nsfw,
    confidence: result.confidence,
    source: result.source,
    message: result.message,
  })
}
