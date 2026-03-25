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

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'qabboo-theme'
const LEGACY_KEY = 'qabboo_theme'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    let mode: ThemeMode = 'light'
    try {
      const s = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
      if (s === 'dark') mode = 'dark'
      else if (s === 'light') mode = 'light'
      else mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    } catch {
      mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    }
    setThemeState(mode)
    applyThemeClass(mode)
    setMounted(true)
  }, [])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    applyThemeClass(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  )

  if (!mounted) {
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
