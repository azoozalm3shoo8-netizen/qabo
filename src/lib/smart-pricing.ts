/** Platform-side smart starting bid — never expose full market estimate as "market value". */

const CATEGORY_BANDS: Record<string, { min: number; max: number }> = {
  ساعات: { min: 500, max: 200000 },
  إلكترونيات: { min: 100, max: 30000 },
  جوالات: { min: 200, max: 15000 },
  سيارات: { min: 10000, max: 1000000 },
  عقارات: { min: 100000, max: 10000000 },
  أثاث: { min: 100, max: 50000 },
  أزياء: { min: 50, max: 10000 },
  ملابس: { min: 50, max: 10000 },
  مجوهرات: { min: 200, max: 500000 },
  رياضة: { min: 50, max: 20000 },
  كتب: { min: 10, max: 500 },
  أخرى: { min: 50, max: 20000 },
}

const KEYWORD_PREMIUM: { keys: string[]; value: number }[] = [
  { keys: ['رولكس', 'rolex'], value: 25000 },
  { keys: ['آيفون 16', 'ايفون 16', 'iphone 16'], value: 5000 },
  { keys: ['ماك بوك', 'macbook'], value: 5000 },
  { keys: ['بلايستيشن 5', 'ps5', 'playstation 5'], value: 1800 },
  { keys: ['مرسيدس', 'mercedes'], value: 200000 },
  { keys: ['لكزس', 'lexus'], value: 150000 },
  { keys: ['بي ام', 'bmw'], value: 180000 },
  { keys: ['قوتشي', 'gucci'], value: 5000 },
  { keys: ['شانيل', 'chanel'], value: 10000 },
]

const CONDITION_MULT: Record<string, number> = {
  new: 1.0,
  refurbished: 0.85,
  used: 0.65,
  like_new: 0.85,
  good: 0.65,
  fair: 0.45,
  poor: 0.25,
}

function bandForCategory(category: string) {
  const c = category.trim()
  if (CATEGORY_BANDS[c]) return CATEGORY_BANDS[c]
  if (c.includes('إلكترون') || c.includes('هاتف') || c.includes('جوال')) return CATEGORY_BANDS['إلكترونيات']
  if (c.includes('سيارة')) return CATEGORY_BANDS['سيارات']
  if (c.includes('عقار')) return CATEGORY_BANDS['عقارات']
  if (c.includes('ساعة')) return CATEGORY_BANDS['ساعات']
  if (c.includes('أثاث')) return CATEGORY_BANDS['أثاث']
  if (c.includes('رياض')) return CATEGORY_BANDS['رياضة']
  return CATEGORY_BANDS['أخرى']
}

function keywordBoost(title: string): number | null {
  const t = title.toLowerCase()
  for (const row of KEYWORD_PREMIUM) {
    if (row.keys.some((k) => t.includes(k.toLowerCase()))) return row.value
  }
  return null
}

function roundClean(n: number) {
  if (n >= 10000) return Math.round(n / 500) * 500
  if (n >= 1000) return Math.round(n / 50) * 50
  if (n >= 100) return Math.round(n / 10) * 10
  return Math.max(10, Math.round(n))
}

export function computeSmartStartingBid(input: {
  category: string
  title: string
  condition: string
}): { suggestedStart: number; suggestedIncrement: number } {
  const band = bandForCategory(input.category)
  const mid = (band.min + band.max) / 2
  const boost = keywordBoost(input.title)
  const baseMarket = boost != null ? Math.min(boost, band.max) : mid
  const mult = CONDITION_MULT[input.condition] ?? 0.65
  const marketValue = Math.max(band.min, Math.min(band.max, baseMarket * mult))
  const suggestedStart = roundClean(marketValue * 0.3)
  const suggestedIncrement =
    suggestedStart >= 10000 ? 500 : suggestedStart >= 1000 ? 100 : suggestedStart >= 100 ? 50 : 10
  return { suggestedStart, suggestedIncrement }
}
