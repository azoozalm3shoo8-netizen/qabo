'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAdminUserId, ADMIN_USER_IDS } from '@/lib/admin-ids'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Stats = {
  total_auctions: number
  active_auctions: number
  ended_auctions: number
  total_users: number
  total_orders: number
  total_revenue: number
  recent_auctions: Array<{
    id: string
    title: string
    status: string
    current_bid: number
    created_at: string
    seller_name: string
  }>
  recent_reports: Array<{
    id: string
    reason: string
    status: string
    created_at: string
    reporter_name: string
    auction_title: string | null
  }>
}

export default function AdminPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [patching, setPatching] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      router.replace('/')
      return
    }
    const u = JSON.parse(stored) as { user_id: string }
    if (!isAdminUserId(u.user_id)) {
      router.replace('/')
      return
    }
    setUserId(u.user_id)
  }, [router])

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats?user_id=' + encodeURIComponent(uid))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر التحميل')
      setStats(data as Stats)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userId) void load(userId)
  }, [userId, load])

  const markReportReviewed = async (reportId: string) => {
    if (!userId) return
    setPatching(reportId)
    try {
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          status: 'reviewed',
          user_id: userId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التحديث')
      await load(userId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setPatching(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg"
          aria-label="رجوع"
        >
          →
        </Link>
        <h1 className="font-bold text-lg text-gray-900 flex-1 text-center">لوحة التحكم</h1>
        <div className="w-10" />
      </header>

      <p className="text-[10px] text-center text-gray-400 px-4 mt-2">
        معرّفات المشرف: {ADMIN_USER_IDS.join(', ')}
      </p>

      {loading && (
        <div className="px-4 mt-4 space-y-3">
          <div className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-gray-100" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="mx-4 mt-4 bg-red-50 text-red-700 rounded-xl p-4 text-sm border border-red-100">
          {error}
        </div>
      )}

      {!loading && stats && (
        <div className="px-4 mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-2xl mb-1">🏷️</p>
              <p className="text-2xl font-extrabold text-amber-800">{stats.total_auctions}</p>
              <p className="text-xs text-amber-900 font-medium">إجمالي المزادات</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
              <p className="text-2xl mb-1">✅</p>
              <p className="text-2xl font-extrabold text-green-800">{stats.active_auctions}</p>
              <p className="text-xs text-green-900 font-medium">مزادات نشطة</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-2xl mb-1">👥</p>
              <p className="text-2xl font-extrabold text-blue-800">{stats.total_users}</p>
              <p className="text-xs text-blue-900 font-medium">المستخدمين</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <p className="text-2xl mb-1">📦</p>
              <p className="text-2xl font-extrabold text-purple-800">{stats.total_orders}</p>
              <p className="text-xs text-purple-900 font-medium">الطلبات</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">إيرادات المبيعات المكتملة</p>
            <p className="text-2xl font-extrabold text-gray-900">
              {Number(stats.total_revenue).toLocaleString()} ر.س
            </p>
          </div>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">آخر المزادات</h2>
            <div className="space-y-2">
              {stats.recent_auctions.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد مزادات</p>
              ) : (
                stats.recent_auctions.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl p-3 border border-gray-100 text-sm shadow-sm"
                  >
                    <p className="font-bold text-gray-900 truncate">{a.title}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100">{a.status}</span>
                      <span>{a.seller_name}</span>
                      <span className="text-amber-600 font-bold">
                        {Number(a.current_bid).toLocaleString()} ر.س
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {format(new Date(a.created_at), 'd MMM yyyy HH:mm', { locale: arSA })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-gray-900 mb-2">آخر البلاغات</h2>
            <div className="space-y-2">
              {stats.recent_reports.length === 0 ? (
                <p className="text-sm text-gray-500">لا توجد بلاغات</p>
              ) : (
                stats.recent_reports.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl p-3 border border-gray-100 text-sm shadow-sm"
                  >
                    <p className="font-semibold text-gray-900">{r.reason}</p>
                    <p className="text-xs text-gray-600 mt-1">من: {r.reporter_name}</p>
                    {r.auction_title && (
                      <p className="text-xs text-gray-500 mt-0.5">مزاد: {r.auction_title}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {r.status}
                      </span>
                      <button
                        type="button"
                        disabled={patching === r.id || r.status === 'reviewed'}
                        onClick={() => void markReportReviewed(r.id)}
                        className="text-xs font-bold text-amber-700 disabled:opacity-40"
                      >
                        {patching === r.id ? '...' : 'تعيين كمراجَع'}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {format(new Date(r.created_at), 'd MMM yyyy HH:mm', { locale: arSA })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
