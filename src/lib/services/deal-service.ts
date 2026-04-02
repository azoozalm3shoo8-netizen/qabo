import 'server-only'

import { createClient } from '@/lib/supabase-server'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { calculateCommission } from '@/lib/services/commission-service'
import {
  getFreePeriodInfo,
  incrementFreePeriodAnalytics,
  isDealFreePeriod,
  isFreePeriodActive,
} from '@/lib/services/free-period-service'
import {
  capturePayment,
  createAuthorization,
  createPayout,
  fetchPayment,
  voidPayment,
} from '@/lib/moyasar-client'
import type { DealRow } from '@/lib/types/financial-types'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function estimateMoyasarFeeHalalas(chargeHalalas: number): number {
  const pct = 0.025
  return Math.round(chargeHalalas * pct)
}

export async function createDeal(
  auctionId: string,
  winnerId: string,
  winningBidId: string
): Promise<{ data: { id: string } & Record<string, unknown> }> {
  const supabase = createClient()
  const { data: auction, error: aErr } = await supabase.from('auctions').select('*').eq('id', auctionId).maybeSingle()
  const { data: bid, error: bErr } = await supabase.from('bids').select('*').eq('id', winningBidId).maybeSingle()
  if (aErr || !auction) throw new Error('المزاد غير موجود')
  if (bErr || !bid) throw new Error('المزايدة غير موجودة')

  const salePrice = Math.round(Number(bid.amount))
  const sellerId = auction.seller_id as string

  const comm = await calculateCommission(salePrice, sellerId)
  const fpActive = await isFreePeriodActive()
  const fpInfo = fpActive ? await getFreePeriodInfo() : null

  const platform_metadata: Record<string, unknown> = {
    ...(comm.freePeriod
      ? { free_period: true, free_period_ends_at: fpInfo?.endsAt ?? comm.freePeriodEndsAt ?? null }
      : {}),
  }

  const row: Record<string, unknown> = {
    auction_id: auctionId,
    seller_id: sellerId,
    buyer_id: winnerId,
    sale_price: salePrice,
    total_buyer_charge: comm.totalBuyerCharge,
    seller_payout_amount: comm.sellerPayout,
    winning_bid_id: winningBidId,
    status: 'pending_payment',
    platform_metadata,
    free_period: Boolean(comm.freePeriod),
  }

  const { data: deal, error } = await supabase.from('deals').insert(row).select().single()
  if (error) throw new Error(error.message)

  if (comm.freePeriod) {
    await incrementFreePeriodAnalytics(supabase, { free_deals_count: 1 })
  }

  return { data: deal as { id: string } & Record<string, unknown> }
}

export async function processFullPayment(dealId: string, cardToken: string): Promise<{
  paymentId: string
  status: string
}> {
  const supabase = createClient()
  const { data: deal, error } = await supabase.from('deals').select('*').eq('id', dealId).maybeSingle()
  if (error || !deal) throw new Error('الصفقة غير موجودة')

  const amount = Math.round(Number(deal.total_buyer_charge))
  if (!Number.isFinite(amount) || amount < 1) throw new Error('مبلغ غير صالح')

  const free = Boolean(deal.free_period) || (await isDealFreePeriod(deal as DealRow))

  const payment = await createAuthorization({
    amount,
    token: cardToken,
    description: `دفع صفقة — ${dealId.slice(0, 8)}`,
    callbackUrl: `${APP_URL()}/api/payment/callback`,
    metadata: {
      deal_id: dealId,
      type: 'deal_full_payment',
      free_period: String(free),
    },
    idempotencyId: `deal-${dealId}-pay-${Date.now()}`,
  })

  const meta = {
    ...((deal.platform_metadata as Record<string, unknown> | null) ?? {}),
    free_period: free,
    ...(free ? { moyasar_fee_absorbed: true } : {}),
  }

  await supabase
    .from('deals')
    .update({
      full_payment_id: payment.id,
      full_payment_status: payment.status,
      platform_metadata: meta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId)

  if (free) {
    await incrementFreePeriodAnalytics(supabase, {
      moyasar_fees_absorbed_halalas: estimateMoyasarFeeHalalas(amount),
    })
  }

  await supabase.from('financial_transactions').insert({
    user_id: deal.buyer_id,
    auction_id: deal.auction_id as string,
    type: 'deal_full_payment',
    moyasar_payment_id: payment.id,
    amount,
    status: payment.status === 'authorized' ? 'authorized' : 'initiated',
    description: 'دفع كامل للصفقة',
    metadata: { ...meta, deal_id: dealId },
  })

  return { paymentId: payment.id, status: payment.status }
}

export async function initiatePayout(dealId: string): Promise<{ payoutId: string; status: string }> {
  const supabase = createClient()
  const { data: deal, error } = await supabase.from('deals').select('*').eq('id', dealId).maybeSingle()
  if (error || !deal) throw new Error('الصفقة غير موجودة')

  const sellerId = deal.seller_id as string
  const salePrice = Math.round(Number(deal.sale_price))
  let payoutAmount = Math.round(Number(deal.seller_payout_amount))

  const free = await isDealFreePeriod(deal as DealRow)
  if (free) {
    payoutAmount = salePrice
  }

  const { data: sp } = await supabase.from('seller_profiles').select('*').eq('user_id', sellerId).maybeSingle()
  if (!sp?.iban) throw new Error('أكمل بيانات التحويل البنكي في ملف البائع')

  const sourceId = process.env.MOYASAR_PAYOUT_SOURCE_ID
  if (!sourceId) throw new Error('MOYASAR_PAYOUT_SOURCE_ID غير مضبوط')

  const meta: Record<string, string> = {
    deal_id: dealId,
    free_period: free ? 'true' : 'false',
    moyasar_fee_absorbed: free ? 'true' : 'false',
  }

  const payout = await createPayout({
    sourceId,
    amount: payoutAmount,
    iban: sp.iban as string,
    beneficiaryName: (sp.iban_holder_name as string) || 'بائع',
    mobile: (sp.payout_mobile as string) || '0500000000',
    city: (sp.payout_city as string) || undefined,
    country: (sp.payout_country as string) || undefined,
    comment: `صرف صفقة ${dealId.slice(0, 8)}`,
    metadata: meta,
  })

  const pm = {
    ...((deal.platform_metadata as Record<string, unknown> | null) ?? {}),
    free_period: free,
    moyasar_fee_absorbed: free,
  }

  await supabase
    .from('deals')
    .update({
      seller_payout_id: payout.id,
      seller_payout_status: payout.status,
      seller_payout_amount: payoutAmount,
      platform_metadata: pm,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId)

  return { payoutId: payout.id, status: payout.status }
}

export async function acceptDeal(dealId: string): Promise<void> {
  const supabase = createClient()
  const { data: deal } = await supabase.from('deals').select('*').eq('id', dealId).maybeSingle()
  if (!deal?.full_payment_id) throw new Error('لا يوجد دفع مكتمل لهذه الصفقة')

  const pay = await fetchPayment(deal.full_payment_id as string)
  if (pay.status === 'authorized') {
    await capturePayment(deal.full_payment_id as string, Math.round(Number(deal.total_buyer_charge)))
  }

  const now = new Date().toISOString()
  await supabase
    .from('deals')
    .update({
      buyer_accepted_at: now,
      inspection_status: 'accepted',
      delivery_status: 'completed',
      updated_at: now,
    })
    .eq('id', dealId)

  await initiatePayout(dealId)
}

export async function rejectDeal(
  dealId: string,
  reason: string,
  evidenceUrls: string[]
): Promise<{ ok: boolean }> {
  const supabase = createClient()
  const { data: deal } = await supabase.from('deals').select('*').eq('id', dealId).maybeSingle()
  if (!deal) throw new Error('الصفقة غير موجودة')

  const pid = deal.full_payment_id as string | null
  if (pid) {
    try {
      await voidPayment(pid)
    } catch (e) {
      console.error('[rejectDeal void]', e)
    }
  }

  await supabase
    .from('deals')
    .update({
      status: 'cancelled',
      platform_metadata: {
        ...((deal.platform_metadata as Record<string, unknown> | null) ?? {}),
        reject_reason: reason,
        reject_evidence: evidenceUrls,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId)

  return { ok: true }
}

export async function autoAcceptExpiredInspections(): Promise<void> {
  const supabase = createClient()
  const now = new Date().toISOString()
  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, full_payment_id, seller_payout_id, inspection_ends_at, buyer_accepted_at')
    .not('inspection_ends_at', 'is', null)
    .lt('inspection_ends_at', now)
    .is('buyer_accepted_at', null)

  if (error) {
    console.warn('[autoAcceptExpiredInspections]', error.message)
    return
  }

  for (const d of deals ?? []) {
    if (!d.full_payment_id) continue
    try {
      await supabase
        .from('deals')
        .update({
          buyer_accepted_at: now,
          inspection_status: 'auto_accepted',
          updated_at: now,
        })
        .eq('id', d.id)
      if (!d.seller_payout_id) await initiatePayout(d.id as string)
    } catch (e) {
      console.error('[autoAcceptExpiredInspections]', d.id, e)
    }
  }
}
