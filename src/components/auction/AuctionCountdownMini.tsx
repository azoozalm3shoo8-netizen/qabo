'use client'

import { useEffect, useMemo, useState } from 'react'

function msLeft(endsAt: string | Date): number {
  const t = typeof endsAt === 'string' ? new Date(endsAt).getTime() : endsAt.getTime()
  return Math.max(0, t - Date.now())
}

export function AuctionCountdownMini({ endsAt }: { endsAt: string | Date }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const { label, className } = useMemo(() => {
    const left = msLeft(endsAt)
    if (left <= 0) return { label: 'انتهى', className: 'text-gray-500 dark:text-slate-400' }

    const sec = Math.floor(left / 1000)
    const days = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60

    let labelInner: string
    if (days >= 1) {
      labelInner = `${days} يوم`
    } else if (h > 0) {
      labelInner = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    } else {
      labelInner = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    const hoursLeft = left / 3600000
    let cls = 'text-green-600 dark:text-green-400'
    if (hoursLeft < 24) cls = 'text-yellow-600 dark:text-yellow-400'
    if (hoursLeft < 1) cls = 'text-red-600 dark:text-red-400'
    if (left < 5 * 60 * 1000) cls = 'text-red-600 animate-pulse dark:text-red-400'

    return { label: labelInner, className: cls }
  }, [endsAt])

  return (
    <span className={'text-xs font-semibold tabular-nums ' + className} role="timer" aria-live="polite">
      {label}
    </span>
  )
}
