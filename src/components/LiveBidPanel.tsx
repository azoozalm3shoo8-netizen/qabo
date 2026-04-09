'use client'

import { CaretDown, CaretUp, Lightning } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/Toast'
import { useRealtimeAuction } from '@/hooks/useRealtimeAuction'
import { sameUserId } from '@/lib/ids'
import { useLocale } from '@/lib/locale-context'
import { playBidSound } from '@/lib/sound'

type Props = {
  auctionId: string
  bidIncrement: number
  isOwner: boolean
  /** When auction inactive or ended, hide bidding */
  biddingOpen: boolean
  userId: string | null
  initialCurrentBid: number
  initialBidCount: number
  /** من جدول المشاهدات؛ يُعرض بجانب عدد المزايدات عندما > 0 */
  viewCount?: number
  onBidPlaced: () => void
  /** Pulse main bid CTA when auction ending within 1 hour */
  pulseEnding?: boolean
  highestBidderId: string | null
}

export function LiveBidPanel({
  auctionId,
  bidIncrement,
  isOwner,
  biddingOpen,
  userId,
  initialCurrentBid,
  initialBidCount,
  viewCount,
  onBidPlaced,
  pulseEnding = false,
  highestBidderId,
}: Props) {
  const { t } = useLocale()
  const { show } = useToast()
  const {
    currentBid,
    bidCount,
    recentBids,
    isLive,
    highestBidderId: realtimeHighestBidderId,
    watcherCount,
    lastExtendedAt,
  } = useRealtimeAuction(auctionId, initialCurrentBid, initialBidCount, highestBidderId, userId)
  const liveHighestBidder = realtimeHighestBidderId || highestBidderId
  const userHasBid = Boolean(
    userId && recentBids.some((b) => sameUserId(b.bidder_id, userId))
  )
  const isFirstLoad = useRef(true)
  const prevBidRef = useRef(initialCurrentBid)
  useEffect(() => {
    isFirstLoad.current = true
    prevBidRef.current = initialCurrentBid
  }, [auctionId, initialCurrentBid])
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      prevBidRef.current = currentBid
      return
    }
    if (currentBid > prevBidRef.current) {
      playBidSound()
    }
    prevBidRef.current = currentBid
  }, [currentBid])

  const prevExtRef = useRef<string | null>(null)
  useEffect(() => {
    if (!lastExtendedAt) return
    if (prevExtRef.current === lastExtendedAt) return
    prevExtRef.current = lastExtendedAt
    show('تم تمديد المزاد بعد مزايدة قرب النهاية', 'info')
  }, [lastExtendedAt, show])
  const [custom, setCustom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [optimisticBid, setOptimisticBid] = useState<number | null>(null)
  const prevBidBeforeOptimistic = useRef<number | null>(null)

  const minNext = useMemo(
    () => Math.max(0, Number(currentBid) + Number(bidIncrement)),
    [currentBid, bidIncrement]
  )

  const quick = useMemo(
    () => [
      minNext,
      minNext + bidIncrement,
      minNext + 3 * bidIncrement,
      minNext + 5 * bidIncrement,
    ],
    [minNext, bidIncrement]
  )

  const placeBid = async (amount: number) => {
    if (!userId || !biddingOpen) {
      window.location.href = '/auth/login'
      return
    }
    if (userId && liveHighestBidder && sameUserId(userId, liveHighestBidder)) {
      const confirmed = window.confirm('أنت بالفعل أعلى مزايد! هل تريد رفع مزايدتك؟')
      if (!confirmed) return
    }
    prevBidBeforeOptimistic.current = currentBid
    setOptimisticBid(amount)
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
          amount,
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

  if (isOwner) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-gray-500 dark:text-slate-400">{t('auction_ownAuction')}</p>
        <p className="mt-2 text-3xl font-extrabold text-[#1B7F7A] dark:text-slate-100">
          {Number(currentBid).toLocaleString()}{' '}
          <span className="text-lg font-bold text-[#156661] dark:text-slate-300">{t('common_currency')}</span>
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
          {Number(currentBid).toLocaleString()} {t('common_currency')}
        </p>
        {viewCount != null && viewCount > 0 ? (
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">👁 {viewCount} مشاهدة</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#1B7F7A]/25 bg-white p-4 shadow-md dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1B7F7A] dark:text-slate-200">
          {isLive ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              مباشر
            </>
          ) : (
            <span className="text-gray-400 dark:text-slate-500">جاري الاتصال…</span>
          )}
        </div>
        <span className="flex flex-wrap items-center justify-end gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span>
            {bidCount} {t('auction_bids')}
          </span>
          {watcherCount > 0 ? <span>👁 {watcherCount} يشاهدون الآن</span> : null}
        {viewCount != null && viewCount > 0 ? <span>👁 {viewCount} مشاهدة</span> : null}
        </span>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-slate-400">{t('auction_currentPrice')}</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={optimisticBid ?? currentBid}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: optimisticBid ? 0.65 : 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-4xl font-extrabold text-[#1B7F7A] dark:text-slate-100"
          >
            {Number(optimisticBid ?? currentBid).toLocaleString()}{' '}
            <span className="text-xl font-bold text-[#156661] dark:text-slate-300">
              {t('common_currency')}
            </span>
            {optimisticBid ? (
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1B7F7A] border-t-transparent align-middle" />
            ) : null}
          </motion.p>
        </AnimatePresence>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          {t('auction_minNext')}: {minNext.toLocaleString()} {t('common_currency')}
        </p>
        {userId && liveHighestBidder ? (
          sameUserId(userId, liveHighestBidder) ? (
            <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 dark:bg-emerald-900/30">
              <span className="text-sm">👑</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">أنت أعلى مزايد</span>
            </div>
          ) : userHasBid ? (
            <div className="mt-2 flex items-center justify-center gap-1 rounded-full bg-red-100 px-3 py-1.5 dark:bg-red-900/30">
              <span className="text-sm">⚠️</span>
              <span className="text-xs font-bold text-red-700 dark:text-red-300">تم تجاوز مزايدتك</span>
            </div>
          ) : null
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {quick.map((amt, i) => (
          <button
            key={i}
            type="button"
            disabled={submitting}
            onClick={() => void placeBid(amt)}
            className="rounded-xl border border-[#1B7F7A]/30 bg-[#E6F4F3] py-2 text-xs font-bold text-[#1B7F7A] transition-transform active:scale-95 disabled:opacity-50 dark:border-slate-600 dark:bg-[#134e4a]/40 dark:text-slate-100"
          >
            {i === 0 ? 'الحد الأدنى' : i === 1 ? `+1×` : i === 2 ? `+3×` : `+5×`}{' '}
            <span className="tabular-nums">{amt.toLocaleString()}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder="مبلغ مخصص"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-sm text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1B7F7A] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            const n = Number(custom.replace(/,/g, ''))
            if (!Number.isFinite(n) || n < minNext) {
              show(t('auction_minBidError') + `: ${minNext}`, 'error')
              return
            }
            void placeBid(n)
          }}
          className="rounded-xl bg-[#FF8C42] px-4 py-2 text-sm font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-50"
        >
          <Lightning className="inline h-5 w-5" weight="fill" /> زايد
        </button>
      </div>

        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            const customVal = Number(custom.replace(/,/g, ''))
            const finalAmount =
              custom.trim() && Number.isFinite(customVal) && customVal >= minNext ? customVal : minNext
            void placeBid(finalAmount)
          }}
          className={
            'flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF8C42] to-[#E87A35] py-4 text-lg font-bold text-white shadow-lg transition-transform hover:from-[#E87A35] hover:to-[#d96d2e] active:scale-[0.98] disabled:opacity-50 ' +
            (pulseEnding ? 'animate-pulse' : '')
          }
        >
          {custom.trim() &&
          Number.isFinite(Number(custom.replace(/,/g, ''))) &&
          Number(custom.replace(/,/g, '')) >= minNext
            ? `زايد بـ ${Number(custom.replace(/,/g, '')).toLocaleString()} ر.س`
            : t('auction_bidNow')}
        </button>

      <div className="border-t border-gray-100 pt-2 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setShowLog((v) => !v)}
          className="flex w-full items-center justify-center gap-1 text-xs font-semibold text-[#1B7F7A] dark:text-slate-300"
        >
          آخر المزايدات
          {showLog ? <CaretUp className="h-4 w-4" weight="bold" /> : <CaretDown className="h-4 w-4" weight="bold" />}
        </button>
        {showLog && (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-gray-600 dark:text-slate-400">
            {recentBids.slice(0, 10).map((b) => (
              <li
                key={b.id}
                className="flex justify-between rounded-lg bg-[#F3F4F6] px-2 py-1 dark:bg-slate-900"
              >
                <span className="font-mono tabular-nums">{Number(b.amount).toLocaleString()}</span>
                <span className="text-gray-400">مزايد</span>
              </li>
            ))}
            {recentBids.length === 0 ? <li className="text-center text-gray-400">لا سجل بعد</li> : null}
          </ul>
        )}
      </div>
    </div>
  )
}
