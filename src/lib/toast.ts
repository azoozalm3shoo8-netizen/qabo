/** حدث موحّد يستمع له `ToastProvider` — يعمل من أي عميل دون `useToast`. */
export const QABO_TOAST_EVENT = 'qabo-show-toast' as const

export type QaboToastDetail = {
  message: string
  kind?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

function emit(detail: QaboToastDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(QABO_TOAST_EVENT, { detail }))
}

/** إشعارات موحّدة (أعلى المنتصف، يتحكم بها `ToastProvider`). */
export const showToast = {
  success: (message: string) => emit({ message, kind: 'success' }),
  error: (message: string) => emit({ message, kind: 'error' }),
  warning: (message: string) => emit({ message, kind: 'warning' }),
  info: (message: string) => emit({ message, kind: 'info' }),
  bid: (message: string) => emit({ message, kind: 'info', duration: 4000 }),
  outbid: (message: string) => emit({ message, kind: 'warning', duration: 10_000 }),
  win: (message: string) => emit({ message, kind: 'success', duration: 15_000 }),
}
