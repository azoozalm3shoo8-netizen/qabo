'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'

const THRESHOLD = 72

export function PullToRefresh({
  onRefresh,
  children,
  className = '',
}: {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  className?: string
}) {
  const startY = useRef(0)
  const pulling = useRef(false)
  const triggered = useRef(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
    pulling.current = true
    triggered.current = false
  }, [])

  const handleTouchMove = useCallback(
    async (e: React.TouchEvent) => {
      if (!pulling.current || triggered.current || window.scrollY > 0) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > THRESHOLD) {
        triggered.current = true
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
        }
        pulling.current = false
      }
    },
    [onRefresh]
  )

  const handleTouchEnd = useCallback(() => {
    pulling.current = false
  }, [])

  return (
    <div
      className={'relative ' + className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && (
        <div
          className="pointer-events-none fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-md dark:bg-slate-800"
          aria-hidden
        >
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1B7F7A] border-t-transparent" />
          <span className="text-xs font-medium text-[#1B7F7A]">جاري التحديث...</span>
        </div>
      )}
      {children}
    </div>
  )
}
