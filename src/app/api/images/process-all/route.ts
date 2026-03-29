import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { addTrustBadge } from '@/lib/image-trust-badge'
import { isValidUserId } from '@/lib/server/require-user'

export const runtime = 'nodejs'
export const maxDuration = 180

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

  const files = form.getAll('files').filter((f): f is File => typeof f !== 'string' && 'arrayBuffer' in f)
  if (!files.length) {
    return NextResponse.json({ success: false, error: 'لم يُرفع أي ملف' }, { status: 400 })
  }

  const enhance = form.get('enhance') !== 'false' && form.get('enhance') !== '0'
  const removeBg = form.get('removeBg') === 'true' || form.get('removeBg') === '1'
  const addBadge = form.get('addBadge') === 'true' || form.get('addBadge') === '1'
  const badgeTypeRaw = form.get('badgeType')
  const badgeType =
    badgeTypeRaw === 'ai_inspected' || badgeTypeRaw === 'seller_confirmed' ? badgeTypeRaw : 'ai_verified'
  const outputFormatRaw = form.get('outputFormat')
  const outputFormat =
    outputFormatRaw === 'jpeg' || outputFormatRaw === 'avif' ? outputFormatRaw : 'webp'
  const upscale = form.get('upscale') === 'true' || form.get('upscale') === '1'

  const supabase = createClient()
  const ts = Date.now()
  const results: unknown[] = []

  type BackgroundRemover = typeof import('@/lib/background-remover')
  let removeImageBackgroundFn: BackgroundRemover['removeImageBackground'] | undefined
  if (removeBg) {
    const mod = await import('@/lib/background-remover')
    removeImageBackgroundFn = mod.removeImageBackground
  }

  type ImageEnhancerMod = typeof import('@/lib/image-enhancer')
  const imageEnhancerMod: ImageEnhancerMod = await import('@/lib/image-enhancer')

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

      let buf: Buffer = Buffer.from(await f.arrayBuffer())
      const originalSize = buf.length
      const appliedSteps: string[] = []
      let thumbhash: string | undefined
      let compressionRatio = 1
      let processingMs = 0

      if (enhance) {
        try {
          const er = await imageEnhancerMod.enhanceImage(buf, {
            outputFormat: outputFormat as 'jpeg' | 'webp' | 'avif',
            quality: 88,
            upscale,
          })
          buf = Buffer.from(er.buffer)
          appliedSteps.push(...er.appliedSteps)
          thumbhash = er.thumbhash
          compressionRatio = er.compressionRatio
          processingMs += er.processingMs
        } catch (e) {
          appliedSteps.push('enhance_failed')
        }
      }

      if (removeBg && removeImageBackgroundFn) {
        try {
          const rb = await removeImageBackgroundFn(buf, { addWhiteBg: true, outputFormat: 'webp' })
          if (rb.success) {
            buf = Buffer.from(rb.buffer)
            appliedSteps.push('remove_bg')
            processingMs += rb.processingMs
          } else {
            appliedSteps.push('remove_bg_skipped')
          }
        } catch {
          appliedSteps.push('remove_bg_failed')
        }
      }

      if (addBadge) {
        try {
          buf = Buffer.from(await addTrustBadge(buf, badgeType as 'ai_verified' | 'ai_inspected' | 'seller_confirmed'))
          appliedSteps.push('trust_badge')
        } catch {
          appliedSteps.push('badge_failed')
        }
      }

      const sharpMod = (await import('sharp')).default
      let ext = 'webp'
      let contentType = 'image/webp'
      try {
        if (outputFormat === 'jpeg') {
          buf = Buffer.from(
            await sharpMod(buf).jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer()
          )
          ext = 'jpg'
          contentType = 'image/jpeg'
        } else if (outputFormat === 'avif') {
          buf = Buffer.from(await sharpMod(buf).avif({ quality: 88, effort: 4 }).toBuffer())
          ext = 'avif'
          contentType = 'image/avif'
        } else {
          buf = Buffer.from(
            await sharpMod(buf).webp({ quality: 88, effort: 4, smartSubsample: true }).toBuffer()
          )
        }
      } catch {
        buf = Buffer.from(await sharpMod(buf).webp({ quality: 88 }).toBuffer())
        ext = 'webp'
        contentType = 'image/webp'
      }

      const mainPath = `processed/${userId}/${ts}_${i}.${ext}`
      const { error: upMain } = await supabase.storage
        .from('auction-images')
        .upload(mainPath, buf, { contentType, upsert: true })
      if (upMain) {
        return NextResponse.json({ success: false, error: upMain.message }, { status: 500 })
      }
      const mainUrl = supabase.storage.from('auction-images').getPublicUrl(mainPath).data.publicUrl

      let variants: { width: number; url: string }[] = []
      try {
        const vars = await imageEnhancerMod.generateResponsiveVariants(buf)
        for (let vi = 0; vi < vars.length; vi++) {
          const v = vars[vi]
          const vp = `processed/${userId}/${ts}_${i}_w${v.width}.webp`
          const { error: ve } = await supabase.storage
            .from('auction-images')
            .upload(vp, v.buffer, { contentType: 'image/webp', upsert: true })
          if (!ve) {
            variants.push({
              width: v.width,
              url: supabase.storage.from('auction-images').getPublicUrl(vp).data.publicUrl,
            })
          }
        }
      } catch {
        /* optional variants */
      }

      if (!thumbhash) {
        try {
          const { rgbaToThumbHash } = await import('thumbhash')
          const sharp = (await import('sharp')).default
          const { data, info } = await sharp(buf)
            .resize(100, 100, { fit: 'inside' })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true })
          const hash = rgbaToThumbHash(info.width, info.height, data)
          thumbhash = Buffer.from(hash).toString('base64')
        } catch {
          /* skip */
        }
      }

      results.push({
        url: mainUrl,
        thumbhash,
        sizes: variants,
        appliedSteps,
        compressionRatio,
        processingMs,
        originalFileSize: originalSize,
        enhancedFileSize: buf.length,
      })
    }

    return NextResponse.json({ success: true, images: results })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشل المسار الكامل'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
