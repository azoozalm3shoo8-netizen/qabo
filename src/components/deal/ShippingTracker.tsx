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
}: {
  provider: string | null | undefined
  trackingNumber: string | null | undefined
}) {
  const p = (provider || 'other').toLowerCase()
  const num = (trackingNumber || '').trim()
  if (!num) return null

  const href = (trackingUrls[p] ?? trackingUrls.other)(num)
  const label = providerLabels[p] ?? provider ?? 'الشحن'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="font-bold text-[#1F2937] dark:text-slate-100">التتبع</p>
      <p className="mt-1 text-gray-600 dark:text-slate-300">
        {label} — <span dir="ltr" className="font-mono">{num}</span>
      </p>
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
