const RANGES: Record<string, { min: number; max: number }> = {
  إلكترونيات: { min: 500, max: 15000 },
  سيارات: { min: 20000, max: 500000 },
  عقارات: { min: 100000, max: 5000000 },
  ساعات: { min: 200, max: 50000 },
  أثاث: { min: 100, max: 10000 },
  أزياء: { min: 50, max: 5000 },
  رياضة: { min: 50, max: 3000 },
  كتب: { min: 10, max: 500 },
  أخرى: { min: 50, max: 20000 },
}

function hashFromString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function estimatePrice(
  category: string,
  title: string
): { min: number; max: number; avg: number } {
  const r = RANGES[category] ?? RANGES['أخرى']
  const span = r.max - r.min
  const t = title.trim()
  const h = t ? hashFromString(t) : 0
  const f = span > 0 ? (h % 1000) / 1000 : 0.5
  const min = Math.round(r.min + f * span * 0.15)
  const max = Math.round(r.max - (1 - f) * span * 0.1)
  const avg = Math.round((min + max) / 2)
  return { min, max: Math.max(max, min + 1), avg }
}
