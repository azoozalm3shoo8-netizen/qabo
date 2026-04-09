'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DRAFT_STORAGE_KEY, mapDeliveryToApi, type AuctionDraftFormData } from '@/components/create/auction-draft-types'
import { showToast } from '@/lib/toast'
import { formatSAR } from '@/lib/utils/currency'

const CONDITIONS: Record<string, string> = {
  new: 'جديد',
  like_new: 'مستعمل — ممتاز',
  good: 'مستعمل — جيد',
  fair: 'مستعمل — مقبول',
  refurbished: 'مُجدد',
}

function deliveryLabel(d: AuctionDraftFormData) {
  const parts: string[] = []
  if (d.deliveryShipping) parts.push('شحن')
  if (d.deliveryHandoff) parts.push('تسليم يد')
  return parts.length ? parts.join('، ') : '—'
}

export function StepReview({
  formData,
  userId,
  clientAuctionId,
}: {
  formData: AuctionDraftFormData
  userId: string
  clientAuctionId: string
}) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)

  const publish = async () => {
    setPublishing(true)
    try {
      const start = Number(formData.startPriceRiyal)
      const buyNow =
        formData.buyNowRiyal.trim() === '' ? '' : Number(formData.buyNowRiyal)
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          seller_id: userId,
          id: clientAuctionId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          condition: formData.condition,
          city: formData.city,
          start_price: start,
          buy_now_price: buyNow,
          bid_increment: 100,
          duration_hours: formData.durationHours,
          images: formData.imageUrls,
          delivery_method: mapDeliveryToApi(formData),
          ai_description_accepted: false,
        }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok) {
        showToast.error(data.error || 'تعذر نشر المزاد')
        return
      }
      const id = data.id || clientAuctionId
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      showToast.success('🎉 تم نشر مزادك!')
      router.push('/auction/' + id)
    } catch {
      showToast.error('خطأ في الاتصال')
    } finally {
      setPublishing(false)
    }
  }

  const saveDraftOnly = () => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData))
      showToast.success('تم حفظ المسودة')
    } catch {
      showToast.error('تعذر الحفظ')
    }
  }

  const primary = formData.imageUrls[0]

  return (
    <div className="space-y-5" dir="rtl">
      <h2 className="text-lg font-bold text-foreground">مراجعة قبل النشر</h2>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        <div className="relative aspect-[4/3] w-full bg-muted">
          {primary ? (
            <Image src={primary} alt={formData.title || 'معاينة المزاد'} fill className="object-cover" sizes="100vw" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">📷</div>
          )}
        </div>
        {formData.imageUrls.length > 1 ? (
          <div className="scrollbar-thin flex gap-2 overflow-x-auto p-2">
            {formData.imageUrls.map((u, i) => (
              <div key={u + i} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                <Image src={u} alt="" fill className="object-cover" sizes="64px" />
              </div>
            ))}
          </div>
        ) : null}
        <div className="space-y-2 p-4 text-right">
          <h3 className="text-base font-bold text-foreground">{formData.title || 'بدون عنوان'}</h3>
          <p className="text-sm text-muted-foreground">
            {formData.category} · {CONDITIONS[formData.condition] ?? formData.condition}
          </p>
          <p className="text-sm leading-relaxed text-foreground">{formData.description}</p>
          <div className="border-t border-border pt-3 text-sm">
            <p className="font-bold text-[#1B7F7A] dark:text-teal-300">
              {formatSAR(Number(formData.startPriceRiyal) || 0, false)}
            </p>
            <p className="mt-1 text-gray-600 dark:text-slate-400">
              المدة: {formData.durationHours / 24} يوم · التسليم: {deliveryLabel(formData)} · {formData.city}
            </p>
            {formData.buyNowRiyal.trim() ? (
              <p className="mt-1 text-sm text-muted-foreground">
                اشتري الآن: {formatSAR(Number(formData.buyNowRiyal), false)}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-bold">ملخص الرسوم عند البيع</p>
        <p className="mt-1">عمولة قبو عند البيع: 9٪ + {formatSAR(3, false)} (على المشتري عند الفوز — تقديري)</p>
      </div>

      <button
        type="button"
        disabled={publishing}
        onClick={() => void publish()}
        className="min-h-[52px] w-full rounded-xl bg-[#FF8C42] py-4 text-base font-bold text-white shadow-md transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C42] focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {publishing ? 'جاري النشر…' : 'انشر المزاد 🚀'}
      </button>

      <button
        type="button"
        onClick={saveDraftOnly}
        className="min-h-[44px] w-full rounded-xl border-2 border-border bg-transparent py-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        حفظ كمسودة
      </button>
    </div>
  )
}
