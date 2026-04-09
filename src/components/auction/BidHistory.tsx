'use client'

import { User } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { useAuctionRealtime } from '@/contexts/AuctionRealtimeContext'
import { formatSAR } from '@/lib/utils/currency'

export type BidHistoryBid = {
  id: string
  amount: number
  created_at: string
  bidder_name?: string
}

export function BidHistory({ auctionId: _auctionId }: { auctionId: string }) {
  const { recentBids } = useAuctionRealtime()
  const [open, setOpen] = useState(false)

  const rows: BidHistoryBid[] = recentBids.map((b, idx) => ({
    id: b.id,
    amount: Number(b.amount),
    created_at: b.created_at,
    bidder_name: `مزايد #${idx + 1}`,
  }))

  const topId = rows[0]?.id

  const Row = ({ b, highlight }: { b: BidHistoryBid; highlight: boolean }) => (
    <motion.li
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className={
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm ' +
        (highlight ? 'bg-[#1B7F7A]/10 dark:bg-teal-900/30' : 'bg-gray-50 dark:bg-slate-900/80')
      }
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-700">
        <User className="h-5 w-5 text-gray-500 dark:text-slate-400" />
      </div>
      <div className="min-w-0 flex-1 text-start">
        <p className="font-semibold text-gray-900 dark:text-slate-100">{b.bidder_name}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: arSA })}
        </p>
      </div>
      <span className="shrink-0 font-mono font-bold text-[#1B7F7A] dark:text-teal-300">
        {formatSAR(b.amount, true)}
      </span>
    </motion.li>
  )

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800" dir="rtl">
      <h3 className="mb-3 font-bold text-gray-900 dark:text-slate-100">آخر المزايدات</h3>
      {rows.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-slate-400">لا مزايدات بعد</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 5).map((b) => (
            <Row key={b.id} b={b} highlight={b.id === topId} />
          ))}
        </ul>
      )}
      {rows.length > 5 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-xl border border-[#1B7F7A]/30 py-2 text-sm font-bold text-[#1B7F7A] dark:border-teal-600 dark:text-teal-300"
        >
          عرض الكل
        </button>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="كل المزايدات">
        <ul className="space-y-2">
          {rows.map((b) => (
            <Row key={b.id} b={b} highlight={b.id === topId} />
          ))}
        </ul>
      </Sheet>
    </div>
  )
}
