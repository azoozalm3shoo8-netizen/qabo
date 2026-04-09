'use client'

import type { ReactNode } from 'react'
import { NetworkStatusListener } from '@/components/NetworkStatusListener'
import { LocaleHtmlSync, LocaleProvider } from '@/lib/locale-context'
import { ThemeProvider } from '@/lib/theme-context'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <LocaleHtmlSync />
      <ThemeProvider>
        <NetworkStatusListener />
        {children}
      </ThemeProvider>
    </LocaleProvider>
  )
}
