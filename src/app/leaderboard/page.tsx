'use client'

import { Trophy } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import {
  LeaderboardBiddersTable,
  LeaderboardSellersTable,
  type LeaderboardBidderRow,
  type LeaderboardSellerRow,
} from '@/components/leaderboard/LeaderboardTable'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import type { ResponsivenessData } from '@/lib/types/seller-responsiveness'

type PlatformStats = {
  total_auctions: number
  total_bids: number
  deals_completed: number
  avg_price_increase_pct: number
  most_active_category: string
  most_active_category_count: number
}

export default function LeaderboardPage() {
  const [bidders, setBidders] = useState<LeaderboardBidderRow[]>([])
  const [sellers, setSellers] = useState<LeaderboardSellerRow[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [viewerBidder, setViewerBidder] = useState<{
    rank: number
    in_top_10: boolean
    xp: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    const u = readQaboUserFromStorage()
    const q = u?.user_id ? `?user_id=${encodeURIComponent(u.user_id)}` : ''
    setLoading(true)
    void fetch('/api/leaderboard' + q)
      .then((r) => r.json())
      .then((d: {
        topBidders?: LeaderboardBidderRow[]
        topSellers?: LeaderboardSellerRow[]
        platformStats?: PlatformStats
        viewer_bidder?: { rank: number; in_top_10: boolean; xp: number } | null
        error?: string
      }) => {
        if (d.error) {
          setErr(d.error)
          return
        }
        setBidders(d.topBidders ?? [])
        setSellers(
          (d.topSellers ?? []).map((s) => ({
            ...s,
            responsiveness: s.responsiveness as ResponsivenessData,
          }))
        )
        setStats(d.platformStats ?? null)
        setViewerBidder(d.viewer_bidder ?? null)
      })
      .catch(() => setErr('تعذر تحميل لوحة المتصدرين'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 dark:bg-slate-900" dir="rtl">
      <div className="px-4 pt-2">
        <AppHeader title="لوحة المتصدرين" />
      </div>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-4">
        <div className="flex items-center justify-center gap-2 text-[#1B7F7A] dark:text-teal-300">
          <Trophy className="h-10 w-10" weight="duotone" />
          <h1 className="text-xl font-bold">تصنيف قبو</h1>
        </div>

        {err ? (
          <p className="rounded-xl bg-red-50 p-4 text-center text-red-700 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1B7F7A] border-t-transparent" />
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#1F2937] dark:text-slate-100">
                أفضل المزايدين 🏆
              </h2>
              {viewerBidder && !viewerBidder.in_top_10 ? (
                <p className="mb-3 rounded-xl bg-[#E6F4F3] p-3 text-sm text-[#1B7F7A] dark:bg-[#134e4a]/40 dark:text-teal-100">
                  ترتيبك الحالي: <strong>#{viewerBidder.rank}</strong> — لديك{' '}
                  <strong>{viewerBidder.xp.toLocaleString('ar-SA')}</strong> نقطة خبرة
                </p>
              ) : null}
              {bidders.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">لا بيانات كافية بعد.</p>
              ) : (
                <LeaderboardBiddersTable rows={bidders} />
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-4 text-lg font-bold text-[#1F2937] dark:text-slate-100">
                أفضل البائعين ⭐
              </h2>
              {sellers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">لا بيانات كافية بعد.</p>
              ) : (
                <LeaderboardSellersTable rows={sellers} />
              )}
            </section>

            {stats ? (
              <section className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-sm dark:border-slate-600 dark:from-slate-800 dark:to-slate-900">
                <h2 className="mb-4 text-lg font-bold text-[#1F2937] dark:text-slate-100">
                  إحصائيات المنصة
                </h2>
                <ul className="grid gap-3 text-sm text-gray-700 dark:text-slate-300 sm:grid-cols-2">
                  <li className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50">
                    <span className="text-gray-500 dark:text-slate-400">إجمالي المزادات المنشأة</span>
                    <p className="text-2xl font-bold text-[#1B7F7A] dark:text-teal-300">
                      {(stats.total_auctions ?? 0).toLocaleString('ar-SA')}
                    </p>
                  </li>
                  <li className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50">
                    <span className="text-gray-500 dark:text-slate-400">إجمالي المزايدات</span>
                    <p className="text-2xl font-bold text-[#1B7F7A] dark:text-teal-300">
                      {(stats.total_bids ?? 0).toLocaleString('ar-SA')}
                    </p>
                  </li>
                  <li className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50">
                    <span className="text-gray-500 dark:text-slate-400">صفقات مكتملة</span>
                    <p className="text-2xl font-bold text-[#FF8C42]">
                      {(stats.deals_completed ?? 0).toLocaleString('ar-SA')}
                    </p>
                  </li>
                  <li className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50">
                    <span className="text-gray-500 dark:text-slate-400">
                      متوسط ارتفاع السعر عن الافتتاح (عينة)
                    </span>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      %{(stats.avg_price_increase_pct ?? 0).toLocaleString('ar-SA')}
                    </p>
                  </li>
                  <li className="rounded-xl bg-white/80 p-3 sm:col-span-2 dark:bg-slate-900/50">
                    <span className="text-gray-500 dark:text-slate-400">أكثر فئة نشاطاً (عيّنة حديثة)</span>
                    <p className="text-lg font-bold text-[#1F2937] dark:text-slate-100">
                      {stats.most_active_category}{' '}
                      <span className="text-sm font-normal text-gray-500">
                        ({(stats.most_active_category_count ?? 0).toLocaleString('ar-SA')} إعلاناً)
                      </span>
                    </p>
                  </li>
                </ul>
              </section>
            ) : null}
          </>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  )
}
