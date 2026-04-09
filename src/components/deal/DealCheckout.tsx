'use client'

import Image from 'next/image'
import { MoyasarCardForm } from '@/components/payment/MoyasarCardForm'
import { SavedCardsList } from '@/components/payment/SavedCardsList'
import { formatSAR } from '@/lib/utils/currency'

export type DealCheckoutDeal = {
  id: string
  title: string
  imageUrl?: string | null
  /** مبالث العرض بالريال (كما تُرجعها طلبات الطلب) */
  winningBidRiyal: number
  commissionRiyal: number
  buyerProtectionRiyal: number
  vatRiyal: number
  totalRiyal: number
}

/**
 * صفحة دفع واحدة — يمكن تمرير userId وبيانات Moyasar حسب مسارات الدفع لديك.
 */
export function DealCheckout({ deal, userId }: { deal: DealCheckoutDeal; userId: string }) {
  const pk = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MOYASAR_PK || '' : ''
  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800" dir="rtl">
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-700">
          {deal.imageUrl ? (
            <Image src={deal.imageUrl} alt="" fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">📦</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 dark:text-slate-100">{deal.title}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">مبلغ الفوز</p>
          <p className="text-lg font-bold text-[#1B7F7A] dark:text-teal-300">
            {formatSAR(deal.winningBidRiyal, false)}
          </p>
        </div>
      </div>
      <div className="space-y-2 border-t border-gray-100 pt-3 text-sm dark:border-slate-700">
        <div className="flex justify-between">
          <span>المبلغ</span>
          <span>{formatSAR(deal.winningBidRiyal, false)}</span>
        </div>
        <div className="flex justify-between">
          <span>عمولة قبو (9٪)</span>
          <span>{formatSAR(deal.commissionRiyal, false)}</span>
        </div>
        <div className="flex justify-between">
          <span>حماية المشتري</span>
          <span>{formatSAR(deal.buyerProtectionRiyal, false)}</span>
        </div>
        <div className="flex justify-between">
          <span>ضريبة 15٪ (على العمولة)</span>
          <span>{formatSAR(deal.vatRiyal, false)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-2 text-lg font-extrabold dark:border-slate-700">
          <span>الإجمالي</span>
          <span className="text-[#1B7F7A] dark:text-teal-300">{formatSAR(deal.totalRiyal, false)}</span>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-bold text-gray-800 dark:text-slate-200">بطاقات محفوظة</p>
        <SavedCardsList userId={userId} />
        <p className="text-sm font-bold text-gray-800 dark:text-slate-200">بطاقة جديدة</p>
        {pk ? (
          <MoyasarCardForm userId={userId} publishableKey={pk} />
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-300">مفتاح مُيسر غير مُعرّف في البيئة.</p>
        )}
      </div>
      <p className="text-center text-xs text-gray-500 dark:text-slate-400">
        Apple Pay يظهر تلقائياً عند دعم المتصفح والجهاز.
      </p>
    </div>
  )
}
