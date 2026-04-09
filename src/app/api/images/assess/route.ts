import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { assessImageQuality } from '@/lib/services/ai-image-quality-gate'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'ملف مفقود' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'الملف كبير جداً' }, { status: 400 })
    }
    const report = await assessImageQuality(buf)
    return NextResponse.json({
      isAcceptable: report.isAcceptable,
      score: report.score,
      issues: report.issues,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل التحليل'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
