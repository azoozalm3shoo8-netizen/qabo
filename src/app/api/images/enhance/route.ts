import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { enhanceImage, generateResponsiveVariants } from '@/lib/image-enhancer'
import { isValidUserId } from '@/lib/server/require-user'

export const runtime = 'nodejs'
export const maxDuration = 60

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

  let options: Record<string, unknown> = {}
  const optRaw = form.get('options')
  if (typeof optRaw === 'string' && optRaw) {
    try {
      options = JSON.parse(optRaw) as Record<string, unknown>
    } catch {
      options = {}
    }
  }

  const generateVariants = options.generateVariants === true
  const files = form.getAll('files').filter((f): f is File => typeof f !== 'string' && 'arrayBuffer' in f)

  if (!files.length) {
    return NextResponse.json({ success: false, error: 'لم يُرفع أي ملف' }, { status: 400 })
  }

  const supabase = createClient()
  const ts = Date.now()
  const images: {
    url: string
    thumbhash?: string
    sizes?: { width: number; url: string }[]
    appliedSteps: string[]
    compressionRatio: number
    processingMs: number
  }[] = []

  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const mime = (f.type || '').toLowerCase()
      if (!ALLOWED.has(mime)) {
        return NextResponse.json({ success: false, error: `نوع غير مدعوم: ${mime}` }, { status: 400 })
      }
      if (f.size > MAX_BYTES) {
        return NextResponse.json({ success: false, error: 'حجم الصورة يتجاوز 20 ميجابايت' }, { status: 400 })
      }

      const buf = Buffer.from(await f.arrayBuffer())
      const enhanced = await enhanceImage(buf, {
        sharpen: options.sharpen !== false,
        denoise: options.denoise !== false,
        normalize: options.normalize !== false,
        adjustBrightness: options.adjustBrightness !== false,
        autoWhiteBalance: options.autoWhiteBalance !== false,
        upscale: options.upscale === true,
        targetWidth: typeof options.targetWidth === 'number' ? options.targetWidth : 1200,
        quality: typeof options.quality === 'number' ? options.quality : 88,
        outputFormat:
          options.outputFormat === 'jpeg' || options.outputFormat === 'avif'
            ? options.outputFormat
            : 'webp',
      })

      const ext = enhanced.format === 'jpeg' ? 'jpg' : enhanced.format === 'avif' ? 'avif' : 'webp'
      const storagePath = `enhanced/${userId}/${ts}_${i}.${ext}`
      const contentType =
        ext === 'jpg' ? 'image/jpeg' : ext === 'avif' ? 'image/avif' : 'image/webp'

      const { error: upErr } = await supabase.storage
        .from('auction-images')
        .upload(storagePath, enhanced.buffer, { contentType, upsert: true })
      if (upErr) {
        return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
      }
      const { data: pub } = supabase.storage.from('auction-images').getPublicUrl(storagePath)

      let sizes: { width: number; url: string }[] | undefined
      if (generateVariants) {
        try {
          const vars = await generateResponsiveVariants(enhanced.buffer)
          sizes = []
          for (let vi = 0; vi < vars.length; vi++) {
            const v = vars[vi]
            const sp = `enhanced/${userId}/${ts}_${i}_w${v.width}.${vi}.webp`
            const { error: ve } = await supabase.storage
              .from('auction-images')
              .upload(sp, v.buffer, { contentType: 'image/webp', upsert: true })
            if (!ve) {
              const u = supabase.storage.from('auction-images').getPublicUrl(sp)
              sizes.push({ width: v.width, url: u.data.publicUrl })
            }
          }
        } catch {
          /* optional */
        }
      }

      images.push({
        url: pub.publicUrl,
        thumbhash: enhanced.thumbhash,
        sizes,
        appliedSteps: enhanced.appliedSteps,
        compressionRatio: enhanced.compressionRatio,
        processingMs: enhanced.processingMs,
      })
    }

    return NextResponse.json({ success: true, images })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل التحسين'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
