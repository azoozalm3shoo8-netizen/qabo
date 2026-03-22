'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Conv = {
  id: string
  auction_id: string | null
  last_message: string | null
  last_message_at: string | null
  other_user: { id: string; full_name: string; avatar_url: string | null }
  unread_count: number
}

export default function MessagesPage() {
  const [list, setList] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/messages?user_id=' + uid)
      const data = await res.json()
      setList(Array.isArray(data) ? data : [])
    } catch {
      setList([])
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
    try {
      const u = JSON.parse(stored).user_id as string
      setUserId(u)
      void load(u)
    } catch {
      window.location.href = '/auth/login'
    }
  }, [load])

  const timeAgo = (iso: string | null) => {
    if (!iso) return ''
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: arSA })
    } catch {
      return ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 shadow-sm rounded-b-2xl">
        <h1 className="font-bold text-lg text-center text-gray-900">الرسائل</h1>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl shadow-sm animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mt-4">
            <p className="text-6xl mb-4">💬</p>
            <p className="text-gray-700 font-medium mb-2">لا محادثات بعد</p>
            <p className="text-gray-400 text-sm mb-6">تواصل مع البائع من صفحة المزاد</p>
            <Link href="/" className="text-amber-600 font-semibold">
              تصفح المزادات
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((c) => (
              <Link
                key={c.id}
                href={'/messages/' + c.id}
                className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-amber-200 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  👤
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-gray-900 truncate">
                      {c.other_user.full_name}
                    </h3>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <p className="text-sm text-gray-500 truncate">{c.last_message || '...'}</p>
                    {c.unread_count > 0 && (
                      <span className="bg-amber-500 text-white text-xs min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center font-bold shrink-0">
                        {c.unread_count > 99 ? '99+' : c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="messages" />
    </div>
  )
}
