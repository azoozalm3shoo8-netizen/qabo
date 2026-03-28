/**
 * تعليم العيوب على الفريمات — خادم فقط (sharp)
 */

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import type { Defect } from '@/lib/video360-types'

function severityColor(sev: Defect['severity']): { stroke: string; width: number } {
  if (sev === 'minor') return { stroke: '#22c55e', width: 3 }
  if (sev === 'moderate') return { stroke: '#FF8C42', width: 3 }
  return { stroke: '#ef4444', width: 4 }
}

function buildSvgOverlay(
  width: number,
  height: number,
  defects: Defect[]
): Buffer {
  const rects: string[] = []
  const texts: string[] = []
  for (const d of defects) {
    if (!d.bbox) continue
    const { stroke, width: sw } = severityColor(d.severity)
    const px_x = Math.round((d.bbox.x * width) / 100)
    const px_y = Math.round((d.bbox.y * height) / 100)
    const px_w = Math.round((d.bbox.w * width) / 100)
    const px_h = Math.round((d.bbox.h * height) / 100)
    rects.push(
      `<rect x="${px_x}" y="${px_y}" width="${Math.max(1, px_w)}" height="${Math.max(1, px_h)}" fill="none" stroke="${stroke}" stroke-width="${sw}" rx="2"/>`
    )
    const label = `${d.type} (${d.severity})`
    const ty = Math.max(14, px_y - 4)
    texts.push(
      `<text x="${px_x}" y="${ty}" fill="${stroke}" font-size="14" font-family="Arial,sans-serif" font-weight="bold">${escapeXml(label)}</text>`
    )
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${rects.join('')}${texts.join('')}</svg>`
  return Buffer.from(svg, 'utf-8')
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function annotateFrame(framePath: string, defects: Defect[], outputPath: string): Promise<string> {
  const meta = await sharp(framePath).metadata()
  const width = meta.width ?? 800
  const height = meta.height ?? 600
  const svgBuf = buildSvgOverlay(width, height, defects)
  await sharp(framePath)
    .composite([{ input: svgBuf, top: 0, left: 0 }])
    .jpeg({ quality: 85 })
    .toFile(outputPath)
  return outputPath
}

export async function annotateAllFrames(
  framePaths: string[],
  defects: Defect[],
  outputDir: string
): Promise<string[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  const out: string[] = []
  for (let i = 0; i < framePaths.length; i++) {
    const src = framePaths[i]
    const base = `annotated_${(i + 1).toString().padStart(3, '0')}.jpg`
    const dest = path.join(outputDir, base)
    const frameDefects = defects.filter((d) => d.frame_index === i)
    if (frameDefects.length === 0) {
      await sharp(src).jpeg({ quality: 85 }).toFile(dest)
    } else {
      await annotateFrame(src, frameDefects, dest)
    }
    out.push(dest)
  }
  return out
}
