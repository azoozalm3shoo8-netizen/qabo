'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { HomeGridSkeleton } from '@/components/Skeleton'
import { auctionCountdownParts } from '@/lib/time'

export default function FavoritesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [user, setUser] = useState<{ user_id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/favorites?user_id=' + uid)
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      window.location.href = '/auth/login'
      return
    }
    const u = JSON.parse(stored)
    setUser(u)
    void load(u.user_id)
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  void tick

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm rounded-b-2xl">
        <h1 className="font-bold text-lg text-center text-gray-900">مفضلتي ❤️</h1>
      </div>

      <div className="px-4 mt-4">
        {loading ? (
          <HomeGridSkeleton />
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mt-4">
            <p className="text-6xl mb-4">❤️</p>
            <p className="text-gray-700 font-medium mb-2">لا توجد مفضلات</p>
            <p className="text-gray-400 text-sm mb-6">أضف مزادات من الصفحة الرئيسية</p>
            <Link href="/" className="text-amber-600 font-semibold">
              تصفح المزادات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rows.map((r) => {
              const a = r.auction
              if (!a?.id) return null
              const parts = auctionCountdownParts(a.ends_at, a.status)
              const label = parts.ended
                ? 'انتهى'
                : `${parts.hours}س ${parts.minutes}د ${parts.seconds}ث`
              return (
                <Link
                  key={r.favorite_id}
                  href={'/auction/' + a.id}
                  className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100 relative"
                >
                  <div className="absolute top-2 left-2 z-10">
                    <FavoriteHeart auctionId={a.id} userId={user?.user_id ?? null} />
                  </div>
                  <div className="h-32 bg-gray-100 flex items-center justify-center text-3xl">📦</div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate">{a.title}</h3>
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
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav active="favorites" />
    </div>
  )
}
