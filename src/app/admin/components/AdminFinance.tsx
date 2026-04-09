'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatSAR } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Fin = {
  total_revenue: number
  completed_transactions: number
  avg_auction_value: number
  total_commissions_estimate: number
  recent_wallet_transactions: Array<Record<string, unknown>>
  recent_orders: Array<Record<string, unknown>>
  revenue_by_day: Array<{ date: string; amount: number }>
}

function fmt(d: string) {
  try {
    return format(new Date(d), 'd MMM', { locale: arSA })
  } catch {
    return d
  }
}

export function AdminFinance({ userId }: { userId: string }) {
  const [data, setData] = useState<Fin | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ user_id: userId, status })
      if (dateFrom) p.set('date_from', dateFrom)
      if (dateTo) p.set('date_to', dateTo)
      const res = await fetch('/api/admin/finance?' + p.toString())
      const j = await res.json()
      if (res.ok) setData(j as Fin)
      else setData(null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [userId, status, dateFrom, dateTo])

  useEffect(() => {
    void load()
  }, [load])

  const maxR = Math.max(1, ...(data?.revenue_by_day.map((x) => x.amount) ?? [1]))

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  if (!data) return <p className="text-sm text-red-600">تعذر تحميل المالية</p>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: 'إجمالي الإيرادات', v: formatSAR(data.total_revenue, false) },
          { l: 'معاملات مكتملة', v: data.completed_transactions },
          { l: 'متوسط قيمة مزاد', v: formatSAR(data.avg_auction_value, false) },
          { l: 'تقدير عمولات', v: formatSAR(data.total_commissions_estimate, false) },
        ].map((c) => (
          <div key={c.l} className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{c.v}</p>
            <p className="text-xs text-gray-500">{c.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">كل الطلبات</option>
          <option value="delivered">مكتمل</option>
          <option value="pending">غير مكتمل</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
        />
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 font-bold">إيرادات يومية — 7 أيام</h2>
        <div className="flex h-32 items-end justify-between gap-1">
          {(data.revenue_by_day ?? []).map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-[28px] rounded-t bg-[#FF8C42]"
                style={{ height: `${Math.max(6, (d.amount / maxR) * 110)}px` }}
              />
              <span className="text-[9px] text-gray-400">{fmt(d.date)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">آخر الطلبات</h2>
        <div className="space-y-2">
          {(data.recent_orders ?? []).slice(0, 15).map((o) => (
            <div key={String(o.id)} className="rounded-xl border border-gray-100 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
              <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(o, null, 2)}</pre>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">محفظة — آخر حركات</h2>
        <div className="space-y-2">
          {(data.recent_wallet_transactions ?? []).map((t) => (
            <div key={String(t.id)} className="rounded-xl border border-gray-100 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
              <pre className="overflow-x-auto">{JSON.stringify(t, null, 2)}</pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
