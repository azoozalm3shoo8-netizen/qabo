'use client'

import { useRef, useState } from 'react'

export function HandoverCodeInput({
  onSubmit,
  role,
}: {
  onSubmit: (code: string) => void
  role: 'buyer' | 'seller'
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setAt = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    setDigits(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  return (
    <div dir="rtl" className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-slate-400">
        {role === 'seller'
          ? 'أعطِ هذا الكود للمشتري بعد التسليم.'
          : 'أدخل الكود الذي أعطاك إياه البائع.'}
      </p>
      <div className="flex justify-center gap-2" dir="ltr">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            className="h-12 w-10 rounded-lg border border-gray-300 text-center text-lg dark:border-slate-600 dark:bg-slate-900"
            maxLength={1}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
          />
        ))}
      </div>
      <button
        type="button"
        className="w-full rounded-lg bg-[#1B7F7A] py-2 text-white"
        onClick={() => onSubmit(digits.join(''))}
      >
        تأكيد الاستلام
      </button>
    </div>
  )
}
