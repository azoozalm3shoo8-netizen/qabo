'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'

type N = {
  id: string
  type: string
  title: string
  message: string
  auction_id: string | null
  is_read: boolean
  created_at: string
}

function unreadCardClass(n: N) {
  const t = (n.type || '').toLowerCase()
  if (t.includes('bid') || t.includes('مزايد'))
    return 'border border-[#FF8C42]/25 bg-orange-50/90'
  if (t.includes('success') || t.includes('paid') || t.includes('نجاح'))
    return 'border border-emerald-200 bg-emerald-50/90'
  if (t.includes('warn') || t.includes('cancel') || t.includes('تحذير'))
    return 'border border-red-200 bg-red-50/90'
  return 'border border-[#1B7F7A]/15 bg-[#E6F4F3]/90'
}

export default function NotificationsPage() {
  const [items, setItems] = useState<N[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?user_id=' + uid)
      const data = await res.json()
      setItems(Array.isArray(data.notifications) ? data.notifications : [])
    } catch {
      setItems([])
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
    const uid = JSON.parse(stored).user_id
    setUserId(uid)
    void load(uid)
  }, [load])

  const markAll = async () => {
    if (!userId) return
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, mark_all_read: true }),
    })
    void load(userId)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="flex items-center justify-between rounded-b-2xl border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
        <Link href="/" className="text-sm font-medium text-[#1B7F7A]">
          الرئيسية
        </Link>
        <h1 className="text-lg font-bold">الإشعارات</h1>
        <button type="button" onClick={() => void markAll()} className="text-xs text-gray-500">
          تعيين كمقروء
        </button>
      </div>

      <div className="space-y-2 p-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <p className="mb-4 text-6xl">🔔</p>
            <p className="text-gray-600">لا إشعارات حالياً</p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={
                'rounded-2xl p-4 shadow-sm ' +
                (n.is_read ? 'border border-gray-100 bg-white' : unreadCardClass(n))
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-sm font-bold text-gray-900">{n.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{n.message}</p>
                  <p className="mt-2 text-[10px] text-gray-400">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                      locale: arSA,
                    })}
                  </p>
                </div>
              </div>
              {n.auction_id && (
                <Link
                  href={'/auction/' + n.auction_id}
                  className="mt-3 inline-block text-xs font-semibold text-[#1B7F7A]"
                >
                  عرض المزاد →
                </Link>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav active="home" />
    </div>
  )
}
