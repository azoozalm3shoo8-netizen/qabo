'use client'

import { useEffect, useState } from 'react'

export function useCountdown(endsAtIso: string) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [endsAtIso])

  const end = new Date(endsAtIso).getTime()
  const diff = Math.max(0, end - now)
  const isExpired = diff <= 0
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds, totalSeconds, isExpired }
}
