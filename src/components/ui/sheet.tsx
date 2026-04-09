'use client'

import { X } from '@phosphor-icons/react'
import { useEffect, type ReactNode } from 'react'

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  side?: 'bottom' | 'end'
  children: ReactNode
  className?: string
}

export function Sheet({ open, onClose, title, side = 'bottom', children, className = '' }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const panelPos =
    side === 'bottom'
      ? 'bottom-0 start-0 end-0 rounded-t-2xl border-t transition-transform duration-200'
      : 'bottom-0 top-0 end-0 w-full max-w-md rounded-s-2xl border-s transition-transform duration-200'

  return (
    <div className="fixed inset-0 z-[60] flex" dir="rtl" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div
        className={
          'relative z-[61] mt-auto flex max-h-[90vh] flex-col bg-white shadow-2xl dark:bg-slate-900 ' +
          panelPos +
          ' ' +
          className
        }
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
          {title ? <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" weight="bold" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
