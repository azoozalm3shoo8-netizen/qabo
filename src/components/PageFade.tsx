'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Lightweight fade-in on mount only (no usePathname — avoids Next.js auth route
 * client exceptions when pathname hooks require Suspense / CSR bailout).
 */
export function PageFade({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div
      className={
        'min-h-0 flex-1 flex flex-col transition-opacity duration-200 ease-out ' +
        (on ? 'opacity-100' : 'opacity-0')
      }
    >
      {children}
    </div>
  )
}
