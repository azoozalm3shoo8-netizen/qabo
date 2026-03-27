import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { suggestCategoryFromTitle } from '@/lib/ai-classifier'

type LabelScore = { label: string; confidence: number }

async function cloudflareClassifyImage(imageUrl: string): Promise<LabelScore[] | null> {
  const accountId = process.env.CF_ACCOUNT_ID
  const token = process.env.CF_AI_TOKEN
  if (!accountId || !token) return null

  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) })
    if (!imgRes.ok) return null
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const b64 = buf.toString('base64')

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/microsoft/resnet-50`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: b64 }),
    })

    const data = (await res.json()) as {
      result?: { label?: string; score?: number } | Array<{ label?: string; score?: number }>
      success?: boolean
    }

    if (!res.ok || !data.success) return null

    const r = data.result
    if (Array.isArray(r)) {
      return r
        .filter((x) => x.label != null)
        .map((x) => ({ label: String(x.label), confidence: Number(x.score ?? 0) }))
    }
    if (r && typeof r === 'object' && r.label) {
      return [{ label: String(r.label), confidence: Number(r.score ?? 0) }]
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: { user_id?: string; image_url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const gate = await requirePermission(body.user_id, 'reports_view')
  if (!gate.ok) return gate.res

  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : ''
  if (!imageUrl) return NextResponse.json({ error: 'رابط الصورة مطلوب' }, { status: 400 })

  const cf = await cloudflareClassifyImage(imageUrl)
  if (cf && cf.length > 0) {
    await logAdminAction({
      actorId: body.user_id!,
      action: 'admin.ai.classify_image',
      details: { source: 'cloudflare' },
      ipAddress: clientIp(req),
    })
    return NextResponse.json({ classifications: cf, source: 'cloudflare' })
  }

  const hint = decodeURIComponent(imageUrl.split('/').pop() || '').replace(/\.[^.]+$/, '')
  const local = suggestCategoryFromTitle(hint || imageUrl)
  await logAdminAction({
    actorId: body.user_id!,
    action: 'admin.ai.classify_image',
    details: { source: 'local' },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({
    classifications: local ? [{ label: local, confidence: 0.5 }] : [{ label: 'عام', confidence: 0.2 }],
    source: 'local',
  })
}
