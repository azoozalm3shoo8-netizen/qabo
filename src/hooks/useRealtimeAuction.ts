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

export function useRealtimeAuction(
  auctionId: string,
  initialCurrentBid: number,
  initialBidCount: number
) {
  const [currentBid, setCurrentBid] = useState(initialCurrentBid)
  const [bidCount, setBidCount] = useState(initialBidCount)
  const [recentBids, setRecentBids] = useState<LiveBidRow[]>([])
  const [isLive, setIsLive] = useState(false)
  const [highestBidderId, setHighestBidderId] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

  useEffect(() => {
    setCurrentBid(initialCurrentBid)
    setBidCount(initialBidCount)
  }, [initialCurrentBid, initialBidCount, auctionId])

  useEffect(() => {
    if (!auctionId) return

    isFirstLoad.current = true
    setHighestBidderId(null)
    let cancelled = false

    const fetchBids = async () => {
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
      setCurrentBid((prev) => Math.max(prev, top))
      setRecentBids(data as LiveBidRow[])
      isFirstLoad.current = false
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
          const row = payload.new as { highest_bidder_id?: string | null }
          if ('highest_bidder_id' in row) {
            setHighestBidderId(row.highest_bidder_id ?? null)
          }
        }
      )
      .subscribe((status) => setIsLive(status === 'SUBSCRIBED'))

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [auctionId])

  return { currentBid, bidCount, recentBids, isLive, highestBidderId }
}
