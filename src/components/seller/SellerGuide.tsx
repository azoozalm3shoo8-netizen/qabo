'use client'

import { useEffect, useState } from 'react'

export function SellerGuide() {
  const [free, setFree] = useState(false)

  useEffect(() => {
    void fetch('/api/platform/free-period')
      .then((r) => r.json())
      .then((j) => setFree(Boolean(j.isActive)))
      .catch(() => setFree(false))
  }, [])

  if (!free) return null

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <p className="font-bold">🎉 نصيحة ذهبية: استغل الفترة المجانية لبناء نقاط ثقتك!</p>
      <p className="mt-2 leading-relaxed">
        كل بيع ناجح = +5 نقاط. اجمع 150 نقطة لتصبح بائعاً ذهبياً قبل أن تبدأ العمولة!
      </p>
      <p className="mt-2 text-xs opacity-90">
        البائع الذهبي يحصل على خصم 1% من العمولة بعد الفترة المجانية.
      </p>
    </div>
  )
}
