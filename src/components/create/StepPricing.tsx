'use client'

import type { AuctionDraftFormData } from '@/components/create/auction-draft-types'

const DURATION_CHIPS: { label: string; hours: number }[] = [
  { label: '1 يوم', hours: 24 },
  { label: '3 أيام', hours: 72 },
  { label: '5 أيام', hours: 120 },
  { label: '7 أيام', hours: 168 },
]

const CITIES = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'أبها', 'تبوك', 'أخرى']

const fieldClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F7A] focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

export function StepPricing({
  formData,
  setFormData,
  errors,
}: {
  formData: AuctionDraftFormData
  setFormData: React.Dispatch<React.SetStateAction<AuctionDraftFormData>>
  errors: Partial<Record<'startPrice' | 'duration' | 'delivery' | 'buyNow' | 'city', string>>
}) {
  return (
    <div className="space-y-5" dir="rtl">
      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">التسعير والتسليم</h2>

      <div>
        <label htmlFor="start-price" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
          سعر البداية (ر.س) <span className="text-red-500">*</span>
        </label>
        <input
          id="start-price"
          type="number"
          min={1}
          inputMode="decimal"
          className={fieldClass}
          value={formData.startPriceRiyal}
          onChange={(e) => setFormData((p) => ({ ...p, startPriceRiyal: e.target.value }))}
        />
        {errors.startPrice ? <p className="mt-1 text-sm text-red-600">{errors.startPrice}</p> : null}
      </div>

      <div>
        <label htmlFor="buy-now" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
          سعر اشتري الآن (اختياري)
        </label>
        <input
          id="buy-now"
          type="number"
          min={1}
          inputMode="decimal"
          className={fieldClass}
          value={formData.buyNowRiyal}
          onChange={(e) => setFormData((p) => ({ ...p, buyNowRiyal: e.target.value }))}
        />
        {errors.buyNow ? <p className="mt-1 text-sm text-red-600">{errors.buyNow}</p> : null}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
          مدة المزاد <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {DURATION_CHIPS.map((d) => (
            <button
              key={d.hours}
              type="button"
              onClick={() => setFormData((p) => ({ ...p, durationHours: d.hours }))}
              className={
                'min-h-[44px] rounded-full px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F7A] focus-visible:ring-offset-2 ' +
                (formData.durationHours === d.hours
                  ? 'bg-[#1B7F7A] text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200')
              }
            >
              {d.label}
            </button>
          ))}
        </div>
        {errors.duration ? <p className="mt-1 text-sm text-red-600">{errors.duration}</p> : null}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
          طريقة التسليم <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-col gap-3">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={formData.deliveryShipping}
              onChange={(e) => setFormData((p) => ({ ...p, deliveryShipping: e.target.checked }))}
              className="h-5 w-5 accent-[#1B7F7A]"
            />
            <span className="text-sm text-gray-800 dark:text-slate-200">شحن</span>
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={formData.deliveryHandoff}
              onChange={(e) => setFormData((p) => ({ ...p, deliveryHandoff: e.target.checked }))}
              className="h-5 w-5 accent-[#1B7F7A]"
            />
            <span className="text-sm text-gray-800 dark:text-slate-200">تسليم يد</span>
          </label>
        </div>
        {errors.delivery ? <p className="mt-1 text-sm text-red-600">{errors.delivery}</p> : null}
      </fieldset>

      <div>
        <label htmlFor="auction-city" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
          المدينة
        </label>
        <select
          id="auction-city"
          className={fieldClass}
          value={formData.city}
          onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.city ? <p className="mt-1 text-sm text-red-600">{errors.city}</p> : null}
      </div>
    </div>
  )
}
