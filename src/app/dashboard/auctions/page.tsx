'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PostAuctionReportCard } from '@/components/seller/PostAuctionReportCard'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

type AuctionRow = {
  id: string
  title: string
  status: string
  ends_at?: string
  current_bid?: number
}

const ENDED_LIKE = new Set(['ended', 'sold', 'expired', 'cancelled', 'failed'])

export default function DashboardAuctionsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<AuctionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    setUserId(u?.user_id ?? null)
  }, [])

  useEffect(() => {
    if (!userId) {
      setRows([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetch('/api/auctions?seller_id=' + encodeURIComponent(userId))
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return
        setRows(Array.isArray(data) ? (data as AuctionRow[]) : [])
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const ended = rows.filter((a) => ENDED_LIKE.has(String(a.status)))
  const active = rows.filter((a) => !ENDED_LIKE.has(String(a.status)))

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[#1B7F7A]">مزاداتي</h1>
        <Link href="/create" className="rounded-xl bg-[#1B7F7A] px-4 py-2 text-sm font-bold text-white">
          إنشاء مزاد
        </Link>
      </div>

      {!userId ? (
        <p className="text-sm text-gray-600 dark:text-slate-400">سجّل الدخول لعرض مزاداتك.</p>
      ) : loading ? (
        <p className="text-sm text-gray-500">جاري التحميل…</p>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-gray-800 dark:text-slate-200">نشطة</h2>
              <ul className="space-y-2">
                {active.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={'/auction/' + a.id}
                      className="block rounded-xl border border-gray-100 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <span className="font-semibold text-gray-900 dark:text-slate-100">{a.title}</span>
                      <span className="mt-1 block text-xs text-[#1B7F7A]">
                        {Number(a.current_bid ?? 0).toLocaleString('ar-SA')} ر.س — {a.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {ended.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-gray-800 dark:text-slate-200">منتهية — تقارير الأداء</h2>
              <ul className="space-y-4">
                {ended.map((a) => (
                  <li key={a.id} className="space-y-2">
                    <div className="rounded-xl border border-gray-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                      <Link href={'/auction/' + a.id} className="font-semibold text-[#1B7F7A]">
                        {a.title}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-slate-400">الحالة: {a.status}</p>
                    </div>
                    <PostAuctionReportCard auctionId={a.id} userId={userId} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {rows.length === 0 && <p className="text-sm text-gray-600">لا مزادات بعد.</p>}
        </>
      )}
    </div>
  )
}
