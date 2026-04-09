'use client'

const levels = [
  { name: 'مبتدئ', min: 0, max: 99, icon: '🌱' },
  { name: 'مزايد', min: 100, max: 499, icon: '🔨' },
  { name: 'محترف', min: 500, max: 1999, icon: '⭐' },
  { name: 'خبير', min: 2000, max: 9999, icon: '🏆' },
  { name: 'أسطورة', min: 10000, max: Infinity, icon: '👑' },
] as const

function currentLevel(xp: number) {
  return levels.find((l) => xp >= l.min && xp <= l.max) ?? levels[levels.length - 1]
}

export function XPBar({ xp, levelOverride }: { xp: number; levelOverride?: string }) {
  const L = currentLevel(Math.max(0, xp))
  const span = L.max === Infinity ? 1 : L.max - L.min + 1
  const within = Math.max(0, Math.min(1, (xp - L.min) / span))
  const label = levelOverride || L.name
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800" dir="rtl">
      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
        {L.icon} {label} — {xp} نقطة
      </p>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-[#1B7F7A] transition-all duration-500"
          style={{ width: `${Math.round(within * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        التقدم داخل المستوى الحالي (تقريبي)
      </p>
    </div>
  )
}
