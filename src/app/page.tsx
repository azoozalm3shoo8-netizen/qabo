'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { PullToRefresh } from '@/components/PullToRefresh'
import { HomeGridSkeleton } from '@/components/Skeleton'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { SAUDI_CITIES } from '@/lib/constants'
import { auctionCountdownParts } from '@/lib/time'

function AuctionListingThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-400">
        <span className="text-4xl" aria-hidden>
          📷
        </span>
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt=""
      fill
      className="object-cover"
      sizes="(max-width: 640px) 50vw, 33vw"
      onError={() => setFailed(true)}
    />
  )
}

export default function HomePage() {
  const [auctions, setAuctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('الكل')
  const [user, setUser] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [tick, setTick] = useState(0)

  const categories = useMemo(
    () => ['الكل', 'إلكترونيات', 'سيارات', 'عقارات', 'أزياء', 'ساعات', 'أثاث', 'رياضة', 'كتب', 'أخرى'],
    []
  )

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (search.trim()) p.set('q', search.trim())
    if (city) p.set('city', city)
    if (category !== 'الكل') p.set('category', category)
    const qs = p.toString()
    return '/api/auctions' + (qs ? '?' + qs : '')
  }, [search, city, category])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl())
      const data = await res.json()
      if (Array.isArray(data)) setAuctions(data)
      else setAuctions([])
    } catch {
      setAuctions([])
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

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
    const h = setTimeout(() => void load(), 280)
    return () => clearTimeout(h)
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  void tick

  return (
    <PullToRefresh onRefresh={load}>
      <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
        <div className="bg-white px-4 pt-4 pb-2 shadow-sm rounded-b-2xl">
          <AppHeader
            showBrand
            rightSlot={
              user ? (
                <Link
                  href="/profile"
                  className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center text-sm shadow-sm"
                >
                  👤
                </Link>
              ) : (
                <Link href="/auth/login" className="text-sm text-amber-600 font-medium px-2">
                  دخول
                </Link>
              )
            }
          />
          <div className="flex flex-col gap-2 mb-3">
            <div className="relative">
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                aria-hidden
              >
                🔍
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في عنوان المزاد..."
                className="w-full pr-10 pl-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
              />
            </div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">كل المدن</option>
              {SAUDI_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  'px-4 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0 shadow-sm ' +
                  (category === c ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600')
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {!user && (
          <div className="px-4 mt-4">
            <h3 className="font-bold text-sm text-gray-700 mb-2">كيف يعمل قبو؟</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <div className="flex-shrink-0 w-28 bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                <span className="text-2xl block mb-1">📝</span>
                <span className="text-xs font-medium text-gray-700">سجّل حسابك</span>
              </div>
              <div className="flex-shrink-0 w-28 bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                <span className="text-2xl block mb-1">🏷️</span>
                <span className="text-xs font-medium text-gray-700">زايد على ما تحب</span>
              </div>
              <div className="flex-shrink-0 w-28 bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                <span className="text-2xl block mb-1">🏆</span>
                <span className="text-xs font-medium text-gray-700">اربح وادفع</span>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">مزادات حية 🔴</h2>
            <Link href="/auction" className="text-sm text-amber-600 font-medium">
              عرض الكل ←
            </Link>
          </div>
          {loading ? (
            <HomeGridSkeleton />
          ) : auctions.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-gray-600 font-medium mb-1">لا توجد مزادات مطابقة</p>
              <p className="text-gray-400 text-sm mb-6">جرّب تغيير البحث أو التصنيف</p>
              {user && (
                <Link
                  href="/create"
                  className="inline-block px-6 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium shadow-md"
                >
                  أنشئ مزاداً جديداً
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {auctions.slice(0, 6).map((a) => {
                const parts = auctionCountdownParts(a.ends_at, a.status)
                const label = parts.ended
                  ? 'انتهى'
                  : `${parts.hours}س ${parts.minutes}د ${parts.seconds}ث`
                const imgs = normalizeAuctionImages(a.images)
                const firstImg = imgs[0] ?? null
                return (
                  <Link
                    key={a.id}
                    href={'/auction/' + a.id}
                    className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100/80 relative group hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <FavoriteHeart auctionId={a.id} userId={user?.user_id ?? null} />
                    </div>
                    <div className="relative aspect-square w-full bg-gray-100 overflow-hidden rounded-t-lg">
                      <AuctionListingThumb src={firstImg} />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm truncate leading-snug">{a.title}</h3>
                      <p className="text-amber-600 font-bold mt-1">
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
                      <p className="text-xs text-gray-400 mt-1">{a.bid_count} مزايدة</p>
                    </div>
                  </Link>
                )
              })}
              </div>
              {auctions.length > 6 && (
                <Link
                  href="/auction"
                  className="block text-center py-3 mt-3 bg-white rounded-xl shadow-sm border border-gray-100 text-amber-600 font-medium text-sm"
                >
                  عرض المزيد ({auctions.length - 6}+)
                </Link>
              )}
            </>
          )}
        </div>

        <BottomNav active="home" />
      </div>
    </PullToRefresh>
  )
}
