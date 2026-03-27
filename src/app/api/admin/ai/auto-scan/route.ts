import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { moderateText } from '@/lib/ai-moderation'

export async function POST(req: NextRequest) {
  let body: { user_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const gate = await requirePermission(body.user_id, 'reports_view')
  if (!gate.ok) return gate.res

  const supabase = createClient()
  const { data: rows, error } = await supabase
    .from('auctions')
    .select('id, title, description')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{
    auction_id: string
    title: string
    status: 'clean' | 'suspicious' | 'flagged'
    details?: string
  }> = []

  for (const row of rows ?? []) {
    const text = `${String(row.title ?? '')}\n${String(row.description ?? '')}`.trim()
    if (!text) {
      results.push({
        auction_id: row.id as string,
        title: String(row.title ?? ''),
        status: 'clean',
      })
      continue
    }

    const mod = await moderateText(text)
    let status: 'clean' | 'suspicious' | 'flagged' = 'clean'
    if (mod.flagged) status = 'flagged'
    else {
      const top = mod.categories[0]
      if (top && top.score >= 0.35) status = 'suspicious'
    }

    results.push({
      auction_id: row.id as string,
      title: String(row.title ?? '').slice(0, 120),
      status,
      details:
        status === 'flagged'
          ? 'محتوى مُعلَم أو كلمات محظورة'
          : status === 'suspicious'
            ? 'درجة خطورة متوسطة'
            : undefined,
    })
  }

  await logAdminAction({
    actorId: body.user_id!,
    action: 'admin.ai.auto_scan',
    details: { scanned: results.length },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({ results })
}
