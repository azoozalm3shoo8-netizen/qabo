'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { QABO_TOAST_EVENT, type QaboToastDetail } from '@/lib/toast'

type ToastKind = 'success' | 'error' | 'info' | 'warning'

type Toast = { id: number; message: string; kind: ToastKind; duration: number }

type ToastContextValue = {
  show: (message: string, kind?: ToastKind, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return { show: (_m: string, _k?: ToastKind, _d?: number) => {} }
  }
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'info', durationMs = 3200) => {
    const id = Date.now() + Math.random()
    const duration = Math.max(1200, durationMs)
    setToasts((t) => [...t, { id, message, kind, duration }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, duration)
  }, [])

  useEffect(() => {
    const onGlobal = (e: Event) => {
      const ce = e as CustomEvent<QaboToastDetail>
      const d = ce.detail
      if (!d?.message) return
      show(d.message, d.kind ?? 'info', d.duration)
    }
    window.addEventListener(QABO_TOAST_EVENT, onGlobal)
    return () => window.removeEventListener(QABO_TOAST_EVENT, onGlobal)
  }, [show])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-full max-w-lg -translate-x-1/2 flex-col gap-2 px-4">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className={
                'pointer-events-auto mx-auto w-full max-w-md rounded-xl px-4 py-3 text-center text-sm font-medium shadow-lg ' +
                (t.kind === 'success'
                  ? 'bg-green-600 text-white'
                  : t.kind === 'error'
                    ? 'bg-red-600 text-white'
                    : t.kind === 'warning'
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#1B7F7A] text-white')
              }
              role="status"
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
