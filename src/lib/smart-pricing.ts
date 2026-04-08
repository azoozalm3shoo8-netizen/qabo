/**
 * تسعير ذكي لمزادات C2C — جميع المبالغ بالريال السعودي (ر.س).
 *
 * الفلسفة: السعر الافتتاحي المقترح يجب أن يكون منخفضاً بما يكفي لجذب المزايدين؛
 * الأبحاث (مثل Kellogg/Northwestern) تشير إلى أن افتتاحاً منخفضاً يزيد الأسعار النهائية
 * عبر المنافسة. المنصة تستهدف بيعاً دون التجزئة — نجعل المشتري يشعر أن الفرصة "صفقة".
 *
 * النتائج حتمية 100% من المدخلات (لا عشوائية).
 */

/** معدلات الحالة: نسبة من السعر الأصلي أو من نقطة منتصف الفئة لتقدير القيمة السوقية العادلة */
const CONDITION_RATE: Record<'new' | 'like_new' | 'good' | 'fair' | 'poor', number> = {
  new: 0.85,
  like_new: 0.7,
  good: 0.5,
  fair: 0.3,
  poor: 0.15,
}

/** تسميات الحالة للعرض */
const CONDITION_AR: Record<'new' | 'like_new' | 'good' | 'fair' | 'poor', string> = {
  new: 'جديد',
  like_new: 'شبه جديد',
  good: 'جيد',
  fair: 'مقبول',
  poor: 'معطوب / للقطع',
}

/**
 * نقطة منتصف تقديرية للفئة (ر.س) عند عدم توفر سعر الشراء الأصلي
 */
const CATEGORY_MIDPOINT: Record<string, number> = {
  إلكترونيات: 1500,
  جوالات: 1800,
  سيارات: 85000,
  ساعات: 6000,
  مجوهرات: 12000,
  أثاث: 900,
  أزياء: 450,
  ملابس: 350,
  رياضة: 550,
  كتب: 90,
  عقارات: 450000,
  أخرى: 600,
}

/**
 * نسبة من القيمة السوقية المقدرة تُستخدم كسعر افتتاح أولي مقترح
 */
const CATEGORY_START_RATE: Record<string, number> = {
  إلكترونيات: 0.3,
  جوالات: 0.3,
  سيارات: 0.25,
  ساعات: 0.35,
  مجوهرات: 0.35,
  أثاث: 0.25,
  أزياء: 0.3,
  ملابس: 0.3,
  رياضة: 0.25,
  كتب: 0.25,
  عقارات: 0.2,
  أخرى: 0.3,
}

/**
 * حدود السعر الافتتاحي المقترح (ر.س) — أرضية وسقف حسب الفئة
 */
export const CATEGORY_BANDS: Record<string, { floor: number; ceiling: number }> = {
  إلكترونيات: { floor: 10, ceiling: 5000 },
  جوالات: { floor: 20, ceiling: 4000 },
  سيارات: { floor: 1000, ceiling: 100000 },
  ساعات: { floor: 50, ceiling: 30000 },
  مجوهرات: { floor: 50, ceiling: 50000 },
  أثاث: { floor: 10, ceiling: 5000 },
  أزياء: { floor: 10, ceiling: 3000 },
  ملابس: { floor: 5, ceiling: 2000 },
  رياضة: { floor: 5, ceiling: 3000 },
  كتب: { floor: 1, ceiling: 200 },
  عقارات: { floor: 10000, ceiling: 1000000 },
  أخرى: { floor: 5, ceiling: 5000 },
}

/**
 * مضاعفات الحالة للتوافق مع الكود القديم — تطابق نظام CONDITION_RATE أعلاه
 */
export const CONDITION_MULT: Record<string, number> = {
  new: 0.85,
  like_new: 0.7,
  good: 0.5,
  fair: 0.3,
  poor: 0.15,
  // أسماء قديمة شائعة
  new_sealed: 0.85,
  new_opened: 0.85,
  used: 0.5,
  refurbished: 0.7,
  acceptable: 0.3,
  for_parts: 0.15,
  damaged: 0.15,
}

const KEYWORD_PREMIUM_GROUPS: { patterns: string[]; mult: number }[] = [
  { patterns: ['رولكس', 'rolex', 'أوميغا', 'omega', 'باتيك', 'patek'], mult: 1.3 },
  { patterns: ['آيفون', 'ايفون', 'iphone'], mult: 1.15 },
  { patterns: ['ماك بوك', 'macbook', 'آيباد', 'ipad'], mult: 1.1 },
  {
    patterns: ['مرسيدس', 'mercedes', 'بي ام', 'bmw', 'لكزس', 'lexus', 'بورش', 'porsche'],
    mult: 1.2,
  },
  {
    patterns: ['قوتشي', 'gucci', 'شانيل', 'chanel', 'لويس فيتون', 'louis vuitton'],
    mult: 1.25,
  },
  { patterns: ['بلايستيشن', 'playstation', 'ps5', 'xbox'], mult: 1.1 },
  { patterns: ['تويوتا', 'toyota', 'هيونداي', 'hyundai', 'نيسان', 'nissan'], mult: 1.05 },
]

function normalizeText(s: string): string {
  return s.trim().toLowerCase()
}

/** يطابق أقصى دفعة من الكلمات المفتاحية (حتمي) */
function keywordPremiumMultiplier(title: string): { mult: number; matched: boolean } {
  const t = normalizeText(title)
  let best = 1
  let matched = false
  for (const g of KEYWORD_PREMIUM_GROUPS) {
    for (const p of g.patterns) {
      if (t.includes(normalizeText(p))) {
        if (g.mult > best) best = g.mult
        matched = true
      }
    }
  }
  return { mult: best, matched }
}

/** يحوّل اسم الفئة المدخل إلى مفتاح جدولنا */
function resolveCategoryKey(category: string): string {
  const c = category.trim()
  if (CATEGORY_MIDPOINT[c]) return c
  const n = normalizeText(c)
  if (n.includes('جوال') || n.includes('هاتف') || n.includes('هواتف')) return 'جوالات'
  if (n.includes('إلكترون') || n.includes('الكترون')) return 'إلكترونيات'
  if (n.includes('سيارة') || n.includes('سيارات') || n.includes('مركبة')) return 'سيارات'
  if (n.includes('ساعة') || n.includes('ساعات')) return 'ساعات'
  if (n.includes('مجوهر') || n.includes('ذهب') || n.includes('فضة')) return 'مجوهرات'
  if (n.includes('أثاث') || n.includes('اثاث')) return 'أثاث'
  if (n.includes('أزياء') || n.includes('ازياء') || n.includes('حقيبة')) return 'أزياء'
  if (n.includes('ملابس') || n.includes('قميص') || n.includes('حذاء')) return 'ملابس'
  if (n.includes('رياض') || n.includes('رياضة')) return 'رياضة'
  if (n.includes('كتاب') || n.includes('كتب')) return 'كتب'
  if (n.includes('عقار') || n.includes('شقة') || n.includes('فيلا')) return 'عقارات'
  return 'أخرى'
}

function normalizeCondition(
  condition: string
): 'new' | 'like_new' | 'good' | 'fair' | 'poor' {
  const k = condition.trim().toLowerCase()
  const map: Record<string, 'new' | 'like_new' | 'good' | 'fair' | 'poor'> = {
    new: 'new',
    'new_sealed': 'new',
    'new_opened': 'new',
    like_new: 'like_new',
    good: 'good',
    used: 'good',
    fair: 'fair',
    acceptable: 'fair',
    poor: 'poor',
    for_parts: 'poor',
    damaged: 'poor',
  }
  return map[k] ?? 'good'
}

/** تقريب "لطيف" حسب النطاق */
function roundNice(n: number): number {
  const x = Math.max(0, n)
  if (x < 100) return Math.round(x / 5) * 5
  if (x < 1000) return Math.round(x / 10) * 10
  if (x < 10000) return Math.round(x / 50) * 50
  if (x < 100000) return Math.round(x / 100) * 100
  return Math.round(x / 500) * 500
}

function minimumIncrementForStartingBid(startingBidBeforeRound: number): number {
  if (startingBidBeforeRound < 100) return 5
  if (startingBidBeforeRound < 1000) return 10
  if (startingBidBeforeRound < 10000) return 50
  return 100
}

function buildTips(input: {
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  originalPrice?: number
  startingBid: number
}): string[] {
  const generic =
    'السعر الافتتاحي المنخفض لا يعني بيعاً بخسارة — المنافسة بين المزايدين ترفع السعر النهائي'
  const acc: string[] = []
  if (input.condition === 'poor') {
    acc.push('المنتج بحالة معطوب — السعر الافتتاحي منخفض لجذب المهتمين بالقطع')
    acc.push('أضف صوراً واضحة للعيوب لزيادة الثقة')
  } else if (input.condition === 'new') {
    acc.push('منتج جديد! السعر الافتتاحي المنخفض يجذب مزايدين أكثر ويرفع السعر النهائي')
    acc.push('أضف صورة للتغليف الأصلي')
  }
  if (input.originalPrice == null || Number.isNaN(input.originalPrice)) {
    acc.push('إضافة سعر الشراء الأصلي يساعد في تقدير أدق للسعر')
  }
  if (input.startingBid < 50) {
    acc.push('المزادات بسعر افتتاحي منخفض تجذب مزايدين أكثر بنسبة تقارب 60%')
  }
  acc.push(generic)
  const uniq = [...new Set(acc)]
  if (uniq.length <= 3) return uniq
  const rest = uniq.filter((t) => t !== generic)
  return [...rest.slice(0, 2), generic]
}

export function suggestAuctionPricing(input: {
  category: string
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'
  title: string
  originalPrice?: number
}): {
  estimatedFMV: number
  suggestedStartingBid: number
  suggestedReservePrice: number
  minimumBidIncrement: number
  breakdown: {
    condition_ar: string
    conditionRate: number
    categoryStartRate: number
    keywordBoost: number | null
    originalPriceUsed: boolean
  }
  tips_ar: string[]
} {
  const catKey = resolveCategoryKey(input.category)
  const cond = normalizeCondition(String(input.condition))
  const rate = CONDITION_RATE[cond]
  const mid = CATEGORY_MIDPOINT[catKey] ?? CATEGORY_MIDPOINT['أخرى']
  const bands = CATEGORY_BANDS[catKey] ?? CATEGORY_BANDS['أخرى']
  const startRate = CATEGORY_START_RATE[catKey] ?? CATEGORY_START_RATE['أخرى']

  const op = input.originalPrice
  const originalPriceUsed = op != null && Number.isFinite(op) && op > 0
  let rawFmv = originalPriceUsed ? op! * rate : mid * rate

  const { mult: kwMult, matched: kwMatched } = keywordPremiumMultiplier(input.title)
  if (kwMatched) {
    rawFmv = rawFmv * kwMult
    /** حسب المواصفات: لا تتجاوز القيمة السوقية بعد الدفعة حد السقف للفئة (ر.س) */
    rawFmv = Math.min(rawFmv, bands.ceiling)
  }

  const rawStartingBid = rawFmv * startRate
  const rawReserve = rawFmv * 0.55
  const pctInc = roundNice(rawStartingBid * 0.1)
  const floorInc = minimumIncrementForStartingBid(rawStartingBid)
  let rawIncrement = Math.max(pctInc, floorInc)

  let estimatedFMV = roundNice(rawFmv)
  let suggestedStartingBid = roundNice(rawStartingBid)
  suggestedStartingBid = Math.max(bands.floor, Math.min(bands.ceiling, suggestedStartingBid))

  let suggestedReservePrice = roundNice(rawReserve)
  suggestedReservePrice = Math.max(bands.floor, suggestedReservePrice)

  let minimumBidIncrement = roundNice(rawIncrement)

  const tips = buildTips({
    condition: cond,
    originalPrice: originalPriceUsed ? op : undefined,
    startingBid: suggestedStartingBid,
  })

  return {
    estimatedFMV,
    suggestedStartingBid,
    suggestedReservePrice,
    minimumBidIncrement,
    breakdown: {
      condition_ar: CONDITION_AR[cond],
      conditionRate: rate,
      categoryStartRate: startRate,
      keywordBoost: kwMatched ? kwMult : null,
      originalPriceUsed,
    },
    tips_ar: tips,
  }
}

/**
 * @deprecated استخدم {@link suggestAuctionPricing} — محفوظ للتوافق مع كود قديم
 */
export function estimatePrice(
  originalPrice: number,
  condition: string,
  options?: { category?: string; title?: string }
): { suggested: number; min: number; max: number } {
  const cond = normalizeCondition(condition)
  const r = suggestAuctionPricing({
    category: options?.category ?? 'أخرى',
    condition: cond,
    title: options?.title ?? '',
    originalPrice,
  })
  return {
    suggested: r.suggestedStartingBid,
    min: Math.max(1, roundNice(r.suggestedStartingBid * 0.85)),
    max: roundNice(r.suggestedStartingBid * 1.15),
  }
}

/**
 * @deprecated استخدم {@link suggestAuctionPricing}
 */
export function computeSmartStartingBid(input: {
  category: string
  title: string
  condition: string
}): { suggestedStart: number; suggestedIncrement: number } {
  const r = suggestAuctionPricing({
    category: input.category,
    condition: normalizeCondition(input.condition),
    title: input.title,
  })
  return {
    suggestedStart: r.suggestedStartingBid,
    suggestedIncrement: r.minimumBidIncrement,
  }
}
