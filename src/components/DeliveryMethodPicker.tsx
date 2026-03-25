'use client'

import { DELIVERY_OPTIONS, type DeliveryMethod } from '@/lib/delivery-options'

type Props = {
  value: DeliveryMethod
  onChange: (id: DeliveryMethod) => void
}

export function DeliveryMethodPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-[#1F2937] dark:text-slate-100">طريقة استلام السلعة</p>
      <div className="grid grid-cols-2 gap-3">
        {DELIVERY_OPTIONS.map((opt) => {
          const selected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={
                'rounded-2xl border-2 p-3 text-right transition-colors ' +
                (selected
                  ? 'border-[#1B7F7A] bg-[#E6F4F3] dark:border-[#1B7F7A] dark:bg-[#134e4a]/40'
                  : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800')
              }
            >
              <span className="mb-1 block text-2xl">{opt.icon}</span>
              <span className="block text-sm font-bold text-[#1F2937] dark:text-slate-100">{opt.label}</span>
              <span className="mt-1 block text-[11px] leading-snug text-gray-600 dark:text-slate-400">
                {opt.description}
              </span>
            </button>
          )
        })}
      </div>
      {value === 'meeting_point' ? (
        <p className="rounded-xl bg-[#1B7F7A]/10 px-3 py-2 text-xs text-[#1B7F7A] dark:bg-[#134e4a]/30 dark:text-slate-200">
          سيُحدد المكان بالذكاء الاصطناعي بعد الفوز بالمزاد
        </p>
      ) : null}
    </div>
  )
}
