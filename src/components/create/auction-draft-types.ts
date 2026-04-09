/** بيانات مسودة المعالج — تُحفظ في localStorage كـ auction_draft */
export type AuctionDraftFormData = {
  imageUrls: string[]
  /** مسار التخزين لكل رابط (للحذف من السلة عند الحاجة) */
  imagePaths: string[]
  imageQuality: Record<string, 'good' | 'poor'>
  title: string
  category: string
  /** قيمة تُرسل لـ API: new | like_new | good | fair | refurbished */
  condition: string
  description: string
  startPriceRiyal: string
  buyNowRiyal: string
  durationHours: number
  deliveryShipping: boolean
  deliveryHandoff: boolean
  city: string
}

export const DRAFT_STORAGE_KEY = 'auction_draft'

export const DEFAULT_AUCTION_DRAFT: AuctionDraftFormData = {
  imageUrls: [],
  imagePaths: [],
  imageQuality: {},
  title: '',
  category: '',
  condition: 'new',
  description: '',
  startPriceRiyal: '',
  buyNowRiyal: '',
  durationHours: 24,
  deliveryShipping: false,
  deliveryHandoff: false,
  city: 'الرياض',
}

export function mapDeliveryToApi(d: AuctionDraftFormData): string {
  if (d.deliveryShipping && d.deliveryHandoff) return 'flexible'
  if (d.deliveryShipping) return 'delivery'
  if (d.deliveryHandoff) return 'pickup'
  return 'flexible'
}
