'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { supabase } from '@/lib/supabase/client'

type Ctx = {
  openNotifications: () => void
  closeNotifications: () => void
  unreadCount: number
  refreshUnread: () => void
}

const NotificationUIContext = createContext<Ctx | null>(null)

export function useNotificationUI() {
  const c = useContext(NotificationUIContext)
  if (!c) {
    return {
      openNotifications: () => {},
      closeNotifications: () => {},
      unreadCount: 0,
      refreshUnread: () => {},
    }
  }
  return c
}

export function NotificationUIProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pollUnread, setPollUnread] = useState(0)
  const [rtUnread, setRtUnread] = useState(0)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    setUserId(u?.user_id ?? null)
  }, [])

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      setPollUnread(0)
      return
    }
    try {
      const res = await fetch('/api/notifications?user_id=' + encodeURIComponent(userId))
      const data = (await res.json()) as { unread_count?: number }
      if (typeof data.unread_count === 'number') setPollUnread(data.unread_count)
    } catch {
      setPollUnread(0)
    }
  }, [userId])

  useEffect(() => {
    void refreshUnread()
    const t = setInterval(() => void refreshUnread(), 60_000)
    return () => clearInterval(t)
  }, [refreshUnread])

  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel('notif-ui-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId },
        () => {
          setRtUnread((x) => x + 1)
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [userId])

  useEffect(() => {
    if (!open) return
    setRtUnread(0)
    void refreshUnread()
  }, [open, refreshUnread])

  const totalUnread = pollUnread + rtUnread

  const value = useMemo(
    () => ({
      openNotifications: () => setOpen(true),
      closeNotifications: () => setOpen(false),
      unreadCount: totalUnread,
      refreshUnread,
    }),
    [totalUnread, refreshUnread]
  )

  return (
    <NotificationUIContext.Provider value={value}>
      {children}
      <NotificationCenter
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        onUnreadChange={(n) => setPollUnread(n)}
      />
    </NotificationUIContext.Provider>
  )
}
