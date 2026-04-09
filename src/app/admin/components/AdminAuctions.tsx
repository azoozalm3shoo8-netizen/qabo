'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { formatSAR } from '@/lib/utils/currency'

type Auction = Record<string, unknown> & {
  id: string
  title: string
  status: string
  current_bid: number
  seller_id: string
  seller_full_name?: string
  created_at: string
  category?: string | null
  images?: unknown
}

function fmt(d: string) {
  try {
    return format(new Date(d), 'd MMM yyyy HH:mm', { locale: arSA })
  } catch {
    return d
  }
}

export function AdminAuctions({ userId }: { userId: string }) {
  const [list, setList] = useState<Auction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<Auction | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({
        user_id: userId,
        page: String(page),
        limit: '12',
        status,
      })
      if (search) p.set('search', search)
      if (category.trim()) p.set('category', category.trim())
      const res = await fetch('/api/admin/auctions?' + p.toString())
      const data = await res.json()
      if (res.ok) {
        setList((data.auctions ?? []) as Auction[])
        setTotal(data.total ?? 0)
      }
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [userId, page, search, status, category])

  useEffect(() => {
    void load()
  }, [load])

  const patchStatus = async (id: string, next: string) => {
    if (!confirm('تغيير حالة المزاد؟')) return
    setBusy(id)
    try {
      await fetch('/api/admin/auctions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, auction_id: id, status: next }),
      })
      void load()
      setModal(null)
    } finally {
      setBusy(null)
    }
  }

  const deleteAuc = async (id: string) => {
    if (!confirm('حذف المزاد نهائياً؟')) return
    setBusy(id)
    try {
      await fetch('/api/admin/auctions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, auction_id: id }),
      })
      void load()
      setModal(null)
    } finally {
      setBusy(null)
    }
  }

  const runAi = async (title: string, description: string) => {
    const res = await fetch('/api/admin/ai/moderate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, text: title + '\n' + description }),
    })
    const data = await res.json()
    alert(JSON.stringify(data, null, 2))
  }

  const pages = Math.max(1, Math.ceil(total / 12))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="بحث بالعنوان..."
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="ended">منتهي</option>
        </select>
        <input
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
          placeholder="تصنيف"
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-white dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((a) => {
            const imgs = normalizeAuctionImages(a.images as string[] | null | undefined)
            const thumb = imgs[0]
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setModal(a)}
                className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-right shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-700">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-bold text-gray-900 dark:text-white">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.seller_full_name}</p>
                  <p className="text-sm font-bold text-[#1B7F7A]">{formatSAR(Number(a.current_bid), false)}</p>
                  <span
                    className={
                      'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                      (a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')
                    }
                  >
                    {a.status}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold disabled:opacity-40 dark:bg-slate-700"
          >
            السابق
          </button>
          <span className="py-2 text-sm">
            {page}/{pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold disabled:opacity-40 dark:bg-slate-700"
          >
            التالي
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">تفاصيل المزاد</h3>
              <button type="button" onClick={() => setModal(null)} className="text-sm text-gray-500">
                إغلاق
              </button>
            </div>
            <p className="font-bold">{modal.title}</p>
            <p className="text-xs text-gray-500">{fmt(String(modal.created_at))}</p>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-gray-50 p-2 text-[10px] dark:bg-slate-900">
              {JSON.stringify(modal, null, 2)}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={'/auction/' + modal.id}
                className="rounded-lg bg-[#1B7F7A]/15 px-3 py-2 text-xs font-bold text-[#1B7F7A]"
              >
                عرض العامة
              </Link>
              <button
                type="button"
                disabled={busy === modal.id}
                onClick={() => patchStatus(modal.id, modal.status === 'active' ? 'ended' : 'active')}
                className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800"
              >
                {modal.status === 'active' ? 'إيقاف' : 'تفعيل'}
              </button>
              <button
                type="button"
                disabled={busy === modal.id}
                onClick={() => void runAi(String(modal.title), String(modal.description ?? ''))}
                className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-800"
              >
                فحص AI
              </button>
              <button
                type="button"
                disabled={busy === modal.id}
                onClick={() => void deleteAuc(modal.id)}
                className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
