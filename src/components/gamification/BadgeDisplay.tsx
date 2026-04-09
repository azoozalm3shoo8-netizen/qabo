'use client'

export type UserBadge = { id: string; name: string; icon: string; description: string; earned_at?: string }

const CATALOG: Omit<UserBadge, 'earned_at'>[] = [
  { id: 'first_win', name: 'أول فوز', icon: '🥇', description: 'فزت بأول مزاد' },
  { id: 'active_bidder', name: 'مزايد نشط', icon: '🔥', description: '10 مزايدات' },
  { id: 'trusted_seller', name: 'بائع موثق', icon: '⭐', description: '5 تقييمات 5 نجوم' },
  { id: 'verified', name: 'هوية موثقة', icon: '🛡️', description: 'أكمل التحقق' },
  { id: 'legend', name: 'أسطورة قبو', icon: '👑', description: '50 صفقة مكتملة' },
]

export function BadgeDisplay({ badges }: { badges: UserBadge[] }) {
  const earnedIds = new Set(badges.map((b) => b.id))
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" dir="rtl">
      {CATALOG.map((c) => {
        const earned = badges.find((b) => b.id === c.id)
        const locked = !earnedIds.has(c.id)
        return (
          <div
            key={c.id}
            className={
              'rounded-xl border p-3 text-center ' +
              (locked
                ? 'border-gray-200 bg-gray-50 opacity-60 dark:border-slate-700 dark:bg-slate-900'
                : 'border-[#1B7F7A]/30 bg-[#E6F4F3]/50 dark:border-teal-800 dark:bg-[#134e4a]/30')
            }
          >
            <div className="text-2xl">{locked ? '🔒' : c.icon}</div>
            <p className="mt-1 text-xs font-bold text-gray-900 dark:text-slate-100">{c.name}</p>
            <p className="mt-0.5 text-[10px] text-gray-600 dark:text-slate-400">{c.description}</p>
            {earned?.earned_at ? (
              <p className="mt-1 text-[9px] text-gray-400">{earned.earned_at}</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
