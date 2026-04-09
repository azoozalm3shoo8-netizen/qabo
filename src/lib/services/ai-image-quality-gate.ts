import 'server-only'

import sharp from 'sharp'

export type ImageQualityReport = {
  isAcceptable: boolean
  score: number
  issues: string[]
  suggestions: string[]
}

/**
 * فحص جودة الصورة محلياً (sharp) — بدون API خارجي.
 */
export async function assessImageQuality(buffer: Buffer): Promise<ImageQualityReport> {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100

  try {
    const metadata = await sharp(buffer).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0
    const fileSize = metadata.size ?? buffer.length

    if (!width || !height) {
      return { isAcceptable: false, score: 0, issues: ['لا يمكن قراءة أبعاد الصورة'], suggestions: ['أعد رفع ملفاً صالحاً'] }
    }

    if (width < 400 || height < 400) {
      score -= 40
      issues.push('دقة منخفضة (أقل من 400×400)')
      suggestions.push('استخدم صورة أكبر')
    } else if (width < 800 || height < 800) {
      score -= 15
      issues.push('الدقة متوسطة')
      suggestions.push('صور أوضح تجذب مزايدين أكثر')
    }

    const { data: grayData, info } = await sharp(buffer).grayscale().raw().toBuffer({ resolveWithObject: true })
    const w = info.width
    const h = info.height
    const pixels = new Uint8Array(grayData)
    let laplacianSum = 0
    let count = 0
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x
        const laplacian = Math.abs(
          -pixels[idx - w]! - pixels[idx - 1]! + 4 * pixels[idx]! - pixels[idx + 1]! - pixels[idx + w]!
        )
        laplacianSum += laplacian * laplacian
        count++
      }
    }
    const variance = count > 0 ? laplacianSum / count : 0

    if (variance < 100) {
      score -= 35
      issues.push('الصورة قد تكون ضبابية')
      suggestions.push('ثبّت الكاميرا واستخدم إضاءة جيدة')
    } else if (variance < 300) {
      score -= 15
      issues.push('الحدة متوسطة')
    }

    const ratio = width / height
    if (ratio > 3 || ratio < 0.33) {
      score -= 20
      issues.push('نسبة أبعاد غير معتادة')
      suggestions.push('جرّب صورة 4:3 أو مربعة')
    }

    if (fileSize < 10_000) {
      score -= 20
      issues.push('حجم الملف صغير جداً')
    }

    score = Math.max(0, Math.min(100, score))

    return {
      isAcceptable: score >= 40,
      score,
      issues,
      suggestions: suggestions.length ? suggestions : ['جودة مقبولة'],
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return {
      isAcceptable: false,
      score: 0,
      issues: [`تعذر تحليل الصورة: ${msg}`],
      suggestions: ['جرّب صيغة JPEG أو PNG'],
    }
  }
}
