'use client'

import { X } from '@phosphor-icons/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  side?: 'bottom' | 'end'
  children: ReactNode
  className?: string
}

export function Sheet({ open, onClose, title, side = 'bottom', children, className = '' }: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      const root = panelRef.current
      const first = root?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      first?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open])

  if (!open) return null

  const panelPos =
    side === 'bottom'
      ? 'bottom-0 start-0 end-0 rounded-t-2xl border-t transition-transform duration-200'
      : 'bottom-0 top-0 end-0 w-full max-w-md rounded-s-2xl border-s transition-transform duration-200'

  return (
    <div
      className="fixed inset-0 z-[60] flex"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={
          'relative z-[61] mt-auto flex max-h-[90vh] flex-col border-border bg-background shadow-2xl ' +
          panelPos +
          ' ' +
          className
        }
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          {title ? (
            <h2 id={titleId} className="text-base font-bold text-foreground">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" weight="bold" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
