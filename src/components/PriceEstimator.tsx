'use client'

import { Lightbulb } from '@phosphor-icons/react'
import { useMemo } from 'react'

const CONDITION_MULTIPLIER: Record<string, number> = {
  new_sealed: 0.9,
  new_open: 0.8,
  new_opened: 0.8,
  like_new: 0.7,
  good: 0.6,
  fair: 0.45,
  acceptable: 0.45,
  for_parts: 0.2,
  parts: 0.2,
  damaged: 0.25,
  new: 0.8,
  used: 0.6,
  refurbished: 0.7,
}

export interface PriceEstimatorProps {
  originalPrice: number
  condition: string
  listingStartPrice?: number
  onPriceSelect?: (price: number) => void
}

export function PriceEstimator({
  originalPrice,
  condition,
  listingStartPrice,
  onPriceSelect,
}: PriceEstimatorProps) {
  const mult = CONDITION_MULTIPLIER[condition] ?? null

  const result = useMemo(() => {
    if (originalPrice <= 0 || !Number.isFinite(originalPrice) || mult == null) return null
    const suggestedPrice = Math.round(originalPrice * mult)
    const min = Math.round(suggestedPrice * 0.85)
    const max = Math.round(suggestedPrice * 1.15)
    const discountPct = Math.round((1 - mult) * 100)
    return { suggestedPrice, min, max, discountPct }
  }, [originalPrice, mult])

  const outOfRange =
    result &&
    listingStartPrice != null &&
    Number.isFinite(listingStartPrice) &&
    listingStartPrice > 0 &&
    (listingStartPrice < result.min || listingStartPrice > result.max)

  if (!originalPrice || originalPrice <= 0 || !Number.isFinite(originalPrice)) {
    return (
      <p className="text-sm text-gray-600 dark:text-slate-400" dir="rtl">
        أدخل سعر الشراء الأصلي لعرض السعر المقترح
      </p>
    )
  }

  if (!condition) {
    return (
      <p className="text-sm text-gray-600 dark:text-slate-400" dir="rtl">
        اختر حالة المنتج أولاً
      </p>
    )
  }

  if (!result) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-300" dir="rtl">
        تعذر حساب السعر المقترح لهذه الحالة — اختر حالة أوضح من قائمة الفحص أو الحالة العامة
      </p>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-[#1B7F7A]/25 bg-[#E6F4F3]/60 p-3 dark:border-slate-600 dark:bg-[#134e4a]/30" dir="rtl">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-5 w-5 shrink-0 text-[#FF8C42]" weight="fill" />
        <div className="text-sm font-medium text-[#1F2937] dark:text-slate-100">
          <p>
            💡 السعر المقترح: {result.suggestedPrice.toLocaleString('ar-SA')} ر.س (النطاق:{' '}
            {result.min.toLocaleString('ar-SA')} — {result.max.toLocaleString('ar-SA')} ر.س)
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
            بناءً على حالة المنتج وخصم تقريبي {result.discountPct}% من السعر الأصلي
          </p>
        </div>
      </div>
      {onPriceSelect ? (
        <button
          type="button"
          onClick={() => onPriceSelect(result.suggestedPrice)}
          className="w-full rounded-lg bg-[#1B7F7A] py-2 text-xs font-bold text-white"
        >
          استخدام السعر المقترح كسعر بداية
        </button>
      ) : null}
      {outOfRange ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          ⚠️ السعر خارج النطاق المقترح — قد يؤثر على سرعة البيع
        </p>
      ) : null}
    </div>
  )
}
