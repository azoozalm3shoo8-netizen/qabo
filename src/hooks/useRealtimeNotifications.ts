import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { showLocalNotification } from '@/lib/notifications/push'

export type NotificationPayload = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  auction_id?: string
  is_read: boolean
  created_at: string
}

export function useRealtimeNotifications(userId: string | null) {
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null)
  const [realtimeUnread, setRealtimeUnread] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('user-notifs-' + userId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.' + userId,
        },
        (payload) => {
          const n = payload.new as NotificationPayload
          setLatestNotification(n)
          setRealtimeUnread((c) => c + 1)
          showLocalNotification(
            n.title || 'إشعار جديد',
            n.message || '',
            n.auction_id ? '/auction/' + n.auction_id : '/notifications'
          )
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  const resetUnread = useCallback(() => setRealtimeUnread(0), [])

  return { latestNotification, realtimeUnread, resetUnread }
}
