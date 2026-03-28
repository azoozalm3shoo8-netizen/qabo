/**
 * فلترة جودة الفريمات — خادم فقط (sharp)
 */

import sharp from 'sharp'

export interface FrameQuality {
  path: string
  index: number
  sharpness: number
  brightness: number
  isValid: boolean
  rejectReason?: string
}

const LAPLACIAN_KERNEL = [0, -1, 0, -1, 4, -1, 0, -1, 0]

async function analyzeFrameQualityInner(
  framePath: string,
  index: number,
  sharpnessThreshold: number
): Promise<FrameQuality> {
  const statsBright = await sharp(framePath).greyscale().stats()
  const brightness = statsBright.channels[0]?.mean ?? 0

  const afterLap = await sharp(framePath)
    .greyscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: LAPLACIAN_KERNEL,
      scale: 1,
      offset: 0,
    })
    .stats()

  const sharpness = afterLap.channels[0]?.mean ?? 0

  const isValid = sharpness > sharpnessThreshold && brightness > 30 && brightness < 240
  let rejectReason: string | undefined
  if (!isValid) {
    if (sharpness <= sharpnessThreshold) rejectReason = 'صورة ضبابية'
    else if (brightness <= 30) rejectReason = 'صورة مظلمة جداً'
    else rejectReason = 'صورة ساطعة جداً (بيضاء)'
  }

  return { path: framePath, index, sharpness, brightness, isValid, rejectReason }
}

async function runPool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    for (;;) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

export async function analyzeFrameQuality(framePath: string, index: number): Promise<FrameQuality> {
  return analyzeFrameQualityInner(framePath, index, 5.0)
}

export async function filterFrames(
  framePaths: string[]
): Promise<{ valid: FrameQuality[]; rejected: FrameQuality[] }> {
  const run = async (threshold: number) => {
    const analyzed = await runPool(framePaths, 5, (p, i) =>
      analyzeFrameQualityInner(p, i, threshold)
    )
    const valid = analyzed.filter((x) => x.isValid)
    const rejected = analyzed.filter((x) => !x.isValid)
    return { valid, rejected }
  }

  let { valid, rejected } = await run(5.0)
  if (valid.length < 12) {
    const second = await run(3.0)
    valid = second.valid
    rejected = second.rejected
  }

  if (valid.length < 8) {
    throw new Error('جودة الفيديو منخفضة جداً، حاول التصوير في إضاءة أفضل')
  }

  valid.sort((a, b) => a.index - b.index)
  rejected.sort((a, b) => a.index - b.index)
  return { valid, rejected }
}
