'use client'

import { Shield } from '@phosphor-icons/react'
import Link from 'next/link'

export function BuyerProtectionBanner() {
  return (
    <div
      className="mx-4 rounded-xl border border-[#1B7F7A]/20 bg-[#1B7F7A]/5 p-4 dark:border-teal-700/40 dark:bg-teal-950/25"
      dir="rtl"
    >
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card shadow-sm">
          <Shield className="h-8 w-8 text-[#1B7F7A] dark:text-teal-400" weight="duotone" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">🛡️ جميع المعاملات محمية بقبو</p>
          <p className="mt-1 text-sm text-muted-foreground">
            أموالك آمنة حتى تستلم وتفحص القطعة
          </p>
          <Link
            href="/how-it-works"
            className="mt-2 inline-block rounded text-sm font-bold text-[#1B7F7A] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-teal-300"
          >
            كيف يعمل؟
          </Link>
        </div>
      </div>
    </div>
  )
}
