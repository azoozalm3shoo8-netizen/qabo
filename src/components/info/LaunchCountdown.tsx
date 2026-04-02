'use client'

import { useEffect, useState } from 'react'

export function LaunchCountdown({ endsAtIso }: { endsAtIso: string | null }) {
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null)

  useEffect(() => {
    if (!endsAtIso) return
    const end = new Date(endsAtIso).getTime()
    const tick = () => {
      const diff = Math.max(0, end - Date.now())
      const s = Math.floor(diff / 1000)
      setLeft({
        d: Math.floor(s / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60,
      })
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endsAtIso])

  if (!endsAtIso || !left) return null

  return (
    <div dir="rtl" className="mt-6 flex flex-wrap justify-center gap-3 text-center text-white">
      {[
        ['يوم', left.d],
        ['ساعة', left.h],
        ['دقيقة', left.m],
        ['ثانية', left.s],
      ].map(([label, v]) => (
        <div key={String(label)} className="min-w-[4.5rem] rounded-xl bg-white/15 px-3 py-2">
          <div className="text-2xl font-extrabold tabular-nums">{v}</div>
          <div className="text-xs opacity-90">{label}</div>
        </div>
      ))}
    </div>
  )
}
