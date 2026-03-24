'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  title: string
  subtitle?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  actionClassName?: string
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  actionHref,
  onAction,
  actionClassName,
}: Props) {
  const actionBtn =
    'mt-6 inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95 '
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center" dir="rtl">
      <div className="mb-4 flex h-16 w-16 items-center justify-center text-[#1B7F7A] [&_svg]:h-12 [&_svg]:w-12">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#1F2937] dark:text-slate-100">{title}</h3>
      {subtitle ? (
        <p className="mt-2 max-w-sm text-sm text-gray-400 dark:text-slate-400">{subtitle}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className={
            actionBtn +
            (actionClassName ?? 'bg-[#1B7F7A] shadow-md hover:bg-[#156661]')
          }
        >
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <button
          type="button"
          onClick={onAction}
          className={
            actionBtn +
            (actionClassName ?? 'bg-[#1B7F7A] shadow-md hover:bg-[#156661]')
          }
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
