import type { SupabaseClient } from '@supabase/supabase-js'
import { paymentBreakdown } from '@/lib/payment-breakdown'

type AuctionOrderSeed = {
  id: string
  seller_id: string
  highest_bidder_id: string | null
  current_bid: number | string | null
}

/** إنشاء طلب pending إذا انتهى المزاد وفيه فائز ولا يوجد طلب بعد */
export async function ensurePendingOrderForAuction(
  supabase: SupabaseClient,
  auction: AuctionOrderSeed
): Promise<void> {
  if (!auction.highest_bidder_id) return

  const { data: existing, error: e0 } = await supabase
    .from('orders')
    .select('id')
    .eq('auction_id', auction.id)
    .maybeSingle()

  if (e0) {
    console.error('ensurePendingOrderForAuction select:', auction.id, e0.message)
    return
  }
  if (existing) return

  const bid = Number(auction.current_bid)
  if (!Number.isFinite(bid) || bid <= 0) {
    console.error('ensurePendingOrderForAuction invalid bid:', auction.id)
    return
  }

  const { productAmount, commission, vat, total } = paymentBreakdown(bid)

  const { error } = await supabase.from('orders').insert({
    auction_id: auction.id,
    buyer_id: auction.highest_bidder_id,
    seller_id: auction.seller_id,
    product_amount: productAmount,
    commission_amount: commission,
    vat_amount: vat,
    total_amount: total,
    status: 'pending',
  })

  if (error) console.error('ensurePendingOrderForAuction insert:', auction.id, error.message)
}

/** مزامنة كل المزادات المنتهية ذات الفائز دون طلب */
export async function syncPendingOrdersForEndedAuctions(supabase: SupabaseClient): Promise<void> {
  const { data: rows, error } = await supabase
    .from('auctions')
    .select('id, seller_id, highest_bidder_id, current_bid')
    .eq('status', 'ended')
    .not('highest_bidder_id', 'is', null)

  if (error) {
    console.error('syncPendingOrdersForEndedAuctions:', error.message)
    return
  }

  for (const a of rows ?? []) {
    await ensurePendingOrderForAuction(supabase, a)
  }
}
