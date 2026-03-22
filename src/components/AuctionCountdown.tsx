'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  endsAt: string
  status: string
  onEndedChange?: (ended: boolean) => void
}

/** Isolated timer so parent page does not re-render every second */
export function AuctionCountdown({ endsAt, status, onEndedChange }: Props) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
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
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
      } else {
        const diff = new Date(endsAt).getTime() - Date.now()
        if (diff <= 0) {
          nowEnded = true
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        } else {
          nowEnded = false
          setTimeLeft({
            hours: Math.floor(diff / 3600000),
            minutes: Math.floor((diff % 3600000) / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
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

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-sm text-gray-500 text-center mb-2">
        {ended || status !== 'active' ? 'انتهى المزاد' : 'ينتهي المزاد خلال'}
      </p>
      {showTimer ? (
        <div className="flex gap-2 justify-center" dir="ltr">
          {[
            { val: timeLeft.hours, label: 'ساعة' },
            { val: timeLeft.minutes, label: 'دقيقة' },
            { val: timeLeft.seconds, label: 'ثانية' },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-amber-50 rounded-xl px-4 py-3 text-center min-w-[72px] border border-amber-100"
            >
              <div className="text-2xl font-bold text-amber-600">
                {String(item.val).padStart(2, '0')}
              </div>
              <div className="text-xs text-amber-700/80 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-lg font-bold text-gray-500">—</p>
      )}
    </div>
  )
}
