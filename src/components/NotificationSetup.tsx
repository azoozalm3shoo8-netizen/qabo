'use client'

import { useEffect, useState } from 'react'
import { requestFirebaseNotificationToken } from '@/lib/firebase'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

export function NotificationSetup() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const u = readQaboUserFromStorage()
        if (!u) return
        if (localStorage.getItem('qabboo_notif_banner_dismiss') === '1') return
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') return
        setVisible(true)
      } catch {
        /* ignore */
      }
    }, 5000)
    return () => window.clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className="pointer-events-auto fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-800"
      dir="rtl"
    >
      <p className="text-center text-sm font-bold text-[#1F2937] dark:text-slate-100">
        لا تفوّت المزادات! فعّل الإشعارات
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={async () => {
            const u = readQaboUserFromStorage()
            const token = await requestFirebaseNotificationToken()
            if (token && u) {
              await fetch('/api/push-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: u.user_id, token }),
              })
            }
            setVisible(false)
          }}
          className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white"
        >
          فعّل الإشعارات
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem('qabboo_notif_banner_dismiss', '1')
            } catch {
              /* ignore */
            }
            setVisible(false)
          }}
          className="flex-1 rounded-xl bg-gray-200 py-2.5 text-sm font-bold text-[#1F2937] dark:bg-slate-700 dark:text-slate-200"
        >
          لاحقاً
        </button>
      </div>
    </div>
  )
}
