'use client'

export type OrderTrackerStatus =
  | 'pending'
  | 'captured'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

const LABELS = ['طلب', 'دفع', 'شحن', 'تسليم'] as const

function stepIndex(status: OrderTrackerStatus): number {
  if (status === 'cancelled') return -1
  if (status === 'pending') return 0
  if (status === 'captured' || status === 'paid') return 1
  if (status === 'shipped') return 2
  if (status === 'delivered') return 3
  return 0
}

export function OrderStatusTracker({ currentStatus }: { currentStatus: string }) {
  const s = currentStatus as OrderTrackerStatus
  const cancelled = s === 'cancelled'
  const activeIdx = cancelled ? -1 : stepIndex(s)

  return (
    <div className="w-full py-2" dir="rtl">
      <div className="flex w-full items-center">
        {LABELS.map((label, i) => {
          const completed = !cancelled && i < activeIdx
          const current = !cancelled && i === activeIdx

          const circle =
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ' +
            (cancelled
              ? 'bg-red-100 text-red-600'
              : completed
                ? 'bg-amber-500 text-white'
                : current
                  ? 'bg-amber-500 text-white ring-4 ring-amber-200'
                  : 'bg-gray-200 text-gray-400')

          const lineDone = !cancelled && i < activeIdx
          const lineClass =
            'h-0.5 flex-1 min-w-[4px] rounded-full ' +
            (cancelled ? 'bg-red-100' : lineDone ? 'bg-amber-500' : 'bg-gray-200')

          return (
            <div key={label} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <div className={circle}>{cancelled ? '✕' : completed ? '✓' : i + 1}</div>
                <span
                  className={
                    'mt-1 max-w-[4.5rem] text-center text-[10px] leading-tight sm:text-xs ' +
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
              </div>
              {i < LABELS.length - 1 && <div className={lineClass} aria-hidden />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
