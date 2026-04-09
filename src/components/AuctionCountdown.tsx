'use client'

import { useEffect, useRef, useState } from 'react'
import { SNIPE_WINDOW_MS, formatTimeLeft } from '@/lib/anti-snipe'
import { useLocale } from '@/lib/locale-context'
import { playCountdownTickOnce } from '@/lib/sound'

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
  const msLeft = showTimer ? new Date(endsAt).getTime() - Date.now() : 0
  const totalSecondsLeft = showTimer && msLeft > 0 ? Math.floor(msLeft / 1000) : 0
  const urgent = showTimer && msLeft > 0 && msLeft <= SNIPE_WINDOW_MS
  const formatted = formatTimeLeft(endsAt)

  const tick30Ref = useRef(false)
  useEffect(() => {
    if (!showTimer || msLeft <= 0) {
      tick30Ref.current = false
      return
    }
    if (totalSecondsLeft === 30 && !tick30Ref.current) {
      tick30Ref.current = true
      playCountdownTickOnce()
    }
    if (totalSecondsLeft > 32) tick30Ref.current = false
  }, [showTimer, msLeft, totalSecondsLeft])

  const urgencyTextClass =
    totalSecondsLeft > 3600
      ? 'text-emerald-600 dark:text-emerald-400'
      : totalSecondsLeft > 300
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-red-600 animate-pulse dark:text-red-400'

  const units = [
    { val: timeLeft.days, label: t('countdown_day') },
    { val: timeLeft.hours, label: t('countdown_hour') },
    { val: timeLeft.minutes, label: t('countdown_minute') },
    { val: timeLeft.seconds, label: t('countdown_second') },
  ]

  return (
    <div
      className={
        'rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-800 ' +
        (urgent
          ? 'border-red-400/60 animate-pulse dark:border-red-500/50'
          : 'border-gray-100 dark:border-slate-700')
      }
      role="region"
      aria-label="الوقت المتبقي للمزاد"
    >
      <p className="mb-2 text-center text-sm text-gray-500 dark:text-slate-400">
        {ended || status !== 'active' ? t('countdown_ended') : t('countdown_remaining')}
      </p>
      {showTimer ? (
        <>
          <p
            className={'mb-2 text-center text-2xl font-extrabold tabular-nums ' + urgencyTextClass}
            dir="ltr"
            role="timer"
            aria-live={totalSecondsLeft < 60 ? 'assertive' : 'polite'}
            aria-label={`متبقي ${timeLeft.days} يوم ${timeLeft.hours} ساعة ${timeLeft.minutes} دقيقة`}
          >
            {formatted}
          </p>
          {urgent ? (
            <p className="mb-2 text-center text-xs font-bold text-red-600 dark:text-red-400">
              (وشك الإغلاق!)
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2" dir="ltr">
            {units.map((item, i) => (
              <div
                key={i}
                className={
                  'min-w-[64px] rounded-xl border px-3 py-2.5 text-center dark:border-[#1B7F7A]/30 ' +
                  (urgent
                    ? 'border-red-300/50 bg-red-50 dark:border-red-500/30 dark:bg-red-950/30'
                    : 'border-[#1B7F7A]/20 bg-[#E6F4F3] dark:bg-[#134e4a]/40')
                }
              >
                <div
                  className={
                    'text-xl font-bold tabular-nums ' +
                    (urgent ? 'text-red-600 dark:text-red-300' : 'text-[#1B7F7A] dark:text-slate-100')
                  }
                >
                  {String(item.val).padStart(2, '0')}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-[#1F2937]/80 dark:text-slate-300">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-center text-lg font-bold text-gray-500 dark:text-slate-400">—</p>
      )}
    </div>
  )
}
