'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

export function AppHeader({
  title,
  showBrand,
  rightSlot,
}: {
  title?: string
  showBrand?: boolean
  rightSlot?: React.ReactNode
}) {
  const [pollUnread, setPollUnread] = useState(0)
  const [headerUserId, setHeaderUserId] = useState<string | null>(null)
  const { realtimeUnread, resetUnread } = useRealtimeNotifications(headerUserId)

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      setHeaderUserId(null)
      return
    }
    try {
      const uid = JSON.parse(stored).user_id as string
      setHeaderUserId(uid)
    } catch {
      setHeaderUserId(null)
    }
  }, [])

  useEffect(() => {
    if (!headerUserId) return
    const load = () => {
      fetch('/api/notifications?user_id=' + encodeURIComponent(headerUserId))
        .then((r) => r.json())
        .then((d: { unread_count?: number }) => {
          if (typeof d.unread_count === 'number') {
            setPollUnread(d.unread_count)
            resetUnread()
          }
        })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [headerUserId, resetUnread])

  const totalUnread = pollUnread + realtimeUnread

  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      {showBrand ? (
        <h1 className="text-2xl font-bold text-amber-500">قبو</h1>
      ) : title ? (
        <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2 flex-shrink-0">
        {rightSlot}
        <Link
          href="/notifications"
          className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg hover:bg-gray-200 transition-colors"
          aria-label="الإشعارات"
        >
          🔔
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}
