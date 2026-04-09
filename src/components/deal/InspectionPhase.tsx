'use client'

import { InspectionCountdown } from '@/components/deal/InspectionCountdown'

type Props = {
  inspectionEndsAt: string
  onAccept: () => void
  onDispute: () => void
  loading?: boolean
  /** مرجع اختياري للصفقة (لتوسعة العرض لاحقاً) */
  deal?: { id: string }
}

export function InspectionPhase({ inspectionEndsAt, onAccept, onDispute, loading }: Props) {
  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800" dir="rtl">
      <InspectionCountdown endsAt={inspectionEndsAt} />
      <p className="text-sm text-gray-600 dark:text-slate-400">
        إذا لم تردّ خلال 3 أيام، سيُحرر المبلغ تلقائياً للبائع وفق سياسة المنصة.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={onAccept}
        className="w-full min-h-[52px] rounded-xl bg-emerald-600 py-3 text-base font-bold text-white transition active:scale-[0.99] disabled:opacity-50 dark:bg-emerald-700"
        aria-label="أقبل القطعة"
      >
        أقبل القطعة ✅
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onDispute}
        className="w-full rounded-xl border-2 border-red-200 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:text-red-400"
        aria-label="فتح نزاع"
      >
        فتح نزاع ⚠️
      </button>
    </div>
  )
}
