export const SAUDI_CITIES = [
  'الرياض',
  'جدة',
  'مكة المكرمة',
  'المدينة المنورة',
  'الدمام',
  'الخبر',
  'الظهران',
  'أبها',
  'تبوك',
  'حائل',
  'جازان',
  'نجران',
  'الباحة',
  'الجوف',
  'ينبع',
  'القطيف',
]

export type CategoryDef = { name: string; icon: string; slug: string }

/** Slug is URL-safe key; name matches auction.category values in DB */
export const CATEGORY_CATALOG: CategoryDef[] = [
  { slug: 'electronics', name: 'إلكترونيات', icon: '📱' },
  { slug: 'cars', name: 'سيارات', icon: '🚗' },
  { slug: 'realestate', name: 'عقارات', icon: '🏠' },
  { slug: 'fashion', name: 'أزياء', icon: '👔' },
  { slug: 'watches', name: 'ساعات', icon: '⌚' },
  { slug: 'furniture', name: 'أثاث', icon: '🛋️' },
  { slug: 'sports', name: 'رياضة', icon: '⚽' },
  { slug: 'books', name: 'كتب', icon: '📚' },
  { slug: 'other', name: 'أخرى', icon: '📦' },
]

export function categoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORY_CATALOG.find((c) => c.slug === slug)
}

export function categoryNameFromParam(param: string): string | null {
  try {
    const decoded = decodeURIComponent(param)
    const bySlug = categoryBySlug(decoded)
    if (bySlug) return bySlug.name
    const byName = CATEGORY_CATALOG.find((c) => c.name === decoded)
    return byName?.name ?? null
  } catch {
    return null
  }
}
