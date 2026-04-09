'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { categoryBySlug, categoryNameFromParam } from '@/lib/constants'
import { auctionCountdownParts } from '@/lib/time'
import { readQaboUserFromStorage, type QaboUserLocal } from '@/lib/qabo-user'
import { formatSAR } from '@/lib/utils/currency'

type CategoryAuctionRow = {
  id: string
  title: string
  current_bid: number
  ends_at: string
  status: string
  city?: string | null
}

export default function CategoryAuctionsPage() {
  const params = useParams()
  const raw = typeof params.name === 'string' ? params.name : ''
  const categoryName = categoryNameFromParam(raw)
  const meta = categoryBySlug(raw)

  const [auctions, setAuctions] = useState<CategoryAuctionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<QaboUserLocal | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    if (!categoryName) {
      setAuctions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        '/api/auctions?category=' + encodeURIComponent(categoryName)
      )
      const data = await res.json()
      setAuctions(Array.isArray(data) ? data : [])
    } catch {
      setAuctions([])
    } finally {
      setLoading(false)
    }
  }, [categoryName])

  useEffect(() => {
    setUser(readQaboUserFromStorage())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  void tick

  const title = meta ? `${meta.icon} ${meta.name}` : categoryName || 'تصنيف'

  if (!categoryName) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 pb-20" dir="rtl">
        <p className="text-gray-600 mb-4">التصنيف غير معروف</p>
        <Link href="/categories" className="text-[#1B7F7A] font-medium">
          العودة للتصنيفات
        </Link>
        <BottomNav active="search" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3 shadow-sm">
        <Link
          href="/categories"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="العودة للتصنيفات"
        >
          →
        </Link>
        <h1 className="font-bold text-lg flex-1 truncate">{title}</h1>
        <span className="shrink-0 text-xs text-muted-foreground">{auctions.length} مزاد</span>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-card shadow-sm" />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <p className="mb-3 text-5xl">📭</p>
            <p className="text-muted-foreground">لا توجد مزادات في هذا التصنيف حالياً</p>
            <Link
              href="/"
              className="mt-4 inline-block font-medium text-[#1B7F7A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              الرئيسية
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {auctions.map((a) => {
              const parts = auctionCountdownParts(a.ends_at, a.status)
              const label = parts.ended
                ? 'انتهى'
                : `${parts.hours}س ${parts.minutes}د ${parts.seconds}ث`
              return (
                <Link
                  key={a.id}
                  href={'/auction/' + a.id}
                  className="relative overflow-hidden rounded-xl border border-border bg-card shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="absolute top-2 left-2 z-10">
                    <FavoriteHeart auctionId={a.id} userId={user?.user_id ?? null} />
                  </div>
                  <div className="h-32 bg-gray-100 flex items-center justify-center text-3xl">📦</div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate">{a.title}</h3>
                    <p className="mt-1 font-bold text-[#1B7F7A]">{formatSAR(Number(a.current_bid), false)}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{a.city || 'غير محدد'}</span>
                      <span
                        className={
                          parts.ended
                            ? 'text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md'
                            : ''
                        }
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav active="search" />
    </div>
  )
}
