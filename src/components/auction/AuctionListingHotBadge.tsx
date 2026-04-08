'use client'

import { useEffect, useState } from 'react'

/**
 * أيقونة 🔥 للقوائم — يستدعي social-proof مرة واحدة لكل بطاقة (مع TTL بسيط في الذاكرة).
 */
export function AuctionListingHotBadge({ auctionId }: { auctionId: string }) {
  const [hot, setHot] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cacheKey = `sp_hot_${auctionId}`
    try {
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const { v, exp } = JSON.parse(raw) as { v: boolean; exp: number }
        if (exp > Date.now()) {
          setHot(v)
          return
        }
      }
    } catch {
      /* ignore */
    }

    void (async () => {
      try {
        const res = await fetch('/api/auctions/' + encodeURIComponent(auctionId) + '/social-proof')
        const data = await res.json()
        if (cancelled) return
        const isHot = Boolean(data?.isHot)
        setHot(isHot)
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ v: isHot, exp: Date.now() + 30_000 })
          )
        } catch {
          /* ignore */
        }
      } catch {
        if (!cancelled) setHot(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [auctionId])

  if (!hot) return null
  return (
    <span
      className="absolute right-2 top-10 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-lg shadow-md ring-1 ring-orange-200 dark:bg-slate-900/90 dark:ring-orange-900/50"
      title="مزاد ساخن"
      aria-hidden
    >
      🔥
    </span>
  )
}
