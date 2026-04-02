'use client'

import { useEffect, useState } from 'react'
import { CommissionTiersDisplay } from '@/components/auction/CommissionTiersDisplay'

export function AuctionDetail({
  auction,
}: {
  auction: Record<string, unknown> & { id: string; title: string; current_price?: number; current_bid?: number }
}) {
  const [free, setFree] = useState<{ isActive: boolean; endsAt: string | null } | null>(null)
  useEffect(() => {
    void fetch('/api/platform/free-period')
      .then((r) => r.json())
      .then(setFree)
      .catch(() => setFree(null))
  }, [])

  const x =
    auction.current_price != null
      ? Number(auction.current_price) / 100
      : Number(auction.current_bid ?? 0)

  return (
    <div dir="rtl" className="space-y-6 p-4">
      <h1 className="text-xl font-bold">{String(auction.title)}</h1>
      <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 font-semibold text-[#1B7F7A]">تكاليف الشراء (تقدير)</h2>
        {free?.isActive ? (
          <p className="text-sm">
            إذا فزت بسعر {x.toLocaleString('ar-SA')} ر.س: المجموع نفسه — بدون رسوم إضافية خلال الفترة المجانية 🎉
          </p>
        ) : (
          <p className="text-sm">يُضاف رسم حماية المشتري وفق شرائح العمولة.</p>
        )}
        <div className="mt-4">
          <CommissionTiersDisplay
            highlightHalalas={auction.current_price != null ? Number(auction.current_price) : Math.round(x * 100)}
            freeInfo={free}
          />
        </div>
      </section>
    </div>
  )
}
