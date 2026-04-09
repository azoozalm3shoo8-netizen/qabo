'use client'

import { Gavel, Timer } from '@phosphor-icons/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { auctionCountdownParts } from '@/lib/time'
import { formatSARFromRiyalInteger } from '@/lib/utils/currency'
import type { AuctionRecommendation } from '@/lib/types/recommendations'

type Props = {
  title: string
  type: 'personal' | 'similar' | 'trending'
  auctionId?: string
  userId?: string | null
}

export function RecommendationCarousel({ title, type, auctionId, userId }: Props) {
  const [items, setItems] = useState<AuctionRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (type === 'personal' && !userId) {
      setItems([])
      setLoading(false)
      return
    }
    if (type === 'similar' && !auctionId) {
      setItems([])
      setLoading(false)
      return
    }

    const qs = new URLSearchParams()
    qs.set('type', type)
    qs.set('limit', '12')
    if (type === 'personal' && userId) qs.set('user_id', userId)
    if (type === 'similar' && auctionId) qs.set('auction_id', auctionId)

    void (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/recommendations?' + qs.toString())
        const data = await res.json()
        if (cancelled) return
        setItems(Array.isArray(data.items) ? data.items : [])
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [type, auctionId, userId])

  if (loading && items.length === 0) {
    return (
      <section className="mt-6 px-4" dir="rtl">
        <h2 className="mb-3 text-lg font-bold text-[#1F2937] dark:text-slate-100">{title}</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 min-w-[160px] animate-pulse rounded-xl bg-gray-200 dark:bg-slate-700"
            />
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="mt-6 px-4" dir="rtl">
      <h2 className="mb-3 text-lg font-bold text-[#1F2937] dark:text-slate-100">{title}</h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 scroll-smooth scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((a) => {
          const parts = auctionCountdownParts(a.endsAt, 'active')
          const timeStr = !parts.ended
            ? `${parts.hours}س ${parts.minutes}د`
            : 'انتهى'
          return (
            <Link
              key={a.auctionId}
              href={'/auction/' + a.auctionId}
              className="min-w-[168px] max-w-[168px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-md transition-transform hover:scale-[1.02] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[4/3] w-full bg-muted">
                {a.imageUrl ? (
                  <img
                    src={a.imageUrl}
                    alt={a.title ? `صورة ${a.title}` : 'صورة المنتج'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl text-gray-400">📷</div>
                )}
                <span
                  className="absolute left-2 top-2 max-w-[90%] truncate rounded-full px-2 py-0.5 text-[9px] font-bold text-white shadow"
                  style={{ backgroundColor: '#FF8C42' }}
                >
                  {a.reason_ar}
                </span>
              </div>
              <div className="space-y-1.5 p-2.5">
                <p className="line-clamp-2 text-xs font-bold leading-snug text-foreground">
                  {a.title}
                </p>
                <p className="text-sm font-extrabold tabular-nums text-[#1B7F7A]">
                  {formatSARFromRiyalInteger(Math.round(a.currentPrice))}
                </p>
                <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[#1B7F7A]">
                    <Gavel className="h-3 w-3" weight="bold" />
                    {a.bidCount}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Timer className="h-3 w-3" weight="bold" />
                    {timeStr}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
