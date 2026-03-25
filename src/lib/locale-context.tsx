'use client'

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { translations, type Locale, type TranslationKey } from '@/lib/translations'

const STORAGE_KEY = 'qabboo-locale'

type LocaleContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
  dir: 'rtl' | 'ltr'
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'ar'
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'en' || v === 'ar') return v
  } catch {
    /* ignore */
  }
  return 'ar'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar')
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    setLocaleState(readStoredLocale())
    setMounted(true)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey) => {
      const table = translations[locale]
      const fallback = translations.ar
      return table[key] ?? fallback[key] ?? String(key)
    },
    [locale]
  )

  const dir: 'rtl' | 'ltr' = locale === 'ar' ? 'rtl' : 'ltr'

  const value = useMemo(
    () => ({ locale, setLocale, t, dir }),
    [locale, setLocale, t, dir]
  )

  if (!mounted) {
    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

/** Sync html lang/dir/lang-en class after locale is known */
export function LocaleHtmlSync() {
  const { locale, dir } = useLocale()

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.documentElement
    el.setAttribute('dir', dir)
    el.setAttribute('lang', locale === 'ar' ? 'ar' : 'en')
    el.classList.toggle('lang-en', locale === 'en')
  }, [locale, dir])

  return null
}
