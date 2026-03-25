'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export type LiveBidRow = {
  id: string
  amount: number
  bidder_id: string
  created_at: string
}

export function useRealtimeAuction(
  auctionId: string,
  initialCurrentBid: number,
  initialBidCount: number
) {
  const [currentBid, setCurrentBid] = useState(initialCurrentBid)
  const [bidCount, setBidCount] = useState(initialBidCount)
  const [recentBids, setRecentBids] = useState<LiveBidRow[]>([])
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    setCurrentBid(initialCurrentBid)
    setBidCount(initialBidCount)
  }, [initialCurrentBid, initialBidCount, auctionId])

  useEffect(() => {
    if (!auctionId) return

    let cancelled = false

    const fetchBids = async () => {
      const { data } = await supabase
        .from('bids')
        .select('id, amount, bidder_id, created_at')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (cancelled || !data?.length) return
      const top = data.reduce((m, r) => Math.max(m, Number(r.amount)), 0)
      setCurrentBid((prev) => Math.max(prev, top))
      setRecentBids(data as LiveBidRow[])
    }

    void fetchBids()

    const channel = supabase
      .channel(`auction-live-${auctionId}`)
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
          setCurrentBid((prev) => Math.max(prev, amt))
          setBidCount((prev) => prev + 1)
          setRecentBids((prev) => [row, ...prev].slice(0, 20))
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.value = 0.12
            osc.start()
            osc.stop(ctx.currentTime + 0.12)
          } catch {
            /* ignore */
          }
        }
      )
      .subscribe((status) => setIsLive(status === 'SUBSCRIBED'))

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [auctionId])

  return { currentBid, bidCount, recentBids, isLive }
}
