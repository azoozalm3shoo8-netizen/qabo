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
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm rounded-b-2xl">
        <Link href="/" className="text-amber-600 text-sm font-medium">
          الرئيسية
        </Link>
        <h1 className="font-bold text-lg">الإشعارات</h1>
        <button type="button" onClick={() => void markAll()} className="text-xs text-gray-500">
          تعيين كمقروء
        </button>
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse shadow-sm" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mt-4">
            <p className="text-6xl mb-4">🔔</p>
            <p className="text-gray-600">لا إشعارات حالياً</p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={
                'rounded-2xl p-4 shadow-sm border ' +
                (n.is_read
                  ? 'bg-white border-gray-100'
                  : 'bg-amber-50/80 border-amber-100')
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-bold text-sm text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-2">
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
                  className="inline-block mt-3 text-xs text-amber-600 font-semibold"
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
