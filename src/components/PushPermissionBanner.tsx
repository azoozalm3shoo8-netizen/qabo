'use client'

import { useEffect, useState } from 'react'
import { Bell } from '@phosphor-icons/react'
import {
  getPermissionStatus,
  isPushSupported,
  requestNotificationPermission,
} from '@/lib/notifications/push'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
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
      className="mb-3 flex flex-col gap-2 rounded-xl border border-[#1B7F7A]/20 bg-[#E6F4F3] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
      dir="rtl"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-[#156661]">
        <Bell className="h-5 w-5 shrink-0 text-[#1B7F7A]" weight="fill" />
        فعّل الإشعارات عشان ما يفوتك شيء!
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            await requestNotificationPermission()
            setVisible(false)
          }}
          className="rounded-lg bg-[#FF8C42] px-4 py-1.5 text-sm font-bold text-white transition-transform active:scale-95 hover:bg-[#E87A35]"
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
