'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useRealtimeAuction, type LiveBidRow } from '@/hooks/useRealtimeAuction'

export type AuctionRealtimeValue = ReturnType<typeof useRealtimeAuction>

const AuctionRealtimeContext = createContext<AuctionRealtimeValue | null>(null)

export function AuctionRealtimeProvider({
  auctionId,
  initialCurrentBid,
  initialBidCount,
  initialHighestBidderId,
  viewerUserId,
  children,
}: {
  auctionId: string
  initialCurrentBid: number
  initialBidCount: number
  initialHighestBidderId?: string | null
  viewerUserId?: string | null
  children: ReactNode
}) {
  const value = useRealtimeAuction(
    auctionId,
    initialCurrentBid,
    initialBidCount,
    initialHighestBidderId,
    viewerUserId,
    true
  )
  return <AuctionRealtimeContext.Provider value={value}>{children}</AuctionRealtimeContext.Provider>
}

export function useAuctionRealtime(): AuctionRealtimeValue {
  const ctx = useContext(AuctionRealtimeContext)
  if (!ctx) {
    throw new Error('useAuctionRealtime يجب استخدامه داخل AuctionRealtimeProvider')
  }
  return ctx
}

export function useAuctionRealtimeOptional(): AuctionRealtimeValue | null {
  return useContext(AuctionRealtimeContext)
}

export type { LiveBidRow }
