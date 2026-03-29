import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { removeImageBackground } from '@/lib/background-remover'
import { isValidUserId } from '@/lib/server/require-user'

export const runtime = 'nodejs'
export const maxDuration = 120

const MAX_BYTES = 20 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: NextRequest) {
  const userIdRaw = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(userIdRaw)) {
    return NextResponse.json({ success: false, error: 'معرّف المستخدم غير صالح' }, { status: 401 })
  }
  const userId = userIdRaw!.trim()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'تعذر قراءة البيانات' }, { status: 400 })
  }

  let options: { addWhiteBg?: boolean; addCustomBg?: string; outputFormat?: 'png' | 'webp' } = {}
  const optRaw = form.get('options')
  if (typeof optRaw === 'string' && optRaw) {
    try {
      options = JSON.parse(optRaw) as typeof options
    } catch {
      options = {}
    }
  }

  const file = form.get('file')
  if (!file || typeof file === 'string' || !('arrayBuffer' in file)) {
    return NextResponse.json({ success: false, error: 'لم يُرفع ملف' }, { status: 400 })
  }
  const f = file as File
  const mime = (f.type || '').toLowerCase()
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ success: false, error: 'نوع الملف غير مدعوم' }, { status: 400 })
  }
  if (f.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'الحجم يتجاوز 20 ميجابايت' }, { status: 400 })
  }

  try {
    const buf = Buffer.from(await f.arrayBuffer())
    const t0 = Date.now()
    const result = await removeImageBackground(buf, {
      addWhiteBg: options.addWhiteBg !== false,
      addCustomBg: options.addCustomBg,
      outputFormat: options.outputFormat || 'webp',
    })
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'فشلت إزالة الخلفية',
        processingMs: result.processingMs,
      })
    }

    const supabase = createClient()
    const ts = Date.now()
    const ext = result.format === 'jpeg' ? 'jpg' : result.format === 'png' ? 'png' : 'webp'
    const storagePath = `nobg/${userId}/${ts}.${ext}`
    const ct =
      ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp'
    const { error: upErr } = await supabase.storage
      .from('auction-images')
      .upload(storagePath, result.buffer, { contentType: ct, upsert: true })
    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
    }
    const { data } = supabase.storage.from('auction-images').getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      url: data.publicUrl,
      processingMs: Date.now() - t0,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ غير متوقع'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
