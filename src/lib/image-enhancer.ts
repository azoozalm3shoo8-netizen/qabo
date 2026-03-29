/**
 * مسار تحسين الصور — خادم فقط (sharp)
 */

import fs from 'fs'
import sharp from 'sharp'
import { rgbaToThumbHash } from 'thumbhash'

export interface EnhanceOptions {
  sharpen?: boolean
  denoise?: boolean
  normalize?: boolean
  adjustBrightness?: boolean
  autoWhiteBalance?: boolean
  upscale?: boolean
  targetWidth?: number
  quality?: number
  outputFormat?: 'jpeg' | 'webp' | 'avif'
}

export interface EnhanceResult {
  buffer: Buffer
  format: string
  originalSize: { width: number; height: number }
  enhancedSize: { width: number; height: number }
  originalFileSize: number
  enhancedFileSize: number
  compressionRatio: number
  appliedSteps: string[]
  processingMs: number
  thumbhash?: string
}

function resolveOpts(o?: EnhanceOptions) {
  return {
    sharpen: o?.sharpen !== false,
    denoise: o?.denoise !== false,
    normalize: o?.normalize !== false,
    adjustBrightness: o?.adjustBrightness !== false,
    autoWhiteBalance: o?.autoWhiteBalance !== false,
    upscale: o?.upscale === true,
    targetWidth: o?.targetWidth ?? 1200,
    quality: o?.quality ?? 88,
    outputFormat: o?.outputFormat ?? 'webp',
  }
}

async function encodePipeline(
  pipeline: sharp.Sharp,
  format: 'jpeg' | 'webp' | 'avif',
  quality: number
): Promise<{ buffer: Buffer; format: string }> {
  const c = () => pipeline.clone()
  try {
    if (format === 'webp') {
      const buffer = await c().webp({ quality, effort: 4, smartSubsample: true }).toBuffer()
      return { buffer, format: 'webp' }
    }
    if (format === 'avif') {
      const buffer = await c().avif({ quality, effort: 4 }).toBuffer()
      return { buffer, format: 'avif' }
    }
    const buffer = await c()
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer()
    return { buffer, format: 'jpeg' }
  } catch {
    const buffer = await c().jpeg({ quality, mozjpeg: true }).toBuffer()
    return { buffer, format: 'jpeg' }
  }
}

async function computeThumbhashFromOutput(outputBuffer: Buffer): Promise<string | undefined> {
  try {
    const { data, info } = await sharp(outputBuffer)
      .resize(100, 100, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const hash = rgbaToThumbHash(info.width, info.height, data)
    return Buffer.from(hash).toString('base64')
  } catch {
    return undefined
  }
}

export async function enhanceImage(input: Buffer | string, options?: EnhanceOptions): Promise<EnhanceResult> {
  const t0 = Date.now()
  const opts = resolveOpts(options)
  const appliedSteps: string[] = []

  let originalFileSize: number
  let inputBuf: Buffer
  try {
    if (typeof input === 'string') {
      inputBuf = fs.readFileSync(input)
      originalFileSize = inputBuf.length
    } else {
      inputBuf = input
      originalFileSize = input.length
    }
  } catch (e) {
    throw e instanceof Error ? e : new Error('تعذر قراءة الصورة')
  }

  let pipeline = sharp(inputBuf).autoOrient()
  appliedSteps.push('autoOrient')

  const meta0 = await pipeline.metadata()
  const origW = meta0.width ?? 0
  const origH = meta0.height ?? 0

  if (opts.upscale && origW > 0 && origW < opts.targetWidth) {
    pipeline = pipeline.resize(opts.targetWidth, null, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    appliedSteps.push('upscale')
  }

  if (opts.denoise) {
    pipeline = pipeline.median(3)
    appliedSteps.push('denoise')
  }

  if (opts.normalize) {
    pipeline = pipeline.normalize({ lower: 1, upper: 99 })
    appliedSteps.push('normalize')
  }

  if (opts.adjustBrightness) {
    try {
      const stats = await pipeline.clone().stats()
      const mean = stats.channels[0]?.mean ?? 128
      if (mean < 80) {
        pipeline = pipeline.clahe({ width: 4, height: 4, maxSlope: 3 })
        appliedSteps.push('brightness_clahe_dark')
      } else if (mean > 200) {
        pipeline = pipeline.modulate({ brightness: 0.9 })
        appliedSteps.push('brightness_dim')
      } else {
        pipeline = pipeline.clahe({ width: 3, height: 3, maxSlope: 2 })
        appliedSteps.push('brightness_clahe_light')
      }
    } catch {
      appliedSteps.push('brightness_skip')
    }
  }

  if (opts.autoWhiteBalance) {
    pipeline = pipeline.gamma(1.1)
    appliedSteps.push('autoWhiteBalance')
  }

  if (opts.sharpen) {
    pipeline = pipeline.sharpen({ sigma: 1, m1: 0.8, m2: 2.5 })
    appliedSteps.push('sharpen')
  }

  pipeline = pipeline.modulate({ saturation: 1.08 })
  appliedSteps.push('saturation')

  const meta1 = await pipeline.metadata()
  const enc = await encodePipeline(pipeline.clone(), opts.outputFormat, opts.quality)
  const enhancedFileSize = enc.buffer.length
  const compressionRatio = enhancedFileSize > 0 ? originalFileSize / enhancedFileSize : 1

  const thumbhash = await computeThumbhashFromOutput(enc.buffer)

  return {
    buffer: enc.buffer,
    format: enc.format,
    originalSize: { width: origW, height: origH },
    enhancedSize: { width: meta1.width ?? origW, height: meta1.height ?? origH },
    originalFileSize,
    enhancedFileSize,
    compressionRatio,
    appliedSteps,
    processingMs: Date.now() - t0,
    thumbhash,
  }
}

export async function enhanceMultipleImages(
  inputs: (Buffer | string)[],
  options?: EnhanceOptions,
  concurrency = 3
): Promise<EnhanceResult[]> {
  const results: EnhanceResult[] = new Array(inputs.length)
  let next = 0

  async function worker() {
    for (;;) {
      const i = next++
      if (i >= inputs.length) break
      try {
        results[i] = await enhanceImage(inputs[i], options)
      } catch (e) {
        throw e instanceof Error ? e : new Error(`فشل تحسين الصورة ${i}`)
      }
    }
  }

  const n = Math.min(concurrency, Math.max(1, inputs.length))
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

export async function generateResponsiveVariants(
  input: Buffer,
  sizes: number[] = [320, 640, 960, 1200, 1600]
): Promise<{ width: number; buffer: Buffer; url?: string }[]> {
  const out: { width: number; buffer: Buffer; url?: string }[] = []
  for (const w of sizes) {
    try {
      const buffer = await sharp(input)
        .resize(w, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
      const meta = await sharp(buffer).metadata()
      out.push({ width: meta.width ?? w, buffer })
    } catch {
      /* skip size */
    }
  }
  return out
}
