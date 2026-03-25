'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/lib/locale-context'

type Props = {
  endsAt: string
  status: string
  onEndedChange?: (ended: boolean) => void
}

/** Isolated timer so parent page does not re-render every second */
export function AuctionCountdown({ endsAt, status, onEndedChange }: Props) {
  const { t } = useLocale()
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [ended, setEnded] = useState(false)
  const endedRef = useRef<boolean | null>(null)
  const cbRef = useRef(onEndedChange)
  cbRef.current = onEndedChange

  useEffect(() => {
    endedRef.current = null
  }, [endsAt, status])

  useEffect(() => {
    const tick = () => {
      let nowEnded: boolean
      if (status !== 'active') {
        nowEnded = true
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      } else {
        const diff = new Date(endsAt).getTime() - Date.now()
        if (diff <= 0) {
          nowEnded = true
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        } else {
          nowEnded = false
          const days = Math.floor(diff / 86400000)
          const rem = diff % 86400000
          setTimeLeft({
            days,
            hours: Math.floor(rem / 3600000),
            minutes: Math.floor((rem % 3600000) / 60000),
            seconds: Math.floor((rem % 60000) / 1000),
          })
        }
      }

      setEnded(nowEnded)
      if (endedRef.current !== nowEnded) {
        endedRef.current = nowEnded
        cbRef.current?.(nowEnded)
      }
    }

    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [endsAt, status])

  const showTimer = !ended && status === 'active'

  const units = [
    { val: timeLeft.days, label: t('countdown_day') },
    { val: timeLeft.hours, label: t('countdown_hour') },
    { val: timeLeft.minutes, label: t('countdown_minute') },
    { val: timeLeft.seconds, label: t('countdown_second') },
  ]

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-2 text-center text-sm text-gray-500 dark:text-slate-400">
        {ended || status !== 'active' ? t('countdown_ended') : t('countdown_remaining')}
      </p>
      {showTimer ? (
        <div className="flex flex-wrap justify-center gap-2" dir="ltr">
          {units.map((item, i) => (
            <div
              key={i}
              className="min-w-[64px] rounded-xl border border-[#1B7F7A]/20 bg-[#E6F4F3] px-3 py-2.5 text-center dark:border-[#1B7F7A]/30 dark:bg-[#134e4a]/40"
            >
              <div className="text-xl font-bold tabular-nums text-[#1B7F7A] dark:text-slate-100">
                {String(item.val).padStart(2, '0')}
              </div>
              <div className="mt-0.5 text-[10px] font-medium text-[#1F2937]/80 dark:text-slate-300">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-lg font-bold text-gray-500 dark:text-slate-400">—</p>
      )}
    </div>
  )
}
