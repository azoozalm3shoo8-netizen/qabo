'use client'

import { ChatCircle, UserCircle } from '@phosphor-icons/react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

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
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login'
      return
    }
    void load(u.user_id)
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
      <div className="sticky top-0 z-30 rounded-b-2xl border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
        <h1 className="flex items-center justify-center gap-2 text-center text-lg font-bold text-gray-900">
          <ChatCircle className="h-6 w-6 text-[#1B7F7A]" weight="fill" />
          الرسائل
        </h1>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <EmptyState
              icon={<ChatCircle className="h-14 w-14 text-[#1B7F7A]" weight="duotone" />}
              title="لا محادثات بعد"
              description="تواصل مع البائع من صفحة المزاد"
              action={{ label: 'تصفح المزادات', href: '/' }}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((c) => (
              <Link
                key={c.id}
                href={'/messages/' + c.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[#1B7F7A]/30"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E6F4F3] text-[#1B7F7A] shadow-inner">
                  <UserCircle className="h-8 w-8" weight="fill" />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-bold text-gray-900">{c.other_user.full_name}</h3>
                    <span className="shrink-0 text-[10px] text-gray-400">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-gray-500">{c.last_message || '...'}</p>
                    {c.unread_count > 0 && (
                      <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[#FF8C42] px-1.5 text-xs font-bold text-white">
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

      <BottomNav active="home" />
    </div>
  )
}
