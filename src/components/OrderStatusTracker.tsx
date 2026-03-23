'use client'

import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { motion } from 'framer-motion'

export type OrderTrackerStatus =
  | 'pending'
  | 'captured'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

const LABELS = ['طلب', 'دفع', 'شحن', 'تسليم'] as const

const DATE_KEYS = ['pending', 'paid', 'shipped', 'delivered'] as const

function stepIndex(status: OrderTrackerStatus): number {
  if (status === 'cancelled') return -1
  if (status === 'pending') return 0
  if (status === 'captured' || status === 'paid') return 1
  if (status === 'shipped') return 2
  if (status === 'delivered') return 3
  return 0
}

export function OrderStatusTracker({
  currentStatus,
  size = 'sm',
  dates,
}: {
  currentStatus: string
  size?: 'sm' | 'lg'
  dates?: { pending?: string; paid?: string; shipped?: string; delivered?: string }
}) {
  const s = currentStatus as OrderTrackerStatus
  const cancelled = s === 'cancelled'
  const activeIdx = cancelled ? -1 : stepIndex(s)

  const circleSize = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-8 w-8 text-xs'
  const labelText = size === 'lg' ? 'text-xs' : 'text-[10px] sm:text-xs'
  const lineH = size === 'lg' ? 'h-1' : 'h-0.5'
  const dateText = 'mt-0.5 text-[9px] text-gray-400 max-w-[4.5rem] text-center leading-tight'

  return (
    <div className="w-full py-2" dir="rtl">
      <div className="flex w-full items-center">
        {LABELS.map((label, i) => {
          const completed = !cancelled && i < activeIdx
          const current = !cancelled && i === activeIdx

          const circleBase =
            'flex shrink-0 items-center justify-center rounded-full font-bold transition-all ' +
            circleSize +
            ' ' +
            (cancelled
              ? 'bg-red-100 text-red-600'
              : completed
                ? 'bg-amber-500 text-white'
                : current
                  ? 'bg-amber-500 text-white ring-4 ring-amber-200'
                  : 'bg-gray-200 text-gray-400')

          const lineDone = !cancelled && i < activeIdx
          const lineClass =
            lineH +
            ' flex-1 min-w-[4px] rounded-full ' +
            (cancelled ? 'bg-red-100' : lineDone ? 'bg-amber-500' : 'bg-gray-200')

          const dateKey = DATE_KEYS[i]
          const dateStr =
            dates && dates[dateKey]
              ? format(new Date(dates[dateKey] as string), 'd MMM', { locale: arSA })
              : ''

          const inner = (
            <div className={circleBase}>{cancelled ? '✕' : completed ? '✓' : i + 1}</div>
          )

          return (
            <div key={label} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center shrink-0">
                {completed ? (
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    {inner}
                  </motion.div>
                ) : (
                  inner
                )}
                <span
                  className={
                    'mt-1 max-w-[4.5rem] text-center leading-tight ' +
                    labelText +
                    ' ' +
                    (cancelled
                      ? 'text-red-600'
                      : completed
                        ? 'font-medium text-amber-700'
                        : current
                          ? 'font-bold text-amber-600'
                          : 'text-gray-400')
                  }
                >
                  {label}
                </span>
                {dates && <span className={dateText}>{dateStr}</span>}
              </div>
              {i < LABELS.length - 1 && <div className={lineClass} aria-hidden />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
