'use client'

import type { ReactNode } from 'react'
import { LocaleHtmlSync, LocaleProvider } from '@/lib/locale-context'
import { ThemeProvider } from '@/lib/theme-context'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <LocaleHtmlSync />
      <ThemeProvider>{children}</ThemeProvider>
    </LocaleProvider>
  )
}
