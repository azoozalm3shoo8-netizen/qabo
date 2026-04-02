'use client'

import { useEffect, useState } from 'react'
import type { CommissionTier } from '@/lib/types/financial-types'

function formatHalalat(h: number) {
  return (h / 100).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CommissionTiersDisplay({
  highlightHalalas,
  freeInfo,
}: {
  highlightHalalas?: number
  freeInfo?: { isActive: boolean; endsAt: string | null } | null
}) {
  const [tiers, setTiers] = useState<CommissionTier[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    void fetch('/api/platform/commission-tiers')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setTiers(d)
        else setErr(typeof d?.error === 'string' ? d.error : 'تعذر تحميل الشرائح')
      })
      .catch(() => setErr('تعذر التحميل'))
  }, [])

  const active = freeInfo?.isActive
  const endLabel = freeInfo?.endsAt
    ? new Date(freeInfo.endsAt).toLocaleDateString('ar-SA', { dateStyle: 'long' })
    : ''

  const inRange = (t: CommissionTier, price: number) => {
    if (price < t.min_amount) return false
    if (t.max_amount != null && price > t.max_amount) return false
    return true
  }

  return (
    <div dir="rtl" className="space-y-3 text-sm">
      {active ? (
        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p className="font-bold">🎉 حالياً كل هذه العمولات = 0! الفترة المجانية مستمرة حتى {endLabel}</p>
          <p className="mt-1 text-xs opacity-90">بعد انتهاء الفترة المجانية، ستُطبَّق العمولة التالية:</p>
        </div>
      ) : null}
      {err ? <p className="text-red-600">{err}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full text-right text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
              <th className="px-3 py-2 font-semibold">الشريحة</th>
              <th className="px-3 py-2 font-semibold">نطاق السعر (ر.س)</th>
              <th className="px-3 py-2 font-semibold">عمولة البائع</th>
              <th className="px-3 py-2 font-semibold">حماية المشتري</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => {
              const sellerPct = (Number(t.seller_rate) * 100).toFixed(2)
              const hl = highlightHalalas
              const rowHi = hl != null && inRange(t, hl)
              const buyerNote =
                t.tier_name === 'micro' || Number(t.buyer_flat_fee) > 0
                  ? `ثابت ${formatHalalat(Number(t.buyer_flat_fee))}`
                  : `${(Number(t.buyer_protection_rate) * 100).toFixed(2)}٪`
              return (
                <tr
                  key={t.id}
                  className={
                    'border-b border-gray-50 dark:border-slate-800 ' +
                    (rowHi ? 'bg-[#E6F4F3]/80 dark:bg-[#134e4a]/30' : '')
                  }
                >
                  <td className="px-3 py-2 font-medium">{t.tier_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatHalalat(t.min_amount)} — {t.max_amount == null ? '∞' : formatHalalat(t.max_amount)}
                  </td>
                  <td className="px-3 py-2">
                    {active ? (
                      <span className="inline-flex flex-wrap items-center gap-1">
                        <span className="text-gray-400 line-through">{sellerPct}%</span>
                        <span className="font-bold text-emerald-600">0%</span>
                      </span>
                    ) : (
                      `${sellerPct}%`
                    )}
                  </td>
                  <td className="px-3 py-2">{buyerNote}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
