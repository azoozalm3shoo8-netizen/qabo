'use client'

import { CheckCircle, Lightning } from '@phosphor-icons/react'
import type { ResponsivenessData } from '@/lib/types/seller-responsiveness'

export function SellerResponsivenessBadge({
  data,
  className = '',
}: {
  data: ResponsivenessData | null | undefined
  className?: string
}) {
  if (!data || data.badge === 'none' || !data.badge_ar) return null

  if (data.badge === 'fast') {
    return (
      <span
        className={
          'inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 ' +
          className
        }
        dir="rtl"
      >
        <Lightning className="h-3.5 w-3.5" weight="fill" />
        {data.badge_ar}
      </span>
    )
  }

  if (data.badge === 'good') {
    return (
      <span
        className={
          'inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-900 dark:bg-teal-950/50 dark:text-teal-100 ' +
          className
        }
        dir="rtl"
      >
        <CheckCircle className="h-3.5 w-3.5" weight="fill" />
        {data.badge_ar}
      </span>
    )
  }

  return (
    <span
      className={
        'inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-200 ' +
        className
      }
      dir="rtl"
    >
      {data.badge_ar}
    </span>
  )
}
