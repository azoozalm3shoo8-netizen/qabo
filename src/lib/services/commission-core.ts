import { createClient } from '@/lib/supabase-server'
import type { CommissionCalculation, CommissionTier, SellerProfileRow } from '@/lib/types/financial-types'

function pickTier(tiers: CommissionTier[], salePrice: number): CommissionTier | null {
  const active = tiers.filter((t) => t.is_active).sort((a, b) => a.min_amount - b.min_amount)
  for (const t of active) {
    if (salePrice < t.min_amount) continue
    if (t.max_amount != null && salePrice > t.max_amount) continue
    return t
  }
  return active.length ? active[active.length - 1] : null
}

function applySellerRateDiscounts(
  baseRate: number,
  profile: SellerProfileRow,
  options?: { isProSubscriber?: boolean }
): number {
  let r = baseRate
  if (profile.trust_level === 'gold') {
    r = Math.max(0.01, r - 0.01)
  }
  const pro = options?.isProSubscriber ?? profile.is_pro_subscriber
  if (pro) {
    r = Math.max(0.01, r - 0.02)
  }
  if (profile.commission_discount > 0) {
    r = Math.max(0.01, r - Number(profile.commission_discount))
  }
  return r
}

export async function calculateCommissionFromDatabase(
  salePrice: number,
  sellerId: string,
  options?: { isProSubscriber?: boolean }
): Promise<CommissionCalculation> {
  const supabase = createClient()
  const { data: tiersData, error: te } = await supabase
    .from('commission_tiers')
    .select('*')
    .eq('is_active', true)
    .order('min_amount', { ascending: true })
  if (te) throw new Error(te.message)

  const tier = pickTier((tiersData ?? []) as CommissionTier[], salePrice)
  if (!tier) {
    throw new Error('لا توجد شريحة عمولة مفعّلة')
  }

  let profile: SellerProfileRow | null = null
  const { data: prof } = await supabase.from('seller_profiles').select('*').eq('user_id', sellerId).maybeSingle()
  profile = prof as SellerProfileRow | null

  if (!profile) {
    const { data: inserted, error: insE } = await supabase
      .from('seller_profiles')
      .insert({ user_id: sellerId })
      .select()
      .single()
    if (insE) throw new Error(insE.message)
    profile = inserted as SellerProfileRow
  }

  const sellerRate = applySellerRateDiscounts(Number(tier.seller_rate), profile, options)
  const sellerCommission = Math.round(salePrice * sellerRate)

  let buyerProtection = 0
  if (tier.tier_name === 'micro' || Number(tier.buyer_flat_fee) > 0) {
    buyerProtection = Math.round(Number(tier.buyer_flat_fee))
  } else {
    const pct = Number(tier.buyer_protection_rate)
    buyerProtection = Math.round(salePrice * pct)
    const cap = tier.buyer_protection_cap
    if (cap != null && buyerProtection > cap) buyerProtection = cap
  }

  const totalBuyerCharge = salePrice + buyerProtection
  const sellerPayout = salePrice - sellerCommission
  const platformRevenue = sellerCommission + buyerProtection

  const breakdown: CommissionCalculation['breakdown'] = [
    { label_ar: 'سعر المنتج', amount: salePrice, who_pays: 'buyer' },
    {
      label_ar: `عمولة البائع (${(sellerRate * 100).toFixed(2)}٪)`,
      amount: sellerCommission,
      who_pays: 'seller',
    },
    { label_ar: 'رسم حماية المشتري', amount: buyerProtection, who_pays: 'buyer' },
    { label_ar: 'إجمالي على المشتري', amount: totalBuyerCharge, who_pays: 'buyer' },
    { label_ar: 'صافي البائع بعد العمولة', amount: sellerPayout, who_pays: 'seller' },
    { label_ar: 'إيراد المنصة', amount: platformRevenue, who_pays: 'platform' },
  ]

  return {
    salePrice,
    tierName: tier.tier_name,
    sellerRate,
    sellerCommission,
    buyerProtection,
    totalBuyerCharge,
    sellerPayout,
    platformRevenue,
    breakdown,
  }
}

export async function getCommissionTiers(): Promise<CommissionTier[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('commission_tiers')
    .select('*')
    .eq('is_active', true)
    .order('min_amount', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CommissionTier[]
}

export function formatHalalat(halalat: number): string {
  const riyals = halalat / 100
  const formatted = riyals.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted} ر.س`
}

const CONDITION_MULT: Record<string, number> = {
  new_sealed: 0.9,
  new_opened: 0.8,
  like_new: 0.7,
  good: 0.6,
  acceptable: 0.45,
  for_parts: 0.2,
  damaged: 0.25,
}

export function estimatePrice(
  originalPrice: number,
  condition: string
): { suggested: number; min: number; max: number } {
  const mult = CONDITION_MULT[condition] ?? 0.6
  const suggested = Math.round(originalPrice * mult)
  return {
    suggested,
    min: Math.round(suggested * 0.85),
    max: Math.round(suggested * 1.15),
  }
}
