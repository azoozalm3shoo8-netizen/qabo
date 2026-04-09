'use client'

import { useAuctionRealtime } from '@/contexts/AuctionRealtimeContext'

export function AuctionStatusStrip({ viewCount }: { viewCount?: number }) {
  const { bidCount, watcherCount } = useAuctionRealtime()

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3 text-sm text-gray-600 dark:text-slate-400"
      dir="rtl"
    >
      <span>👀 {watcherCount} يشاهدون</span>
      <span>🔨 {bidCount} مزايدة</span>
      {viewCount != null && viewCount > 0 ? <span>👁 {viewCount} مشاهدة</span> : null}
    </div>
  )
}
