/** أنواع مشتركة للأنظمة المالية والمزادات — المبالغ بالهللات ما لم يُذكر غير ذلك */

export type WhoPays = 'buyer' | 'seller' | 'platform'

export interface CommissionBreakdownLine {
  label_ar: string
  amount: number
  who_pays: WhoPays
}

export interface CommissionCalculation {
  salePrice: number
  tierName: string
  sellerRate: number
  sellerCommission: number
  buyerProtection: number
  totalBuyerCharge: number
  sellerPayout: number
  platformRevenue: number
  breakdown: CommissionBreakdownLine[]
  freePeriod?: boolean
  freePeriodEndsAt?: string | null
}

export interface CommissionTier {
  id: string
  tier_name: string
  min_amount: number
  max_amount: number | null
  seller_rate: number
  buyer_protection_rate: number
  buyer_protection_cap: number | null
  buyer_flat_fee: number
  is_active: boolean
}

export interface SellerProfileRow {
  id: string
  user_id: string
  trust_score: number
  trust_level: 'gold' | 'silver' | 'watch' | 'banned'
  total_sales: number
  successful_sales: number
  cancelled_sales: number
  unjustified_cancellations: number
  total_revenue: number
  commission_discount: number
  is_pro_subscriber: boolean
  pro_expires_at: string | null
  iban: string | null
  iban_holder_name: string | null
  iban_verified: boolean
  payout_mobile: string | null
  payout_city: string | null
  payout_country: string | null
}

export type MoyasarPaymentStatus =
  | 'initiated'
  | 'paid'
  | 'authorized'
  | 'failed'
  | 'refunded'
  | 'captured'
  | 'voided'
  | 'verified'

export interface MoyasarPaymentSource {
  type?: string
  company?: string
  name?: string
  number?: string
  token?: string
  message?: string
  transaction_url?: string
}

export interface MoyasarPayment {
  id: string
  status: MoyasarPaymentStatus
  amount: number
  fee?: number
  currency: string
  refunded?: number
  captured?: number
  voided_at?: string | null
  source?: MoyasarPaymentSource
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface MoyasarToken {
  id: string
  status?: string
  brand?: string
  funding?: string
  country?: string
  month?: number
  year?: number
  name?: string
  last_four?: string
  created_at?: string
}

export type MoyasarPayoutStatus = 'queued' | 'initiated' | 'paid' | 'failed' | 'canceled' | 'returned'

export interface MoyasarPayout {
  id: string
  source_id?: string
  status: MoyasarPayoutStatus
  amount: number
  currency: string
  purpose?: string
  destination?: unknown
  message?: string
  failure_reason?: string
  created_at?: string
}

export type BidRow = Record<string, unknown> & {
  id: string
  auction_id: string
  bidder_id: string
  amount: number
}

export type DealRow = Record<string, unknown> & {
  id: string
  auction_id: string
  seller_id: string
  buyer_id: string
  sale_price: number
  total_buyer_charge: number
  seller_payout_amount: number
  full_payment_id?: string | null
  full_payment_status?: string | null
  winning_bid_id?: string | null
  delivery_method?: string | null
  delivery_status?: string | null
  handover_code?: string | null
  safe_zone_id?: string | null
  inspection_starts_at?: string | null
  inspection_ends_at?: string | null
  inspection_status?: string | null
  buyer_accepted_at?: string | null
  seller_payout_id?: string | null
  seller_payout_status?: string | null
  seller_payout_at?: string | null
  status?: string | null
  platform_metadata?: Record<string, unknown> | null
  free_period?: boolean | null
}

export type DisputeRow = Record<string, unknown> & {
  id: string
  deal_id: string
  status: string
  level: number
}
