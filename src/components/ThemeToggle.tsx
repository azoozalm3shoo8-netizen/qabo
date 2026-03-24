'use client'

import { Moon, Sun } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'qabboo_theme'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const isDark = stored === 'dark'
      setDark(isDark)
      document.documentElement.classList.toggle('dark', isDark)
    } catch {
      setDark(false)
    }
    setReady(true)
  }, [])

  const toggle = useCallback(() => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [dark])

  if (!ready) {
    return (
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700"
        aria-hidden
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[#1B7F7A] transition-transform hover:scale-105 active:scale-95 dark:bg-slate-700 dark:text-teal-300"
      aria-label={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {dark ? <Sun className="h-5 w-5" weight="bold" /> : <Moon className="h-5 w-5" weight="bold" />}
    </button>
  )
}
