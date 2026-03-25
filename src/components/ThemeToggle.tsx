'use client'

import { Moon, Sun } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { useLocale } from '@/lib/locale-context'
import { useTheme } from '@/lib/theme-context'

export function ThemeToggle({ tone = 'solid' }: { tone?: 'solid' | 'light' }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useLocale()
  const dark = theme === 'dark'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const btn =
    tone === 'light'
      ? 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-transform hover:scale-105 hover:bg-white/25 active:scale-95'
      : 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[#1B7F7A] transition-transform hover:scale-105 active:scale-95 dark:bg-slate-700 dark:text-slate-100'

  if (!mounted) {
    return <span className={btn + ' opacity-0'} aria-hidden />
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={btn}
      aria-label={dark ? t('header_themeLight') : t('header_themeDark')}
    >
      {dark ? <Sun className="h-5 w-5" weight="bold" /> : <Moon className="h-5 w-5" weight="bold" />}
    </button>
  )
}
