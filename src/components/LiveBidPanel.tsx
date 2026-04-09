'use client'

import { useAuctionRealtime } from '@/contexts/AuctionRealtimeContext'
import { useLocale } from '@/lib/locale-context'
import { formatSARFromRiyalInteger } from '@/lib/utils/currency'

type Props = {
  auctionId: string
  bidIncrement: number
  isOwner: boolean
  biddingOpen: boolean
  userId: string | null
  initialCurrentBid: number
  initialBidCount: number
  viewCount?: number
  onBidPlaced: () => void
  pulseEnding?: boolean
  highestBidderId: string | null
}

/**
 * ملخص المزايدة للبائع أو عند إغلاق المزاد.
 * شريط المزايدة الثابت للمشترين: `StickyBidBar` (داخل `AuctionRealtimeProvider`).
 */
export function LiveBidPanel({
  isOwner,
  biddingOpen,
  viewCount,
  highestBidderId: _highestBidderId,
  initialCurrentBid: _initialCurrentBid,
  initialBidCount: _initialBidCount,
  auctionId: _auctionId,
  bidIncrement: _bidIncrement,
  userId: _userId,
  onBidPlaced: _onBidPlaced,
  pulseEnding: _pulseEnding,
}: Props) {
  const { t } = useLocale()
  const { currentBid, bidCount } = useAuctionRealtime()

  if (isOwner) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-gray-500 dark:text-slate-400">{t('auction_ownAuction')}</p>
        <p className="mt-2 text-3xl font-extrabold text-[#1B7F7A] dark:text-slate-100">
          {formatSARFromRiyalInteger(Math.round(Number(currentBid)))}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          {bidCount} {t('auction_bids')}
        </p>
      </div>
    )
  }

  if (!biddingOpen) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-lg font-bold text-gray-500 dark:text-slate-400">{t('auction_inactive')}</p>
        <p className="mt-2 text-2xl font-extrabold text-[#1B7F7A] dark:text-slate-100">
          {formatSARFromRiyalInteger(Math.round(Number(currentBid)))}
        </p>
        {viewCount != null && viewCount > 0 ? (
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">👁 {viewCount} مشاهدة</p>
        ) : null}
      </div>
    )
  }

  return null
}
