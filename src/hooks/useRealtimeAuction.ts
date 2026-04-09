'use client'

import { useEffect, useRef, useState } from 'react'
import { playBidSound } from '@/lib/sound'
import { supabase } from '@/lib/supabase/client'

export type LiveBidRow = {
  id: string
  amount: number
  bidder_id: string
  created_at: string
}

type NewBidPayload = {
  current_bid_riyals?: number
  bid_count?: number
  bidder_display?: string
  is_auto_bid?: boolean
}

type ExtendedPayload = {
  new_ends_at?: string
  extension_number?: number
}

export function useRealtimeAuction(
  auctionId: string,
  initialCurrentBid: number,
  initialBidCount: number,
  initialHighestBidderId?: string | null,
  viewerUserId?: string | null
) {
  const [currentBid, setCurrentBid] = useState(initialCurrentBid)
  const [bidCount, setBidCount] = useState(initialBidCount)
  const [recentBids, setRecentBids] = useState<LiveBidRow[]>([])
  const [isLive, setIsLive] = useState(false)
  const [highestBidderId, setHighestBidderId] = useState<string | null>(initialHighestBidderId ?? null)
  const [watcherCount, setWatcherCount] = useState(0)
  const [lastExtendedAt, setLastExtendedAt] = useState<string | null>(null)
  const isFirstLoad = useRef(true)
  const presenceKey = useRef(
    viewerUserId || `anon_${typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Math.random())}`
  )

  useEffect(() => {
    setCurrentBid(initialCurrentBid)
    setBidCount(initialBidCount)
  }, [initialCurrentBid, initialBidCount, auctionId])

  useEffect(() => {
    if (!auctionId) return

    isFirstLoad.current = true
    setHighestBidderId(initialHighestBidderId ?? null)
    let cancelled = false

    const fetchBids = async () => {
      try {
        const { data } = await supabase
          .from('bids')
          .select('id, amount, bidder_id, created_at')
          .eq('auction_id', auctionId)
          .order('created_at', { ascending: false })
          .limit(20)

        if (cancelled || !data?.length) {
          isFirstLoad.current = false
          return
        }
        const top = data.reduce((m, r) => Math.max(m, Number(r.amount)), 0)
        setCurrentBid((prev) => Math.max(prev, Math.round(top / 100)))
        setRecentBids(data as LiveBidRow[])
        if (data.length > 0) {
          const topBid = data.reduce((best, r) => (Number(r.amount) > Number(best.amount) ? r : best), data[0])
          setHighestBidderId(topBid.bidder_id)
        }
        isFirstLoad.current = false
      } catch {
        isFirstLoad.current = false
      }
    }

    void fetchBids()

    const channel = supabase
      .channel(`auction:${auctionId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: presenceKey.current },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        (payload) => {
          const row = payload.new as LiveBidRow
          const amt = Number(row.amount)
          setCurrentBid((prev) => Math.max(prev, Math.round(amt / 100)))
          setBidCount((prev) => prev + 1)
          setRecentBids((prev) => [row, ...prev].slice(0, 20))
          if (!isFirstLoad.current) {
            playBidSound()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: `id=eq.${auctionId}`,
        },
        (payload) => {
          const row = payload.new as { highest_bidder_id?: string | null; ends_at?: string }
          if ('highest_bidder_id' in row) {
            setHighestBidderId(row.highest_bidder_id ?? null)
          }
          if (row.ends_at) {
            try {
              window.dispatchEvent(
                new CustomEvent('qabboo-auction-ends-updated', {
                  detail: { auctionId, ends_at: row.ends_at },
                })
              )
            } catch {
              /* ignore */
            }
          }
        }
      )
      .on('broadcast', { event: 'new_bid' }, ({ payload }) => {
        const p = payload as NewBidPayload
        if (p?.current_bid_riyals != null) {
          setCurrentBid((prev) => Math.max(prev, Number(p.current_bid_riyals)))
        }
        if (typeof p?.bid_count === 'number') {
          setBidCount(p.bid_count)
        }
        if (!isFirstLoad.current) {
          playBidSound()
        }
      })
      .on('broadcast', { event: 'auction_extended' }, ({ payload }) => {
        const p = payload as ExtendedPayload
        if (p?.new_ends_at) {
          setLastExtendedAt(p.new_ends_at)
          try {
            window.dispatchEvent(
              new CustomEvent('qabboo-auction-ends-updated', {
                detail: { auctionId, ends_at: p.new_ends_at },
              })
            )
          } catch {
            /* ignore */
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState()
          setWatcherCount(Object.keys(state).length)
        } catch {
          setWatcherCount(0)
        }
      })
      .subscribe(async (status) => {
        setIsLive(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({ joined_at: new Date().toISOString() })
          } catch {
            /* ignore */
          }
        }
      })

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [auctionId, initialHighestBidderId, viewerUserId])

  return { currentBid, bidCount, recentBids, isLive, highestBidderId, watcherCount, lastExtendedAt }
}
