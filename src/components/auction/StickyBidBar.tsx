'use client'

import { Lightning } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/Toast'
import { useAuctionRealtime } from '@/contexts/AuctionRealtimeContext'
import { useLocale } from '@/lib/locale-context'
import { formatSAR } from '@/lib/utils/currency'
import { sameUserId } from '@/lib/ids'
import { QuickBidButtons } from '@/components/auction/QuickBidButtons'

type Props = {
  auctionId: string
  bidIncrementRiyal: number
  userId: string | null
  biddingOpen: boolean
  pulseEnding?: boolean
  onBidPlaced: () => void
  highestBidderId: string | null
  onOpenProxy?: () => void
}

export function StickyBidBar({
  auctionId,
  bidIncrementRiyal,
  userId,
  biddingOpen,
  pulseEnding = false,
  onBidPlaced,
  highestBidderId,
  onOpenProxy,
}: Props) {
  const { t } = useLocale()
  const { show } = useToast()
  const {
    currentBid,
    setBidCount,
    bidCount,
    recentBids,
    highestBidderId: rtHighest,
  } = useAuctionRealtime()

  const liveHighest = rtHighest || highestBidderId
  const userHasBid = Boolean(userId && recentBids.some((b) => sameUserId(b.bidder_id, userId)))

  const [custom, setCustom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [optimisticBid, setOptimisticBid] = useState<number | null>(null)
  const prevBidBeforeOptimistic = useRef<number | null>(null)

  const minNext = useMemo(
    () => Math.max(0, Number(currentBid) + Number(bidIncrementRiyal)),
    [currentBid, bidIncrementRiyal]
  )

  const currentBidHalalas = Math.round(Number(currentBid) * 100)

  const placeBid = async (amountRiyal: number) => {
    if (!userId || !biddingOpen) {
      window.location.href = '/auth/login'
      return
    }
    if (userId && liveHighest && sameUserId(userId, liveHighest)) {
      const confirmed = window.confirm('أنت بالفعل أعلى مزايد! هل تريد رفع مزايدتك؟')
      if (!confirmed) return
    }
    prevBidBeforeOptimistic.current = Number(currentBid)
    setOptimisticBid(amountRiyal)
    setBidCount((c) => c + 1)
    setSubmitting(true)
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          auction_id: auctionId,
          bidder_id: userId,
          amount: amountRiyal,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('auction_bidFailed'))
      show(t('auction_bidSuccess'), 'success')
      setOptimisticBid(null)
      onBidPlaced()
    } catch (e: unknown) {
      setOptimisticBid(null)
      if (prevBidBeforeOptimistic.current != null) {
        setBidCount((c) => Math.max(0, c - 1))
      }
      show(e instanceof Error ? e.message : t('common_error'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!biddingOpen) return null

  return (
    <div
      className="fixed start-0 end-0 z-[45] border-t border-gray-200 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
      dir="rtl"
    >
      <div className="mx-auto max-w-lg px-3 space-y-3">
        <QuickBidButtons
          currentBidHalalas={Math.round((optimisticBid ?? currentBid) * 100)}
          onBid={(r) => void placeBid(r)}
          disabled={submitting}
        />
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="مبلغ مخصص"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-sm text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1B7F7A] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            aria-label="مبلغ المزايدة"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              const n = Number(String(custom).replace(/,/g, ''))
              if (!Number.isFinite(n) || n < minNext) {
                show(t('auction_minBidError') + `: ${minNext}`, 'error')
                return
              }
              void placeBid(n)
            }}
            className={
              'flex min-h-[48px] min-w-[120px] items-center justify-center gap-1 rounded-xl bg-[#FF8C42] px-4 text-sm font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-50 ' +
              (pulseEnding ? 'animate-pulse' : '')
            }
            aria-label="زايد الآن"
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Lightning className="h-5 w-5" weight="fill" />
                زايد الآن
              </>
            )}
          </button>
        </div>
        {onOpenProxy ? (
          <button
            type="button"
            onClick={onOpenProxy}
            className="w-full text-center text-xs font-semibold text-[#1B7F7A] underline-offset-2 hover:underline dark:text-teal-300"
          >
            أو حدد أقصى مبلغك ←
          </button>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={optimisticBid ?? currentBid}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-gray-500 dark:text-slate-400"
          >
            <span aria-live="polite">
              السعر الحالي:{' '}
              <span className="font-bold text-[#1B7F7A] dark:text-teal-300">
                {formatSAR(Math.round((optimisticBid ?? currentBid) * 100), true)}
              </span>
              {' · '}
              {bidCount} مزايدة
            </span>
            {userId && liveHighest ? (
              sameUserId(userId, liveHighest) ? (
                <span className="mr-2 text-emerald-600 dark:text-emerald-400"> · أنت في المقدمة</span>
              ) : userHasBid ? (
                <span className="mr-2 text-red-600 dark:text-red-400"> · تم تجاوزك</span>
              ) : null
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
