'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { normalizeAuctionImages } from '@/lib/auction-images'

type Report = {
  id: string
  reason: string
  status: string
  created_at: string
  reporter_id: string
  reporter_name: string
  reported_auction_id: string | null
  reported_user_id: string | null
  auction_title: string | null
}

function fmt(d: string) {
  try {
    return format(new Date(d), 'd MMM yyyy HH:mm', { locale: arSA })
  } catch {
    return d
  }
}

export function AdminReports({ userId }: { userId: string }) {
  const [list, setList] = useState<Report[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState<Report | null>(null)
  const [auctionRow, setAuctionRow] = useState<Record<string, unknown> | null>(null)
  const [patching, setPatching] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/reports?user_id=' + encodeURIComponent(userId)
      if (filter !== 'all') url += '&status=' + encodeURIComponent(filter)
      const res = await fetch(url)
      const data = await res.json()
      setList(Array.isArray(data) ? data : data.reports ?? [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [userId, filter])

  useEffect(() => {
    void load()
  }, [load])

  const patch = async (id: string, status: string) => {
    setPatching(id)
    try {
      await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: id, status, user_id: userId }),
      })
      void load()
      setSel(null)
    } finally {
      setPatching(null)
    }
  }

  const loadAuction = async (id: string) => {
    try {
      const res = await fetch(
        '/api/admin/auctions?user_id=' + encodeURIComponent(userId) + '&id=' + encodeURIComponent(id)
      )
      const data = await res.json()
      setAuctionRow(data.auction ?? null)
    } catch {
      setAuctionRow(null)
    }
  }

  const openDetail = (r: Report) => {
    setSel(r)
    setAuctionRow(null)
    if (r.reported_auction_id) void loadAuction(r.reported_auction_id)
  }

  const banReportedUser = async (uid: string) => {
    const reason = prompt('سبب الحظر؟')
    if (!reason?.trim()) return
    await fetch('/api/admin/users/' + uid + '/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, reason }),
    })
    void load()
  }

  const deleteAuction = async (aid: string) => {
    if (!confirm('حذف المزاد المبلّغ عنه؟')) return
    await fetch('/api/admin/auctions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, auction_id: aid }),
    })
    void load()
    setSel(null)
  }

  const imgs = normalizeAuctionImages(auctionRow?.images as string[] | null | undefined)

  return (
    <div className="space-y-4">
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      >
        <option value="all">الكل</option>
        <option value="pending">معلّق</option>
        <option value="reviewed">مراجَع</option>
        <option value="dismissed">مرفوض</option>
      </select>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openDetail(r)}
              className="w-full rounded-xl border border-gray-100 bg-white p-4 text-right shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="font-bold text-gray-900 dark:text-white">{r.reason}</p>
              <p className="text-xs text-gray-500">المبلّغ: {r.reporter_name}</p>
              {r.auction_title && <p className="text-xs text-gray-600">مزاد: {r.auction_title}</p>}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                    (r.status === 'pending' ? 'bg-[#FF8C42]/15 text-orange-800' : 'bg-green-100 text-green-700')
                  }
                >
                  {r.status}
                </span>
                <span className="text-[10px] text-gray-400">{fmt(r.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 dark:bg-slate-800">
            <div className="mb-2 flex justify-between">
              <h3 className="font-bold">تفاصيل البلاغ</h3>
              <button type="button" onClick={() => setSel(null)} className="text-sm text-gray-500">
                إغلاق
              </button>
            </div>
            <p className="text-sm">{sel.reason}</p>
            <p className="text-xs text-gray-500">مزاد: {sel.auction_title || '—'}</p>
            {imgs.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {imgs.slice(0, 4).map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="h-20 w-20 rounded-lg object-cover" />
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={patching === sel.id}
                onClick={() => patch(sel.id, 'reviewed')}
                className="rounded-lg bg-green-100 px-3 py-2 text-xs font-bold text-green-800"
              >
                مراجَع
              </button>
              <button
                type="button"
                disabled={patching === sel.id}
                onClick={() => patch(sel.id, 'dismissed')}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold"
              >
                رفض
              </button>
              {sel.reported_user_id && (
                <button
                  type="button"
                  onClick={() => void banReportedUser(sel.reported_user_id!)}
                  className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700"
                >
                  حظر المستخدم المبلّغ عنه
                </button>
              )}
              {sel.reported_auction_id && (
                <>
                  <Link
                    href={'/auction/' + sel.reported_auction_id}
                    className="rounded-lg bg-[#1B7F7A]/15 px-3 py-2 text-xs font-bold text-[#1B7F7A]"
                  >
                    عرض المزاد
                  </Link>
                  <button
                    type="button"
                    onClick={() => void deleteAuction(sel.reported_auction_id!)}
                    className="rounded-lg bg-orange-100 px-3 py-2 text-xs font-bold text-orange-800"
                  >
                    حذف المزاد
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
