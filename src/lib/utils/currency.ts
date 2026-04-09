/**
 * المبالغ في قاعدة البيانات والـ API يُفضَّل اعتبارها **هللات** (100 = 1 ر.س) للمنطق الجديد.
 * بعض الحقول القديمة (مثل current_bid في جدول auctions) قد تُخزَّن بالريال — راجع الاستعلام قبل العرض.
 */

export function toHalala(riyal: number): number {
  return Math.round(riyal * 100)
}

export function toRiyal(halala: number): number {
  return halala / 100
}

/** تنسيق مبلغ مُخزَّن بالهللات */
export function formatSAR(halala: number, locale: string = 'ar-SA'): string {
  const riyal = toRiyal(halala)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(riyal)
}

/** عرض مختصر للبطاقات */
export function formatCompact(halala: number): string {
  const riyal = toRiyal(halala)
  if (riyal >= 1_000_000) return `${(riyal / 1_000_000).toFixed(1)}M ر.س`
  if (riyal >= 1000) return `${(riyal / 1000).toFixed(1)}K ر.س`
  return formatSAR(halala)
}

/** عندما يكون الرقم في DB بالريال (عدد صحيح) وتحتاج عرضاً موحّداً بالهللات */
export function formatSARFromRiyalInteger(riyalInteger: number, locale?: string): string {
  return formatSAR(toHalala(riyalInteger), locale)
}
