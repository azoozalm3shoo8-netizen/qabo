/**
 * شارة ثقة على الصورة — خادم فقط
 */

import sharp from 'sharp'

export type TrustBadgeType = 'ai_verified' | 'ai_inspected' | 'seller_confirmed'
export type TrustBadgePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

function badgeSvg(size: number, badgeType: TrustBadgeType): string {
  const r = size / 2
  const cx = r
  const cy = r
  let fill = '#1B7F7A'
  let icon = '✓'
  let label = 'فحص AI'
  if (badgeType === 'ai_inspected') {
    fill = '#FF8C42'
    icon = '🔍'
    label = 'تم الفحص'
  } else if (badgeType === 'seller_confirmed') {
    fill = '#1B7F7A'
    icon = '✓✓'
    label = 'مؤكد'
  } else {
    fill = '#1B7F7A'
    icon = '✓'
    label = 'فحص AI'
  }

  const fs = Math.max(10, Math.round(size * 0.18))
  const pad = Math.round(size * 0.08)

  return `
<svg width="${size + pad * 2}" height="${size + pad * 2}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.25"/>
    </filter>
  </defs>
  <g transform="translate(${pad},${pad})" filter="url(#sh)">
    <circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="${fill}" opacity="0.92"/>
    <text x="${cx}" y="${cy - fs * 0.15}" text-anchor="middle" dominant-baseline="middle"
      fill="white" font-size="${Math.round(fs * 1.1)}" font-family="system-ui,sans-serif">${icon}</text>
    <rect x="0" y="${size - fs * 1.4}" width="${size}" height="${fs * 1.35}" rx="${fs * 0.2}" fill="rgba(0,0,0,0.45)"/>
    <text x="${cx}" y="${size - fs * 0.55}" text-anchor="middle" fill="white" font-size="${fs}" font-weight="700" font-family="system-ui,sans-serif">${label}</text>
  </g>
</svg>`
}

export async function addTrustBadge(
  imageBuffer: Buffer,
  badgeType: TrustBadgeType,
  position: TrustBadgePosition = 'bottom-right'
): Promise<Buffer> {
  try {
    const meta = await sharp(imageBuffer).metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    if (!width || !height) {
      return imageBuffer
    }

    const badgeSize = Math.round(Math.min(width, height) * 0.12)
    const svg = badgeSvg(badgeSize, badgeType)
    const badgeBuf = Buffer.from(svg)

    const overlay = await sharp(badgeBuf).png().toBuffer()
    const overlayMeta = await sharp(overlay).metadata()
    const bw = overlayMeta.width ?? badgeSize
    const bh = overlayMeta.height ?? badgeSize
    const margin = Math.round(Math.min(width, height) * 0.02)

    let left = width - bw - margin
    let top = height - bh - margin
    if (position === 'bottom-left') {
      left = margin
      top = height - bh - margin
    } else if (position === 'top-right') {
      left = width - bw - margin
      top = margin
    } else if (position === 'top-left') {
      left = margin
      top = margin
    }

    return await sharp(imageBuffer)
      .composite([{ input: overlay, left, top }])
      .toBuffer()
  } catch {
    return imageBuffer
  }
}
