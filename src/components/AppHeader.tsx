'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell } from '@phosphor-icons/react'
import { QabbooLogo } from '@/components/QabbooLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

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
  const [shakeBell, setShakeBell] = useState(false)
  const { realtimeUnread, resetUnread } = useRealtimeNotifications(headerUserId)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    setHeaderUserId(u?.user_id ?? null)
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

  useEffect(() => {
    if (totalUnread <= 0) return
    setShakeBell(true)
    const id = window.setTimeout(() => setShakeBell(false), 600)
    return () => window.clearTimeout(id)
  }, [totalUnread])

  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      {showBrand ? (
        <QabbooLogo variant="header" />
      ) : title ? (
        <h1 className="text-lg font-bold text-gray-900 truncate dark:text-slate-100">{title}</h1>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2 flex-shrink-0">
        {rightSlot}
        <ThemeToggle />
        <Link
          href="/notifications"
          className={
            'relative flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-[#1B7F7A] transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-teal-300 dark:hover:bg-slate-600 ' +
            (shakeBell && totalUnread > 0 ? 'animate-bell-shake' : '')
          }
          aria-label="الإشعارات"
        >
          <Bell className="h-5 w-5" weight={totalUnread > 0 ? 'fill' : 'regular'} />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}
