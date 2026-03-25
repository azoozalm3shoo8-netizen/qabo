'use client'

import { Heart, Image as ImageIcon } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { EmptyState } from '@/components/EmptyState'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { HomeGridSkeleton } from '@/components/Skeleton'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { auctionCountdownParts } from '@/lib/time'

function FavThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="flex h-32 items-center justify-center bg-[#F3F4F6] text-[#1B7F7A]">
        <ImageIcon className="h-12 w-12 opacity-50" weight="duotone" />
      </div>
    )
  }
  return (
    <div className="relative h-32 w-full bg-gray-100">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        sizes="50vw"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

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
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login'
      return
    }
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
      <div className="rounded-b-2xl border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
        <h1 className="flex items-center justify-center gap-2 text-center text-lg font-bold text-gray-900">
          <Heart className="h-6 w-6 text-red-500" weight="fill" />
          مفضلتي
        </h1>
      </div>

      <div className="mt-4 px-4">
        {loading ? (
          <HomeGridSkeleton />
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <EmptyState
              icon={<Heart className="h-14 w-14 text-red-500" weight="fill" />}
              title="لا توجد مفضلات"
              subtitle="أضف مزادات من الصفحة الرئيسية"
              actionLabel="تصفح المزادات"
              actionHref="/"
            />
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
              const imgs = normalizeAuctionImages(a.images)
              const firstImg = imgs[0] ?? null
              return (
                <Link
                  key={r.favorite_id}
                  href={'/auction/' + a.id}
                  className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="absolute top-2 left-2 z-10 rounded-full bg-white p-1 shadow-md ring-1 ring-white/80">
                    <FavoriteHeart auctionId={a.id} userId={user?.user_id ?? null} />
                  </div>
                  <FavThumb src={firstImg} />
                  <div className="p-3">
                    <h3 className="truncate text-sm font-medium">{a.title}</h3>
                    <p className="mt-1 text-base font-bold text-[#1B7F7A]">
                      {Number(a.current_bid).toLocaleString()} ر.س
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{a.city || 'غير محدد'}</span>
                      <span
                        className={
                          parts.ended
                            ? 'rounded-md bg-red-50 px-2 py-0.5 font-semibold text-red-600'
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
