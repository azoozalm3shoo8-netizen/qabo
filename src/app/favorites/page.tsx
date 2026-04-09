'use client'

import { Heart } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { AuctionCard, type AuctionCardAuction } from '@/components/auction/AuctionCard'
import { BottomNav } from '@/components/BottomNav'
import { HomeGridSkeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

type FavRow = {
  favorite_id: string
  auction: {
    id: string
    title: string
    current_bid: number
    bid_count: number
    ends_at: string
    status: string
    images?: unknown
    city?: string | null
  } | null
}

export default function FavoritesPage() {
  const [rows, setRows] = useState<FavRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
    setUserId(u.user_id)
    void load(u.user_id)
  }, [load])

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-slate-900" dir="rtl">
      <div className="rounded-b-2xl border-b border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="flex items-center justify-center gap-2 text-center text-lg font-bold text-gray-900 dark:text-slate-100">
          <Heart className="h-6 w-6 text-red-500" weight="fill" />
          مفضلتي
        </h1>
      </div>

      <div className="mt-4 px-4">
        {loading ? (
          <HomeGridSkeleton />
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <EmptyState
              icon={<span className="text-5xl">❤️</span>}
              title="لا مفضلات بعد"
              description="تابع المزادات التي تعجبك بالضغط على ❤️"
              action={{ label: 'تصفح المزادات', href: '/' }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rows.map((r) => {
              const a = r.auction
              if (!a?.id) return null
              const card: AuctionCardAuction = {
                id: a.id,
                title: a.title,
                current_bid: Number(a.current_bid ?? 0),
                bid_count: Number(a.bid_count ?? 0),
                ends_at: a.ends_at,
                status: a.status,
                images: a.images,
                city: a.city ?? null,
              }
              return <AuctionCard key={r.favorite_id} auction={card} userId={userId} />
            })}
          </div>
        )}
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
