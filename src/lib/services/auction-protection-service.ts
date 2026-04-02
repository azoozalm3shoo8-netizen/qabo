import 'server-only'

import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase-server'
import { capturePayment, createAuthorization, voidPayment } from '@/lib/moyasar-client'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const JUSTIFIED_CATEGORIES = new Set([
  'product_damaged',
  'buyer_no_pay',
  'description_error',
  'force_majeure',
])

const DEFAULT_TRUST_RULES = {
  sale_success: 5,
  cancel_unjustified: -20,
  cancel_justified: -5,
}

async function getSettingJson(key: string): Promise<unknown> {
  const supabase = createClient()
  const { data } = await supabase.from('platform_settings').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}

/** شرائح التأمين الافتراضية (هللات) — يمكن تخصيصها لاحقاً عبر platform_settings.seller_deposit_tiers */
export function calculateSellerDeposit(estimatedPrice: number): number {
  const price = Math.max(0, Math.round(estimatedPrice))
  if (price < 100_000) return 5_000
  if (price < 1_000_000) return 10_000
  if (price < 5_000_000) return 25_000
  return 50_000
}

export async function authorizeSellerDeposit(
  sellerId: string,
  auctionId: string,
  amount: number,
  token: string
): Promise<{ paymentId: string; status: string }> {
  const supabase = createClient()
  const payment = await createAuthorization({
    amount: Math.round(amount),
    token,
    description: `تأمين جدية بائع — مزاد ${auctionId.slice(0, 8)}`,
    callbackUrl: `${APP_URL()}/api/payment/callback`,
    metadata: {
      auction_id: auctionId,
      seller_id: sellerId,
      type: 'seller_deposit',
    },
    idempotencyId: `seller-dep-${auctionId}-${Date.now()}`,
  })

  const status =
    payment.status === 'authorized' || payment.status === 'paid' || payment.status === 'initiated'
      ? 'authorized'
      : 'pending'

  await supabase.from('financial_transactions').insert({
    user_id: sellerId,
    auction_id: auctionId,
    type: 'seller_deposit',
    moyasar_payment_id: payment.id,
    amount: Math.round(amount),
    status,
    description: 'تأمين جدية البائع',
    metadata: { auction_id: auctionId, type: 'seller_deposit' },
  })

  await supabase
    .from('auctions')
    .update({
      seller_deposit_payment_id: payment.id,
      seller_deposit_status: status,
      seller_deposit_halalas: Math.round(amount),
    })
    .eq('id', auctionId)

  return { paymentId: payment.id, status: payment.status }
}

export async function releaseSellerDeposit(auctionId: string): Promise<void> {
  const supabase = createClient()
  const { data: auction } = await supabase
    .from('auctions')
    .select('seller_deposit_payment_id')
    .eq('id', auctionId)
    .maybeSingle()

  const pid = auction?.seller_deposit_payment_id as string | null | undefined
  if (!pid) return

  try {
    await voidPayment(pid)
  } catch (e) {
    console.error('[releaseSellerDeposit]', auctionId, e)
  }

  await supabase
    .from('auctions')
    .update({ seller_deposit_status: 'voided' })
    .eq('id', auctionId)
}

export async function forfeitSellerDeposit(auctionId: string, reason: string): Promise<void> {
  const supabase = createClient()
  const { data: auction } = await supabase
    .from('auctions')
    .select('seller_deposit_payment_id, seller_deposit_halalas')
    .eq('id', auctionId)
    .maybeSingle()

  const pid = auction?.seller_deposit_payment_id as string | null | undefined
  const amt = Math.round(Number(auction?.seller_deposit_halalas ?? 0))
  if (!pid || amt < 1) {
    await supabase
      .from('auctions')
      .update({ seller_deposit_status: 'forfeited', cancellation_note: reason.slice(0, 500) })
      .eq('id', auctionId)
    return
  }

  try {
    await capturePayment(pid, amt)
  } catch (e) {
    console.error('[forfeitSellerDeposit capture]', auctionId, e)
    throw e instanceof Error ? e : new Error('فشل مصادرة التأمين')
  }

  await supabase
    .from('auctions')
    .update({ seller_deposit_status: 'forfeited', cancellation_note: reason.slice(0, 500) })
    .eq('id', auctionId)
}

function scoreToLevel(score: number): 'gold' | 'silver' | 'watch' | 'banned' {
  if (score >= 150) return 'gold'
  if (score >= 100) return 'silver'
  if (score >= 60) return 'watch'
  return 'banned'
}

async function getTrustDeltas(): Promise<typeof DEFAULT_TRUST_RULES> {
  const raw = await getSettingJson('trust_score_rules')
  if (!raw || typeof raw !== 'object') return DEFAULT_TRUST_RULES
  let v = raw as Record<string, unknown>
  if ('value' in v && v.value && typeof v.value === 'object' && v.value !== null) {
    v = v.value as Record<string, unknown>
  }
  const pick = (k: keyof typeof DEFAULT_TRUST_RULES) => {
    const n = Number(v[k])
    return Number.isFinite(n) ? n : DEFAULT_TRUST_RULES[k]
  }
  return {
    sale_success: pick('sale_success'),
    cancel_unjustified: pick('cancel_unjustified'),
    cancel_justified: pick('cancel_justified'),
  }
}

export async function updateTrustScore(
  sellerId: string,
  event: 'sale_success' | 'cancel_unjustified' | 'cancel_justified',
  auctionId: string
): Promise<{ newScore: number; newLevel: string }> {
  const supabase = createClient()
  const rules = await getTrustDeltas()
  let delta = 0
  if (event === 'sale_success') delta = rules.sale_success
  else if (event === 'cancel_unjustified') delta = rules.cancel_unjustified
  else delta = rules.cancel_justified

  const { data: profile } = await supabase.from('seller_profiles').select('*').eq('user_id', sellerId).maybeSingle()
  const current = Number(profile?.trust_score ?? 0)
  const newScore = Math.max(0, Math.min(200, Math.round(current + delta)))
  const newLevel = scoreToLevel(newScore)

  const { data: prof } = await supabase.from('seller_profiles').select('user_id').eq('user_id', sellerId).maybeSingle()
  if (prof) {
    await supabase
      .from('seller_profiles')
      .update({
        trust_score: newScore,
        trust_level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', sellerId)
  } else {
    await supabase.from('seller_profiles').insert({
      user_id: sellerId,
      trust_score: newScore,
      trust_level: newLevel,
    })
  }

  try {
    await supabase.from('financial_transactions').insert({
      user_id: sellerId,
      auction_id: auctionId,
      type: 'trust_adjustment',
      amount: Math.abs(delta),
      status: 'completed',
      description: `تعديل نقاط الثقة: ${event}`,
      metadata: { event, delta, auction_id: auctionId },
    })
  } catch (e) {
    console.warn('[updateTrustScore financial_transactions]', e)
  }

  return { newScore, newLevel }
}

function fingerprintFromListing(imageHashes: string[], titleNormalized: string, category: string): string {
  const sorted = [...imageHashes].sort().join('|')
  const base = `${sorted}::${titleNormalized.trim().toLowerCase()}::${category.trim().toLowerCase()}`
  return createHash('sha256').update(base, 'utf8').digest('hex')
}

export async function checkRelistingEligibility(
  sellerId: string,
  imageHashes: string[],
  titleNormalized: string,
  category: string
): Promise<{ eligible: boolean; count: number; fee: number; warning?: string }> {
  const supabase = createClient()
  const fp = fingerprintFromListing(imageHashes, titleNormalized, category)
  const since = new Date(Date.now() - 90 * 86400000).toISOString()

  const { data: rows, error } = await supabase
    .from('product_fingerprints')
    .select('id')
    .eq('seller_id', sellerId)
    .eq('fingerprint', fp)
    .gte('created_at', since)

  if (error) {
    console.warn('[checkRelistingEligibility]', error.message)
    return { eligible: true, count: 0, fee: 0 }
  }

  const count = (rows ?? []).length
  if (count === 0) return { eligible: true, count: 0, fee: 0 }
  if (count === 1) return { eligible: true, count: 1, fee: 2500 }
  if (count === 2) {
    return {
      eligible: true,
      count: 2,
      fee: 7500,
      warning: 'تكرار نفس المنتج — رسم إعادة إدراج أعلى',
    }
  }
  return {
    eligible: false,
    count,
    fee: 0,
    warning: 'تجاوزت الحد المسموح لإعادة نشر نفس المنتج خلال 90 يوماً',
  }
}

export async function handleAuctionCancellation(
  sellerId: string,
  auctionId: string,
  reason: string,
  reasonCategory: string,
  evidenceUrls: string[]
): Promise<{ trustChange: number; depositForfeited: boolean; newTrustScore: number }> {
  const supabase = createClient()
  const { data: auction, error: aErr } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
  if (aErr || !auction) throw new Error('المزاد غير موجود')
  if ((auction.seller_id as string) !== sellerId) throw new Error('غير مصرح بإلغاء هذا المزاد')

  const status = String(auction.status ?? '')
  if (['cancelled', 'sold', 'expired'].includes(status)) {
    throw new Error('لا يمكن إلغاء المزاد في حالته الحالية')
  }

  const justified = JUSTIFIED_CATEGORIES.has(reasonCategory)
  const rules = await getTrustDeltas()
  const delta = justified ? rules.cancel_justified : rules.cancel_unjustified

  const trustResult = await updateTrustScore(
    sellerId,
    justified ? 'cancel_justified' : 'cancel_unjustified',
    auctionId
  )

  let depositForfeited = false
  if (justified) {
    await releaseSellerDeposit(auctionId)
  } else {
    await forfeitSellerDeposit(auctionId, reason)
    depositForfeited = true
  }

  try {
    await supabase.from('seller_cancellation_log').insert({
      seller_id: sellerId,
      auction_id: auctionId,
      reason,
      reason_category: reasonCategory,
      evidence_urls: evidenceUrls,
      justified,
      trust_delta: delta,
      deposit_forfeited: depositForfeited,
    })
  } catch (e) {
    console.warn('[seller_cancellation_log]', e)
  }

  const { error: upErr } = await supabase
    .from('auctions')
    .update({
      status: 'cancelled',
      cancellation_reason: reason.slice(0, 1000),
      cancellation_category: reasonCategory,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auctionId)

  if (upErr) {
    await supabase.from('auctions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', auctionId)
  }

  return {
    trustChange: delta,
    depositForfeited,
    newTrustScore: trustResult.newScore,
  }
}
