'use client'

import { useAuctionRealtime } from '@/contexts/AuctionRealtimeContext'
import { formatSARFromRiyalInteger } from '@/lib/utils/currency'

export function AuctionLivePrice() {
  const { currentBid } = useAuctionRealtime()
  return (
    <p className="text-3xl font-bold text-[#1B7F7A] dark:text-teal-300" aria-live="assertive">
      {formatSARFromRiyalInteger(Math.round(Number(currentBid)))}
    </p>
  )
}
