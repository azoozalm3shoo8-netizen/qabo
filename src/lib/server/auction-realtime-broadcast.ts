import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * بث فوري لقناة المزاد (Realtime Broadcast) — لا يُعطّل المسار عند الفشل.
 */
export async function broadcastAuctionPayload(
  auctionId: string,
  event: 'new_bid' | 'auction_extended',
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const channelName = `auction:${auctionId}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    })

    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        void supabase.removeChannel(channel)
        resolve()
      }, 4000)

      channel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return
        try {
          await channel.send({
            type: 'broadcast',
            event,
            payload,
          })
        } catch (e) {
          console.error('[broadcastAuctionPayload] send', e)
        } finally {
          clearTimeout(t)
          void supabase.removeChannel(channel)
          resolve()
        }
      })
    })
  } catch (e) {
    console.error('[broadcastAuctionPayload]', e)
  }
}
