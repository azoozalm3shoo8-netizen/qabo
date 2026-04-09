'use client'

import { useEffect, useState } from 'react'

const KEY = 'onboarding_done'

const SCREENS = [
  {
    icon: '🏷️',
    title: 'اكتشف مزادات فريدة',
    body: 'تصفح آلاف المنتجات بأسعار تبدأ من 1 ريال',
  },
  {
    icon: '🔨',
    title: 'زايد بنقرة واحدة',
    body: 'زايد مباشرة أو فعّل المزايدة التلقائية',
  },
  {
    icon: '🛡️',
    title: 'أموالك محمية بقبو',
    body: 'لا نُحرر أموالك إلا بعد استلامك وفحصك للقطعة',
  },
]

export function OnboardingFlow({ hasUser }: { hasUser: boolean }) {
  const [visible, setVisible] = useState(false)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!hasUser) return
    try {
      if (localStorage.getItem(KEY)) return
    } catch {
      return
    }
    setVisible(true)
  }, [hasUser])

  if (!visible) return null

  const finish = () => {
    try {
      localStorage.setItem(KEY, 'true')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  const s = SCREENS[idx]

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-gradient-to-b from-[#E6F4F3] via-white to-[#fff7f0] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={finish}
          className="min-h-[44px] text-sm text-gray-500 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F7A]"
        >
          تخطي
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl" aria-hidden>
          {s.icon}
        </div>
        <h2 id="onboarding-title" className="mt-6 text-2xl font-bold text-gray-900 dark:text-slate-100">
          {s.title}
        </h2>
        <p className="mt-3 max-w-sm text-gray-600 dark:text-slate-400">{s.body}</p>
        <div className="mt-8 flex gap-2">
          {SCREENS.map((_, i) => (
            <span
              key={i}
              className={'h-2 w-2 rounded-full ' + (i === idx ? 'bg-[#1B7F7A]' : 'bg-gray-300 dark:bg-slate-600')}
            />
          ))}
        </div>
      </div>
      <div className="safe-pb p-4">
        {idx < SCREENS.length - 1 ? (
          <button
            type="button"
            onClick={() => setIdx((i) => i + 1)}
            className="min-h-[52px] w-full rounded-xl bg-[#1B7F7A] py-3 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            التالي
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="min-h-[52px] w-full rounded-xl bg-[#FF8C42] py-3 text-base font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C42] focus-visible:ring-offset-2"
          >
            ابدأ الآن
          </button>
        )}
      </div>
    </div>
  )
}
