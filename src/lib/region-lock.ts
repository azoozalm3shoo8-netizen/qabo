export const ACTIVE_CITY = 'الرياض'
export const ACTIVE_CITY_EN = 'Riyadh'

export const REGION_CITIES = [
  { name: 'الرياض', nameEn: 'Riyadh', active: true },
  { name: 'جدة', nameEn: 'Jeddah', active: false },
  { name: 'مكة المكرمة', nameEn: 'Makkah', active: false },
  { name: 'المدينة المنورة', nameEn: 'Madinah', active: false },
  { name: 'الدمام', nameEn: 'Dammam', active: false },
  { name: 'الخبر', nameEn: 'Khobar', active: false },
  { name: 'أبها', nameEn: 'Abha', active: false },
  { name: 'تبوك', nameEn: 'Tabuk', active: false },
  { name: 'الطائف', nameEn: 'Taif', active: false },
  { name: 'بريدة', nameEn: 'Buraidah', active: false },
  { name: 'حائل', nameEn: 'Hail', active: false },
  { name: 'جازان', nameEn: 'Jazan', active: false },
  { name: 'نجران', nameEn: 'Najran', active: false },
] as const

export function isRegionActive(city: string): boolean {
  const t = city.trim()
  const found = REGION_CITIES.find(
    (c) => c.name === t || c.nameEn.toLowerCase() === t.toLowerCase()
  )
  return found?.active ?? false
}
