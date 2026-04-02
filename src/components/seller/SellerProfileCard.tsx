'use client'

import { SellerTrustBadge } from '@/components/seller/SellerTrustBadge'

export function SellerProfileCard({
  profile,
}: {
  profile: {
    trust_score: number
    trust_level: 'gold' | 'silver' | 'watch' | 'banned'
    successful_sales: number
    cancelled_sales: number
    total_revenue: number
    iban?: string | null
  }
}) {
  const rate =
    profile.successful_sales + profile.cancelled_sales === 0
      ? 100
      : (profile.successful_sales / (profile.successful_sales + profile.cancelled_sales)) * 100

  const ibanMask = profile.iban
    ? `SA** **** **** ${profile.iban.replace(/\s/g, '').slice(-4)}`
    : 'غير مضاف'

  return (
    <div
      dir="rtl"
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <SellerTrustBadge level={profile.trust_level} sales={profile.successful_sales} rate={rate} />
      <div>
        <p className="text-sm text-gray-600">نقاط الثقة</p>
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-700">
          <div
            className="h-2 rounded-full bg-[#1B7F7A]"
            style={{ width: `${Math.min(100, profile.trust_score)}%` }}
          />
        </div>
        <p className="mt-1 text-xs">{profile.trust_score} / 200</p>
      </div>
      <ul className="text-sm text-gray-700 dark:text-slate-300">
        <li>مبيعات ناجحة: {profile.successful_sales}</li>
        <li>إلغاءات: {profile.cancelled_sales}</li>
        <li>إجمالي الإيرادات: {(profile.total_revenue / 100).toLocaleString('ar-SA')} ر.س</li>
      </ul>
      <p className="rounded-lg bg-gray-50 p-2 font-mono text-sm dark:bg-slate-800">{ibanMask}</p>
      {profile.trust_level === 'watch' ? (
        <p className="text-sm text-red-600">
          حسابك تحت المراقبة — أي إلغاء إضافي قد يؤدي للحظر.
        </p>
      ) : null}
    </div>
  )
}
