import 'server-only'

import {
  EXTENSION_MS,
  MAX_AUCTION_EXTENSIONS,
  SNIPE_WINDOW_MS,
} from '@/lib/anti-snipe-constants'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

export { EXTENSION_MS, MAX_AUCTION_EXTENSIONS, SNIPE_WINDOW_MS } from '@/lib/anti-snipe-constants'

export type AntiSnipeResult = {
  extended: boolean
  newEndTime?: Date
  extensionCount?: number
}

/**
 * إن وقعت المزايدة خلال آخر دقيقتين ولم يُستنفد عدد التمديدات، يُمدَّد انتهاء المزاد 3 دقائق.
 */
export async function checkAndExtendAuction(
  auctionId: string,
  bidTime: Date
): Promise<AntiSnipeResult> {
  const supabase = createClient()
  try {
    const { data: auction, error } = await supabase
      .from('auctions')
      .select('ends_at, extension_count')
      .eq('id', auctionId)
      .maybeSingle()

    if (error) {
      console.error('[checkAndExtendAuction] select', error.message)
      return { extended: false }
    }
    if (!auction?.ends_at) return { extended: false }

    const endsAt = new Date(String(auction.ends_at))
    const diffMs = endsAt.getTime() - bidTime.getTime()
    const extCount = Number((auction as { extension_count?: number }).extension_count ?? 0)

    if (diffMs <= 0 || diffMs >= SNIPE_WINDOW_MS || extCount >= MAX_AUCTION_EXTENSIONS) {
      return { extended: false }
    }

    const newEnd = new Date(endsAt.getTime() + EXTENSION_MS)
    const nextCount = extCount + 1

    const { error: uErr } = await supabase
      .from('auctions')
      .update({
        ends_at: newEnd.toISOString(),
        extension_count: nextCount,
      })
      .eq('id', auctionId)

    if (uErr) {
      console.error('[checkAndExtendAuction] update', uErr.message)
      return { extended: false }
    }

    return { extended: true, newEndTime: newEnd, extensionCount: nextCount }
  } catch (e) {
    console.error('[checkAndExtendAuction]', e)
    return { extended: false }
  }
}

/** إشعار لجميع المزايدين بتمديد المزاد */
export async function notifyBiddersAuctionExtended(
  supabase: SupabaseClient,
  auctionId: string
): Promise<void> {
  try {
    const { data: rows, error } = await supabase
      .from('bids')
      .select('bidder_id')
      .eq('auction_id', auctionId)

    if (error) {
      console.error('[notifyBiddersAuctionExtended]', error.message)
      return
    }

    const ids = [...new Set((rows ?? []).map((r) => r.bidder_id as string).filter(Boolean))]
    const title = '⏰ تم تمديد المزاد'
    const body = '⏰ تم تمديد المزاد! مزايدة جديدة في اللحظات الأخيرة'

    for (const user_id of ids) {
      try {
        await insertFinancialNotification(supabase, {
          user_id,
          type: 'auction_extended',
          title,
          body,
          auction_id: auctionId,
        })
      } catch (e) {
        console.error('[notifyBiddersAuctionExtended] one user', user_id, e)
      }
    }
  } catch (e) {
    console.error('[notifyBiddersAuctionExtended]', e)
  }
}
