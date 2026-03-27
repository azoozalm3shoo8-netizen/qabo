'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Stats = {
  total_auctions: number
  active_auctions: number
  ended_auctions: number
  total_users: number
  total_orders: number
  total_revenue: number
  pending_reports: number
  new_users_today: number
  users_active_today: number
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
  auctions_by_day: Array<{ date: string; count: number }>
  audit_preview: Array<{
    id: string
    action: string
    actor_email: string | null
    created_at: string
  }>
}

function fmt(d: string) {
  try {
    return format(new Date(d), 'd MMM yyyy HH:mm', { locale: arSA })
  } catch {
    return d
  }
}

export function AdminDashboard({
  userId,
  onGoTab,
}: {
  userId: string
  onGoTab: (t: string) => void
}) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'scan' | 'report' | null>(null)
  const [reportText, setReportText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats?user_id=' + encodeURIComponent(userId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر التحميل')
      setStats(data as Stats)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const maxBar = Math.max(1, ...(stats?.auctions_by_day.map((x) => x.count) ?? [1]))

  const runAutoScan = async () => {
    setBusy('scan')
    try {
      const res = await fetch('/api/admin/ai/auto-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onGoTab('ai')
      sessionStorage.setItem('qabo_admin_autoscan', JSON.stringify(data.results ?? []))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل الفحص')
    } finally {
      setBusy(null)
    }
  }

  const runDailyReport = async () => {
    setBusy('report')
    try {
      const res = await fetch('/api/admin/ai/daily-report?user_id=' + encodeURIComponent(userId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReportText(data.ai_summary || '')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل التقرير')
    } finally {
      setBusy(null)
    }
  }

  const exportCsv = (type: string) => {
    window.open(`/api/admin/export?user_id=${encodeURIComponent(userId)}&type=${type}`, '_blank')
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800"
          />
        ))}
      </div>
    )
  }

  if (error && !stats) {
    return <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  if (!stats) return null

  const pendingList = (stats.recent_reports ?? []).filter((r) => r.status === 'pending').slice(0, 5)

  return (
    <div className="space-y-5">
      {error ? <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'إجمالي المزادات', value: stats.total_auctions },
          { label: 'نشطة', value: stats.active_auctions },
          { label: 'منتهية', value: stats.ended_auctions },
          { label: 'المستخدمين', value: stats.total_users },
          { label: 'الطلبات', value: stats.total_orders },
          { label: 'الإيرادات (ر.س)', value: stats.total_revenue.toLocaleString('ar-SA') },
          { label: 'بلاغات معلّقة', value: stats.pending_reports ?? 0 },
          { label: 'مستخدمون جدد اليوم', value: stats.new_users_today ?? 0 },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 font-bold text-gray-900 dark:text-white">مزادات جديدة — آخر 7 أيام</h2>
        <div className="flex h-36 items-end justify-between gap-1">
          {(stats.auctions_by_day ?? []).map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-[28px] rounded-t bg-[#1B7F7A] dark:bg-[#2dd4bf]"
                style={{ height: `${Math.max(8, (d.count / maxBar) * 120)}px` }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-[9px] text-gray-400">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#1B7F7A]/20 bg-[#E6F4F3]/40 p-4 dark:border-slate-600 dark:bg-slate-800/60">
        <h2 className="mb-2 font-bold text-gray-900 dark:text-white">نبض المنصة</h2>
        <p className="text-sm text-gray-700 dark:text-slate-300">
          مستخدمون نشطون اليوم (تحديث الملف): <b>{stats.users_active_today}</b> — مزادات نشطة:{' '}
          <b>{stats.active_auctions}</b>
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runAutoScan()}
          className="rounded-xl bg-[#FF8C42] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy === 'scan' ? 'جاري الفحص...' : 'فحص AI تلقائي'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runDailyReport()}
          className="rounded-xl bg-[#1B7F7A] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy === 'report' ? 'جاري التقرير...' : 'تقرير يومي'}
        </button>
        <button
          type="button"
          onClick={() => exportCsv('users')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-800"
        >
          تصدير مستخدمين
        </button>
        <button
          type="button"
          onClick={() => exportCsv('auctions')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-800"
        >
          تصدير مزادات
        </button>
        <button
          type="button"
          onClick={() => exportCsv('orders')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-800"
        >
          تصدير معاملات
        </button>
      </div>

      {reportText ? (
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="font-bold text-gray-900 dark:text-white">ملخص اليوم</p>
          <p className="mt-2 text-gray-700 dark:text-slate-300">{reportText}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h2 className="mb-2 font-bold text-gray-900 dark:text-white">آخر أنشطة التدقيق</h2>
          <div className="space-y-2">
            {(stats.audit_preview ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">لا سجلات</p>
            ) : (
              (stats.audit_preview ?? []).map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-gray-100 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="font-semibold text-gray-900 dark:text-white">{a.action}</p>
                  <p className="text-xs text-gray-500">{a.actor_email || '—'}</p>
                  <p className="text-[10px] text-gray-400">{fmt(a.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </section>
        <section>
          <h2 className="mb-2 font-bold text-gray-900 dark:text-white">أحدث بلاغات معلّقة</h2>
          <div className="space-y-2">
            {pendingList.length === 0 ? (
              <p className="text-sm text-gray-500">لا بلاغات معلّقة في المعاينة</p>
            ) : (
              pendingList.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-100 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <p className="font-semibold text-gray-900 dark:text-white">{r.reason}</p>
                  <p className="text-xs text-gray-500">من: {r.reporter_name}</p>
                  <p className="text-[10px] text-gray-400">{fmt(r.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-2 font-bold text-gray-900 dark:text-white">آخر المزادات</h2>
        <div className="space-y-2">
          {stats.recent_auctions.slice(0, 5).map((a) => (
            <Link
              key={a.id}
              href={'/auction/' + a.id}
              className="block rounded-xl border border-gray-100 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="truncate font-bold text-gray-900 dark:text-white">{a.title}</p>
              <p className="text-xs text-gray-500">{a.seller_name}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
