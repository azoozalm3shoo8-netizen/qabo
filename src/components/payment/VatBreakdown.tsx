'use client'

import type { VatBreakdownResult } from '@/lib/services/vat-engine'

const LABELS: Record<string, string> = {
  sale: 'سعر البيع',
  commission: 'عمولة المنصة',
  vatOnCommission: 'ضريبة على العمولة',
  buyerProtection: 'حماية المشتري',
  vatOnBuyerProtection: 'ضريبة على الحماية',
  buyerTotal: 'إجمالي المشتري',
  sellerNet: 'صافي البائع',
  vat: 'الضريبة',
}

export function VatBreakdown({ data }: { data: VatBreakdownResult }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800" dir="rtl">
      <h3 className="mb-3 font-bold text-[#1F2937] dark:text-slate-100">تفصيل المبالغ والضريبة</h3>
      <ul className="space-y-2 text-gray-700 dark:text-slate-300">
        {Object.entries(data.breakdown_ar).map(([key, value]) => (
          <li key={key} className="flex justify-between gap-2 border-b border-gray-50 pb-2 last:border-0 dark:border-slate-700">
            <span>{LABELS[key] ?? key}</span>
            <span className="font-mono shrink-0" dir="ltr">
              {value}
            </span>
          </li>
        ))}
      </ul>
      {data.isFreeperiod ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">فترة مجانية حسب إعدادات المنصة.</p>
      ) : null}
    </div>
  )
}
