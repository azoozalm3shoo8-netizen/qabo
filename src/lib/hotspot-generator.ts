/**
 * توليد hotspots لـ Cloudimage 360
 */

import type { CI360Hotspot, Defect } from '@/lib/video360-types'

export type { CI360Hotspot }

export function severityAr(s: string): string {
  if (s === 'minor') return 'طفيف'
  if (s === 'moderate') return 'متوسط'
  if (s === 'major') return 'كبير'
  return s
}

function severityColorHtml(s: string): string {
  if (s === 'minor') return '#22c55e'
  if (s === 'moderate') return '#FF8C42'
  return '#ef4444'
}

export function generateHotspots(
  defects: Defect[],
  totalFrames: number,
  containerWidth: number,
  containerHeight: number
): CI360Hotspot[] {
  const list: CI360Hotspot[] = []
  let idx = 0
  for (const defect of defects) {
    if (!defect.bbox) continue
    const fi = Math.min(Math.max(0, defect.frame_index), Math.max(0, totalFrames - 1))
    const x = (defect.bbox.x * containerWidth) / 100
    const y = (defect.bbox.y * containerHeight) / 100
    const sevAr = severityAr(defect.severity)
    const color = severityColorHtml(defect.severity)
    const html = `<div dir="rtl" style="font-family:system-ui,Tahoma,sans-serif;max-width:220px;padding:8px;text-align:right;">
      <div style="font-weight:800;margin-bottom:6px;color:#1F2937;">${escapeHtml(defect.type)}</div>
      <div style="font-size:12px;color:${color};font-weight:700;margin-bottom:6px;">الشدة: ${escapeHtml(sevAr)}</div>
      <div style="font-size:13px;color:#374151;line-height:1.5;">${escapeHtml(defect.description_ar)}</div>
    </div>`
    list.push({
      id: `defect-${idx++}`,
      label: `${defect.type} (${sevAr})`,
      orientation: 'x',
      containerSize: [containerWidth, containerHeight],
      positions: { [fi]: { x, y } },
      content: html,
    })
  }
  return list
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
