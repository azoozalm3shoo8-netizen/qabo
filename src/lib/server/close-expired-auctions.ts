import type { SupabaseClient } from '@supabase/supabase-js'
import { ensurePendingOrderForAuction } from '@/lib/server/ensure-order-for-auction'

/** Only touches this auction row — use on detail GET instead of scanning all auctions */
export async function closeAuctionIfExpiredForId(supabase: SupabaseClient, auctionId: string) {
  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('auctions')
    .update({ status: 'ended' })
    .eq('id', auctionId)
    .eq('status', 'active')
    .lt('ends_at', now)
    .select('id, seller_id, highest_bidder_id, title, current_bid')
    .maybeSingle()

  if (error || !updated) return

  const notifications: {
    user_id: string
    type: string
    title: string
    message: string
    auction_id: string
  }[] = [
    {
      user_id: updated.seller_id,
      type: 'auction_ended',
      title: 'انتهى المزاد',
      message: `انتهى مزادك: ${updated.title}`,
      auction_id: updated.id,
    },
  ]
  if (updated.highest_bidder_id) {
    notifications.push({
      user_id: updated.highest_bidder_id,
      type: 'auction_won',
      title: 'فزت بالمزاد',
      message: `تهانينا! فزت بالمزاد: ${updated.title}`,
      auction_id: updated.id,
    })
  }
  const { error: nErr } = await supabase.from('notifications').insert(notifications)
  if (nErr) console.error('closeAuctionIfExpiredForId notifications:', nErr.message)

  await ensurePendingOrderForAuction(supabase, {
    id: updated.id,
    seller_id: updated.seller_id,
    highest_bidder_id: updated.highest_bidder_id,
    current_bid: updated.current_bid,
  })
}

export async function closeExpiredAuctions(supabase: SupabaseClient) {
  const now = new Date().toISOString()
  const { data: ended, error } = await supabase
    .from('auctions')
    .update({ status: 'ended' })
    .eq('status', 'active')
    .lt('ends_at', now)
    .select('id, seller_id, highest_bidder_id, title, current_bid')

  if (error || !ended?.length) return

  const notifications: {
    user_id: string
    type: string
    title: string
    message: string
    auction_id: string
  }[] = []

  for (const a of ended) {
    notifications.push({
      user_id: a.seller_id,
      type: 'auction_ended',
      title: 'انتهى المزاد',
      message: `انتهى مزادك: ${a.title}`,
      auction_id: a.id,
    })
    if (a.highest_bidder_id) {
      notifications.push({
        user_id: a.highest_bidder_id,
        type: 'auction_won',
        title: 'فزت بالمزاد',
        message: `تهانينا! فزت بالمزاد: ${a.title}`,
        auction_id: a.id,
      })
    }
  }

  if (notifications.length) {
    const { error: nErr } = await supabase.from('notifications').insert(notifications)
    if (nErr) console.error('closeExpiredAuctions notifications:', nErr.message)
  }

  for (const a of ended) {
    await ensurePendingOrderForAuction(supabase, {
      id: a.id,
      seller_id: a.seller_id,
      highest_bidder_id: a.highest_bidder_id,
      current_bid: a.current_bid,
    })
  }
}
