'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { categoryBySlug, categoryNameFromParam } from '@/lib/constants'
import { auctionCountdownParts } from '@/lib/time'

export default function CategoryAuctionsPage() {
  const params = useParams()
  const raw = typeof params.name === 'string' ? params.name : ''
  const categoryName = categoryNameFromParam(raw)
  const meta = categoryBySlug(raw)

  const [auctions, setAuctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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
    const stored = localStorage.getItem('qabo_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        setUser(null)
      }
    }
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
        <BottomNav active="categories" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link
          href="/categories"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
        >
          →
        </Link>
        <h1 className="font-bold text-lg flex-1 truncate">{title}</h1>
        <span className="text-xs text-gray-400 shrink-0">{auctions.length} مزاد</span>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-white rounded-xl animate-pulse shadow-sm" />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-gray-600">لا توجد مزادات في هذا التصنيف حالياً</p>
            <Link href="/" className="inline-block mt-4 text-[#1B7F7A] font-medium">
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
                  className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100 relative"
                >
                  <div className="absolute top-2 left-2 z-10">
                    <FavoriteHeart auctionId={a.id} userId={user?.user_id ?? null} />
                  </div>
                  <div className="h-32 bg-gray-100 flex items-center justify-center text-3xl">📦</div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate">{a.title}</h3>
                    <p className="text-[#1B7F7A] font-bold mt-1">
                      {Number(a.current_bid).toLocaleString()} ر.س
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
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

      <BottomNav active="categories" />
    </div>
  )
}
