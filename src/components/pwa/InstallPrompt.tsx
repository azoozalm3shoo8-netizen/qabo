'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem('pwa-install-dismissed')) return
    } catch {
      /* ignore */
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    try {
      localStorage.setItem('pwa-install-dismissed', String(Date.now()))
    } catch {
      /* ignore */
    }
  }

  if (!showBanner) return null

  return (
    <div
      className="fixed bottom-4 inset-x-4 z-50 flex items-center gap-4 rounded-2xl border border-teal-200 bg-white p-4 shadow-2xl dark:border-teal-800 dark:bg-slate-800"
      dir="rtl"
    >
      <div className="flex-1">
        <p className="font-bold text-teal-700 dark:text-teal-400">ثبّت تطبيق قبو</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">وصول أسرع وتنبيهات للمزادات</p>
      </div>
      <button
        type="button"
        onClick={() => void handleInstall()}
        className="rounded-xl bg-teal-600 px-4 py-2 font-bold text-white hover:bg-teal-700"
      >
        تثبيت
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="إغلاق"
      >
        ✕
      </button>
    </div>
  )
}
