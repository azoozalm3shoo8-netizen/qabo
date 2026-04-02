'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const CACHE_KEY = 'qabboo_free_period_cache'
const CACHE_MS = 3600000
const DISMISS_KEY = 'qabboo_free_period_dismissed_until'

type FpPayload = {
  isActive: boolean
  endsAt: string | null
  daysRemaining: number | null
  isWarningPhase: boolean
  messageAr: string
}

export function FreePeriodBanner() {
  const pathname = usePathname()
  const [data, setData] = useState<FpPayload | null>(null)
  const [hidden, setHidden] = useState(false)

  const legal =
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname?.startsWith('/terms') ||
    pathname?.startsWith('/privacy')

  useEffect(() => {
    if (legal) return
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (until > Date.now()) {
      setHidden(true)
      return
    }
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { at, payload } = JSON.parse(raw) as { at: number; payload: FpPayload }
        if (Date.now() - at < CACHE_MS) {
          setData(payload)
          return
        }
      }
    } catch {
      /* ignore */
    }
    void fetch('/api/platform/free-period')
      .then((r) => r.json())
      .then((j: FpPayload) => {
        setData(j)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), payload: j }))
        } catch {
          /* ignore */
        }
      })
      .catch(() => setData(null))
  }, [legal])

  useEffect(() => {
    if (legal) return
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0)
    setHidden(until > Date.now())
  }, [legal, pathname])

  if (legal || hidden || !data?.isActive) return null

  const dateStr = data.endsAt
    ? new Date(data.endsAt).toLocaleDateString('ar-SA', { dateStyle: 'long' })
    : ''

  const dismiss = () => {
    const until = Date.now() + 24 * 3600000
    try {
      localStorage.setItem(DISMISS_KEY, String(until))
    } catch {
      /* ignore */
    }
    setHidden(true)
  }

  if (data.isWarningPhase) {
    return (
      <div
        className="sticky top-0 z-[45] flex flex-wrap items-center justify-between gap-2 border-b border-orange-200 px-3 py-2 text-sm text-white shadow-sm"
        style={{ backgroundColor: '#FF8C42' }}
        dir="rtl"
      >
        <p className="min-w-0 flex-1 text-center sm:text-right">
          ⏰ الفترة المجانية تنتهي خلال {data.daysRemaining ?? '—'} يوم — ستُفعَّل العمولة بتاريخ {dateStr}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/how-it-works#commission"
            className="rounded-lg bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/25"
          >
            اطّلع على العمولة
          </Link>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={dismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg leading-none hover:bg-white/30"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="sticky top-0 z-[45] flex flex-wrap items-center justify-between gap-2 border-b border-teal-700/20 px-3 py-2 text-sm text-white shadow-sm"
      style={{ backgroundColor: '#1B7F7A' }}
      dir="rtl"
    >
      <p className="min-w-0 flex-1 text-center sm:text-right">
        🎉 مجاناً — بدون عمولة ولا رسوم! استمتع بتجربة آمنة
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/how-it-works"
          className="rounded-lg bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/25"
        >
          تعرّف أكثر
        </Link>
        <button
          type="button"
          aria-label="إغلاق"
          onClick={dismiss}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg leading-none hover:bg-white/30"
        >
          ×
        </button>
      </div>
    </div>
  )
}
