'use client'

import { motion } from 'framer-motion'
import { useAuctionRealtime } from '@/contexts/AuctionRealtimeContext'
import { formatSARFromRiyalInteger } from '@/lib/utils/currency'

export function AuctionLivePrice() {
  const { currentBid } = useAuctionRealtime()
  const riyal = Math.round(Number(currentBid))
  return (
    <p className="text-3xl font-bold text-[#1B7F7A] dark:text-teal-300" aria-live="assertive">
      <motion.span
        key={riyal}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="inline-block"
      >
        {formatSARFromRiyalInteger(riyal)}
      </motion.span>
    </p>
  )
}
