'use client'

import { useCallback, useRef, type ReactNode } from 'react'

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
        await onRefresh()
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
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}
