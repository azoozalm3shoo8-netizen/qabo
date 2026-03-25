'use client'

import { useEffect, useState } from 'react'
import { Bell } from '@phosphor-icons/react'
import { useLocale } from '@/lib/locale-context'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import {
  getPermissionStatus,
  isPushSupported,
  requestNotificationPermission,
} from '@/lib/notifications/push'

export function PushPermissionBanner() {
  const { t, dir } = useLocale()
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
      className="mb-3 flex flex-col gap-2 rounded-xl border border-white/25 bg-white/15 px-3 py-2.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/20 dark:bg-slate-900/40"
      dir={dir}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-white">
        <Bell className="h-5 w-5 shrink-0 text-white" weight="fill" />
        <span>
          <span className="font-bold">{t('push_bannerTitle')}:</span> {t('push_bannerPitch')}
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            await requestNotificationPermission()
            setVisible(false)
          }}
          className="rounded-lg bg-[#FF8C42] px-4 py-1.5 text-sm font-bold text-white transition-transform hover:bg-[#E87A35] active:scale-95"
        >
          {t('push_enable')}
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('qabo_push_dismissed', 'true')
            setVisible(false)
          }}
          className="text-sm text-white/80 hover:text-white"
        >
          {t('push_later')}
        </button>
      </div>
    </div>
  )
}
