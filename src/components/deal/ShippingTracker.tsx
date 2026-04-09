'use client'

const trackingUrls: Record<string, (num: string) => string> = {
  aramex: (n) => `https://www.aramex.com/sa/en/track/shipments?ShipmentNumber=${encodeURIComponent(n)}`,
  smsa: (n) => `https://smsaexpress.com/trackingdetails?tracknumbers=${encodeURIComponent(n)}`,
  dhl: (n) => `https://www.dhl.com/sa-ar/home/tracking.html?tracking-id=${encodeURIComponent(n)}`,
  other: () => '#',
}

const providerLabels: Record<string, string> = {
  aramex: 'أرامكس',
  smsa: 'سمسا',
  dhl: 'دي إتش إل',
  other: 'أخرى',
}

export function ShippingTracker({
  provider,
  trackingNumber,
  waitingForSeller,
  onOpenDispute,
  statusHint,
}: {
  provider?: string | null
  trackingNumber?: string | null
  /** البائع لم يُدخل رقم تتبع بعد */
  waitingForSeller?: boolean
  onOpenDispute?: () => void
  statusHint?: string
}) {
  const num = (trackingNumber || '').trim()
  if (!num) {
    if (!waitingForSeller) return null
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30"
        dir="rtl"
      >
        <p className="font-bold text-amber-900 dark:text-amber-200">في انتظار شحن البائع</p>
        <p className="mt-1 text-amber-800/90 dark:text-amber-300/90">
          لدى البائع حتى 3 أيام عادةً لإرسال الشحنة. ستصلك إشعاراً عند التحديث.
        </p>
        {statusHint ? <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">{statusHint}</p> : null}
        {onOpenDispute ? (
          <button
            type="button"
            onClick={onOpenDispute}
            className="mt-3 text-sm font-bold text-red-600 underline dark:text-red-400"
          >
            فتح نزاع — تأخر الشحن
          </button>
        ) : null}
      </div>
    )
  }

  const p = (provider || 'other').toLowerCase()
  const href = (trackingUrls[p] ?? trackingUrls.other)(num)
  const label = providerLabels[p] ?? provider ?? 'الشحن'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="font-bold text-[#1F2937] dark:text-slate-100">التتبع</p>
      <p className="mt-1 text-gray-600 dark:text-slate-300">
        {label} — <span dir="ltr" className="font-mono">{num}</span>
      </p>
      {statusHint ? <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{statusHint}</p> : null}
      {href !== '#' ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block rounded-lg bg-[#1B7F7A] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#156661]"
        >
          تتبع الشحنة
        </a>
      ) : null}
    </div>
  )
}
