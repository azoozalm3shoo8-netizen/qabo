export type DeliveryMethod = 'delivery' | 'pickup' | 'meeting_point' | 'flexible'

export interface DeliveryOption {
  id: DeliveryMethod
  label: string
  labelEn: string
  icon: string
  description: string
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'delivery',
    label: 'توصيل',
    labelEn: 'Delivery',
    icon: '🚚',
    description: 'توصيل السلعة لموقع المشتري داخل الرياض',
  },
  {
    id: 'pickup',
    label: 'استلام من البائع',
    labelEn: 'Pickup',
    icon: '📍',
    description: 'المشتري يستلم السلعة من موقع البائع',
  },
  {
    id: 'meeting_point',
    label: 'نقطة التقاء آمنة',
    labelEn: 'Safe Meeting Point',
    icon: '🏬',
    description: 'اقتراح مكان عام آمن في المنتصف',
  },
  {
    id: 'flexible',
    label: 'مرن — أي طريقة',
    labelEn: 'Flexible',
    icon: '✅',
    description: 'لا مانع من أي طريقة استلام',
  },
]

export const RIYADH_SAFE_POINTS = [
  { name: 'الرياض بارك', nameEn: 'Riyadh Park', lat: 24.7714, lng: 46.6272 },
  { name: 'النخيل مول', nameEn: 'Nakheel Mall', lat: 24.7908, lng: 46.6358 },
  { name: 'بانوراما مول', nameEn: 'Panorama Mall', lat: 24.6986, lng: 46.6873 },
  { name: 'حياة مول', nameEn: 'Hayat Mall', lat: 24.7634, lng: 46.7384 },
  { name: 'العثيم مول (الربوة)', nameEn: 'Othaim Mall Rabwa', lat: 24.7285, lng: 46.7195 },
  { name: 'غرناطة مول', nameEn: 'Granada Mall', lat: 24.7541, lng: 46.7221 },
  { name: 'مجمع الراشد', nameEn: 'Al Rashid Mall', lat: 24.6311, lng: 46.7128 },
  { name: 'الحمراء مول', nameEn: 'Al Hamra Mall', lat: 24.6745, lng: 46.6912 },
  { name: 'صحارى مول', nameEn: 'Sahara Mall', lat: 24.7421, lng: 46.7856 },
  { name: 'خريص مول', nameEn: 'Khurais Mall', lat: 24.7312, lng: 46.7934 },
] as const

export type SafePoint = (typeof RIYADH_SAFE_POINTS)[number]

export function suggestMeetingPoint(
  sellerLat: number,
  sellerLng: number,
  buyerLat: number,
  buyerLng: number
): SafePoint {
  const midLat = (sellerLat + buyerLat) / 2
  const midLng = (sellerLng + buyerLng) / 2

  let nearest = RIYADH_SAFE_POINTS[0]
  let minDist = Infinity

  for (const point of RIYADH_SAFE_POINTS) {
    const dist = Math.sqrt(Math.pow(point.lat - midLat, 2) + Math.pow(point.lng - midLng, 2))
    if (dist < minDist) {
      minDist = dist
      nearest = point
    }
  }

  return nearest
}
