/**
 * إزالة الخلفية محلياً — خادم فقط (@imgly/background-removal-node)
 */

import sharp from 'sharp'

export interface RemoveBgResult {
  buffer: Buffer
  format: string
  originalSize: { width: number; height: number }
  processingMs: number
  success: boolean
  error?: string
}

const MAX_DIM = 5000

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const ab = await blob.arrayBuffer()
  return Buffer.from(ab)
}

function isOomMessage(msg: string): boolean {
  const m = msg.toLowerCase()
  return m.includes('memory') || m.includes('out of memory') || m.includes('allocation') || m.includes('heap')
}

/** تجهيز الصورة إذا تجاوزت الحد لحماية الذاكرة */
async function maybeDownscaleForModel(buf: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const meta = await sharp(buf).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  if (w <= MAX_DIM && h <= MAX_DIM) {
    return { buffer: buf, width: w, height: h }
  }
  const resized = await sharp(buf)
    .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer()
  const m2 = await sharp(resized).metadata()
  return { buffer: resized, width: m2.width ?? w, height: m2.height ?? h }
}

export async function removeImageBackground(
  input: Buffer | string,
  options?: { addWhiteBg?: boolean; addCustomBg?: string; outputFormat?: 'png' | 'webp' }
): Promise<RemoveBgResult> {
  const t0 = Date.now()
  let originalBuf: Buffer
  try {
    if (typeof input === 'string') {
      const fs = await import('fs')
      originalBuf = fs.readFileSync(input)
    } else {
      originalBuf = input
    }
  } catch (e) {
    return {
      buffer: Buffer.alloc(0),
      format: '',
      originalSize: { width: 0, height: 0 },
      processingMs: Date.now() - t0,
      success: false,
      error: e instanceof Error ? e.message : 'تعذر قراءة الملف',
    }
  }

  let meta: sharp.Metadata
  try {
    meta = await sharp(originalBuf).metadata()
  } catch (e) {
    return {
      buffer: originalBuf,
      format: 'original',
      originalSize: { width: 0, height: 0 },
      processingMs: Date.now() - t0,
      success: false,
      error: e instanceof Error ? e.message : 'صورة غير صالحة',
    }
  }

  const origW = meta.width ?? 0
  const origH = meta.height ?? 0

  try {
    const { removeBackground } = await import('@imgly/background-removal-node')
    const prepared = await maybeDownscaleForModel(originalBuf)
    const blob = new Blob([new Uint8Array(prepared.buffer)])
    const result = await removeBackground(blob, {
      model: 'small',
      output: { format: 'image/png', quality: 0.9 },
    })
    let buffer = await blobToBuffer(result)
    let fmt: string = 'png'

    if (options?.addWhiteBg) {
      buffer = await sharp(buffer).flatten({ background: '#FFFFFF' }).jpeg({ quality: 90 }).toBuffer()
      fmt = 'jpeg'
    } else if (options?.addCustomBg) {
      buffer = await sharp(buffer).flatten({ background: options.addCustomBg }).jpeg({ quality: 90 }).toBuffer()
      fmt = 'jpeg'
    } else if (options?.outputFormat === 'webp') {
      buffer = await sharp(buffer).webp({ quality: 85 }).toBuffer()
      fmt = 'webp'
    }

    return {
      buffer,
      format: fmt,
      originalSize: { width: origW, height: origH },
      processingMs: Date.now() - t0,
      success: true,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'فشلت إزالة الخلفية'
    return {
      buffer: originalBuf,
      format: 'original',
      originalSize: { width: origW, height: origH },
      processingMs: Date.now() - t0,
      success: false,
      error: isOomMessage(msg) ? 'نفاد الذاكرة أثناء إزالة الخلفية — تم إرجاع الصورة الأصلية' : msg,
    }
  }
}

export async function removeBackgroundBatch(
  inputs: (Buffer | string)[],
  options?: { addWhiteBg?: boolean; addCustomBg?: string; outputFormat?: 'png' | 'webp' }
): Promise<RemoveBgResult[]> {
  const out: RemoveBgResult[] = []
  for (let i = 0; i < inputs.length; i++) {
    try {
      out.push(await removeImageBackground(inputs[i], options))
    } catch {
      let originalBuf: Buffer
      try {
        if (typeof inputs[i] === 'string') {
          const fs = await import('fs')
          originalBuf = fs.readFileSync(inputs[i])
        } else {
          originalBuf = inputs[i] as Buffer
        }
      } catch {
        originalBuf = Buffer.alloc(0)
      }
      const meta = await sharp(originalBuf).metadata().catch(() => ({ width: 0, height: 0 }))
      out.push({
        buffer: originalBuf,
        format: 'original',
        originalSize: { width: meta.width ?? 0, height: meta.height ?? 0 },
        processingMs: 0,
        success: false,
        error: 'فشلت المعالجة',
      })
    }
    if (i < inputs.length - 1) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  return out
}
