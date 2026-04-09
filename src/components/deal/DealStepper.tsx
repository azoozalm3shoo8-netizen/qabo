'use client'

export type DealStep = 'won' | 'payment' | 'shipping' | 'inspection' | 'completed'

const steps: { key: DealStep; label: string; icon: string }[] = [
  { key: 'won', label: 'فوز', icon: '🏆' },
  { key: 'payment', label: 'دفع', icon: '💳' },
  { key: 'shipping', label: 'شحن', icon: '📦' },
  { key: 'inspection', label: 'فحص', icon: '🔍' },
  { key: 'completed', label: 'اكتمال', icon: '✅' },
]

export function DealStepper({ currentStep }: { currentStep: DealStep }) {
  const idx = Math.max(0, steps.findIndex((s) => s.key === currentStep))
  return (
    <div className="rounded-2xl border border-border bg-card px-2 py-4" dir="rtl">
      <div className="flex items-start justify-between gap-0">
        {steps.map((s, i) => {
          const done = i < idx
          const active = i === idx
          const lineDone = i < idx
          return (
            <div key={s.key} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 ? (
                  <div
                    className={
                      'h-0.5 flex-1 rounded-full ' +
                      (lineDone ? 'bg-emerald-500' : 'bg-muted')
                    }
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <div
                  className={
                    'mx-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm sm:h-10 sm:w-10 sm:text-base ' +
                    (done
                      ? 'bg-emerald-600 text-white'
                      : active
                        ? 'bg-[#1B7F7A] text-white'
                        : 'bg-muted text-muted-foreground')
                  }
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? '✓' : s.icon}
                </div>
                {i < steps.length - 1 ? (
                  <div
                    className={
                      'h-0.5 flex-1 rounded-full ' +
                      (i < idx ? 'bg-emerald-500' : 'bg-muted')
                    }
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <span
                className={
                  'mt-1 max-w-[3.2rem] truncate text-center text-[9px] font-bold leading-tight sm:max-w-none sm:text-[11px] ' +
                  (active ? 'text-[#1B7F7A]' : 'text-muted-foreground')
                }
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
