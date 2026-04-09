/**
 * المبالغ في قاعدة البيانات: غالباً **هللات** لجدول `bids.amount`، و**ريال** (عدد صحيح) لـ `auctions.current_bid` / `start_price` في هذا المشروع.
 */

export function toHalala(riyal: number): number {
  return Math.round(riyal * 100)
}

export function toRiyal(halala: number): number {
  return halala / 100
}

/**
 * @param amount القيمة الرقمية
 * @param isHalala إذا true يُعامل `amount` كهللات؛ إذا false كريال
 * @param locale لغة التنسيق
 */
export function formatSAR(amount: number, isHalala: boolean = true, locale: string = 'ar-SA'): string {
  const riyal = isHalala ? toRiyal(amount) : amount
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(riyal)
}

/** عرض مختصر للبطاقات (مبلغ بالهللات) */
export function formatCompact(halala: number): string {
  const riyal = toRiyal(halala)
  if (riyal >= 1_000_000) return `${(riyal / 1_000_000).toFixed(1)}M ر.س`
  if (riyal >= 1000) return `${(riyal / 1000).toFixed(1)}K ر.س`
  return formatSAR(halala, true)
}

/** عندما يكون الرقم بالريال (عدد صحيح من العمود) */
export function formatSARFromRiyalInteger(riyalInteger: number, locale?: string): string {
  return formatSAR(riyalInteger, false, locale ?? 'ar-SA')
}
