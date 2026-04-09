'use client'

import { formatSAR, toRiyal } from '@/lib/utils/currency'

/** currentBid بالهللات — onBid يستقبل المبلغ الإجمالي الجديد بالريال (لـ /api/bids) */
export function QuickBidButtons({
  currentBidHalalas,
  onBid,
  disabled,
}: {
  currentBidHalalas: number
  onBid: (amountRiyal: number) => void
  disabled?: boolean
}) {
  const ch = Math.max(0, Math.round(currentBidHalalas))
  let inc = 5000
  if (ch < 1000) inc = 100
  else if (ch < 10_000) inc = 500
  else if (ch < 50_000) inc = 1000

  const targets = [ch + inc, ch + inc * 2, ch + inc * 5]

  return (
    <div className="flex flex-wrap gap-2" dir="rtl">
      {targets.map((halalas, i) => {
        const riyalTotal = Math.ceil(toRiyal(halalas) * 100) / 100
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onBid(riyalTotal)}
            className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center rounded-full border-2 border-[#1B7F7A]/40 bg-white px-3 py-2 text-xs font-bold text-[#1B7F7A] transition-transform active:scale-95 disabled:opacity-50 dark:border-teal-600 dark:bg-slate-800 dark:text-teal-300"
          >
            <span>+{formatSAR(inc * (i === 0 ? 1 : i === 1 ? 2 : 5), true)}</span>
            <span className="mt-0.5 text-[10px] font-semibold text-gray-600 dark:text-slate-400">
              = {formatSAR(halalas, true)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
