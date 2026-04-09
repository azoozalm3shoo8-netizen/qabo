'use client'

import { Clock, Lock, Shield } from '@phosphor-icons/react'

const items = [
  { icon: Shield, text: 'محمي بقبو' },
  { icon: Clock, text: 'فترة فحص 3 أيام' },
  { icon: Lock, text: 'دفع آمن' },
]

export function TrustBadgeBar() {
  return (
    <div
      className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-lg border border-[#1B7F7A]/20 bg-[#1B7F7A]/5 p-3 scrollbar-hide dark:border-teal-700/40 dark:bg-teal-950/30"
      dir="rtl"
    >
      {items.map(({ icon: Icon, text }) => (
        <div
          key={text}
          className="flex min-w-[140px] shrink-0 snap-start items-center gap-2 rounded-md bg-white/60 px-3 py-2 dark:bg-slate-800/80"
        >
          <Icon className="h-5 w-5 shrink-0 text-[#1B7F7A] dark:text-teal-400" weight="duotone" />
          <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{text}</span>
        </div>
      ))}
    </div>
  )
}
