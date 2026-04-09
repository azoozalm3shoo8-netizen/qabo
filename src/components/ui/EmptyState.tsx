'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      dir="rtl"
      role="status"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary)] dark:bg-[#134e4a]/50 dark:text-teal-300">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">{description}</p>
      {action ? (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.98]"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.98]"
            >
              {action.label}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
