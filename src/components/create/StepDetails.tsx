'use client'

import { useCallback, useState } from 'react'
import { analyzeListing } from '@/lib/services/ai-listing-assistant'
import { CATEGORY_CATALOG } from '@/lib/constants'
import type { AuctionDraftFormData } from '@/components/create/auction-draft-types'

const CATEGORIES = CATEGORY_CATALOG.map((c) => c.name)

const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'جديد' },
  { value: 'like_new', label: 'مستعمل — ممتاز' },
  { value: 'good', label: 'مستعمل — جيد' },
  { value: 'fair', label: 'مستعمل — مقبول' },
  { value: 'refurbished', label: 'مُجدد' },
]

const fieldClass =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

export function StepDetails({
  formData,
  setFormData,
  errors,
}: {
  formData: AuctionDraftFormData
  setFormData: React.Dispatch<React.SetStateAction<AuctionDraftFormData>>
  errors: Partial<Record<'title' | 'category' | 'condition' | 'description', string>>
}) {
  const [tips, setTips] = useState<string[]>([])

  const refreshTips = useCallback(() => {
    if (!formData.title.trim() && !formData.description.trim()) {
      setTips([])
      return
    }
    const r = analyzeListing({
      title: formData.title,
      description: formData.description,
      category: formData.category || 'عام',
      condition: formData.condition,
      photoCount: formData.imageUrls.length,
      hasVideo360: false,
      startingBidHalalas: Math.round(Number(formData.startPriceRiyal) * 100) || 0,
    })
    setTips(r.tips.slice(0, 5))
  }, [
    formData.title,
    formData.description,
    formData.category,
    formData.condition,
    formData.imageUrls.length,
    formData.startPriceRiyal,
  ])

  return (
    <div className="space-y-5" dir="rtl">
      <h2 className="text-lg font-bold text-foreground">تفاصيل المزاد</h2>

      <div>
        <label htmlFor="auction-title" className="mb-1 block text-sm font-medium text-foreground">
          عنوان المزاد <span className="text-red-500">*</span>
        </label>
        <input
          id="auction-title"
          className={fieldClass}
          value={formData.title}
          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
          onBlur={refreshTips}
          placeholder="مثال: ساعة أبل ألترا ٢ — بحالة ممتازة"
          maxLength={100}
        />
        {errors.title ? <p className="mt-1 text-sm text-red-600">{errors.title}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">
          💡 أضف الماركة والموديل في العنوان لجذب المزايدين
        </p>
      </div>

      <div>
        <label htmlFor="auction-category" className="mb-1 block text-sm font-medium text-foreground">
          الفئة <span className="text-red-500">*</span>
        </label>
        <select
          id="auction-category"
          className={fieldClass}
          value={formData.category}
          onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
        >
          <option value="">اختر التصنيف</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.category ? <p className="mt-1 text-sm text-red-600">{errors.category}</p> : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-foreground">
          الحالة <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-col gap-2">
          {CONDITIONS.map((c) => (
            <label
              key={c.value}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2"
            >
              <input
                type="radio"
                name="condition"
                value={c.value}
                checked={formData.condition === c.value}
                onChange={() => setFormData((p) => ({ ...p, condition: c.value }))}
                className="h-4 w-4 accent-[#1B7F7A]"
              />
              <span className="text-sm text-foreground">{c.label}</span>
            </label>
          ))}
        </div>
        {errors.condition ? <p className="text-sm text-red-600">{errors.condition}</p> : null}
      </fieldset>

      <div>
        <label htmlFor="auction-desc" className="mb-1 block text-sm font-medium text-foreground">
          وصف تفصيلي <span className="text-red-500">*</span>
        </label>
        <textarea
          id="auction-desc"
          className={fieldClass + ' min-h-[140px] resize-y'}
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          onBlur={refreshTips}
          placeholder="اذكر الحالة، ما يُرفق، سبب البيع…"
          maxLength={2000}
        />
        {errors.description ? <p className="mt-1 text-sm text-red-600">{errors.description}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">
          💡 وصف صادق يقلل النزاعات ويزيد ثقة المزايدين
        </p>
      </div>

      {tips.length > 0 ? (
        <div className="rounded-xl border border-[#1B7F7A]/20 bg-[#E6F4F3]/50 p-3 text-sm dark:border-teal-800 dark:bg-[#134e4a]/30">
          <p className="font-bold text-[#1B7F7A] dark:text-teal-300">تلميحات المساعد</p>
          <ul className="mt-2 list-disc pr-4 text-foreground">
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
