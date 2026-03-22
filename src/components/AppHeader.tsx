'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export function AppHeader({
  title,
  showBrand,
  rightSlot,
}: {
  title?: string
  showBrand?: boolean
  rightSlot?: React.ReactNode
}) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) return
    let uid: string
    try {
      uid = JSON.parse(stored).user_id
    } catch {
      return
    }
    const load = () => {
      fetch('/api/notifications?user_id=' + uid)
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.unread_count === 'number') setUnread(d.unread_count)
        })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

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
          {unread > 0 && (
            <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}
