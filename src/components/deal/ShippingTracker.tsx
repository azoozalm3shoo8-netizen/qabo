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

export type ShippingTrackerDealLike = {
  status: string
  tracking_number?: string | null
  shipping_provider?: string | null
}

type BaseProps = {
  onOpenDispute?: () => void
  statusHint?: string
}

type ShippingTrackerProps =
  | (BaseProps & {
      deal: ShippingTrackerDealLike
      provider?: never
      trackingNumber?: never
      waitingForSeller?: never
    })
  | (BaseProps & {
      deal?: undefined
      provider?: string | null
      trackingNumber?: string | null
      waitingForSeller?: boolean
    })

function ShippingTrackerView({
  provider,
  trackingNumber,
  waitingForSeller,
  onOpenDispute,
  statusHint,
}: {
  provider?: string | null
  trackingNumber?: string | null
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

export function ShippingTracker(props: ShippingTrackerProps) {
  if ('deal' in props && props.deal) {
    const d = props.deal
    const st = d.status.toLowerCase()
    const num = (d.tracking_number || '').trim()
    const waitingForSeller =
      !num && ['paid', 'processing', 'awaiting_shipment', 'captured'].includes(st)
    const statusHint =
      props.statusHint ?? (st === 'shipped' || st === 'in_transit' ? 'في الطريق إلى عنوانك' : undefined)
    return (
      <ShippingTrackerView
        provider={d.shipping_provider}
        trackingNumber={d.tracking_number}
        waitingForSeller={waitingForSeller}
        onOpenDispute={props.onOpenDispute}
        statusHint={statusHint}
      />
    )
  }
  const { provider, trackingNumber, waitingForSeller, onOpenDispute, statusHint } = props
  return (
    <ShippingTrackerView
      provider={provider}
      trackingNumber={trackingNumber}
      waitingForSeller={waitingForSeller}
      onOpenDispute={onOpenDispute}
      statusHint={statusHint}
    />
  )
}
