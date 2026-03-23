'use client'

import { useEffect, useState } from 'react'
import {
  getPermissionStatus,
  isPushSupported,
  requestNotificationPermission,
} from '@/lib/notifications/push'

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      setVisible(false)
      return
    }
    if (!isPushSupported()) {
      setVisible(false)
      return
    }
    const perm = getPermissionStatus()
    if (perm === 'granted' || perm === 'denied') {
      setVisible(false)
      return
    }
    if (localStorage.getItem('qabo_push_dismissed') === 'true') {
      setVisible(false)
      return
    }
    setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div
      className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      dir="rtl"
    >
      <p className="text-sm text-amber-900 font-medium">🔔 فعّل الإشعارات عشان ما يفوتك شيء!</p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={async () => {
            await requestNotificationPermission()
            setVisible(false)
          }}
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-white"
        >
          تفعيل
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('qabo_push_dismissed', 'true')
            setVisible(false)
          }}
          className="text-sm text-gray-500"
        >
          لاحقاً
        </button>
      </div>
    </div>
  )
}
