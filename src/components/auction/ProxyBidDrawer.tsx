'use client'

import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/Toast'
import { formatSAR } from '@/lib/utils/currency'

type Props = {
  open: boolean
  onClose: () => void
  auctionId: string
  userId: string
  currentBidRiyal: number
  bidIncrementRiyal: number
  hasAutobid: boolean
  autobidMaxRiyal?: number | null
  onSuccess: () => void
  onCancelAutobid: () => Promise<void>
}

export function ProxyBidDrawer({
  open,
  onClose,
  auctionId,
  userId,
  currentBidRiyal,
  bidIncrementRiyal,
  hasAutobid,
  autobidMaxRiyal,
  onSuccess,
  onCancelAutobid,
}: Props) {
  const { show } = useToast()
  const [maxVal, setMaxVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const minNext = Math.max(0, Number(currentBidRiyal) + Number(bidIncrementRiyal))

  useEffect(() => {
    if (open) {
      setMaxVal(hasAutobid && autobidMaxRiyal != null ? String(autobidMaxRiyal) : String(minNext))
    }
  }, [open, hasAutobid, autobidMaxRiyal, minNext])

  const submit = async () => {
    const n = Number(String(maxVal).replace(/,/g, ''))
    if (!Number.isFinite(n) || n < minNext) {
      show(`الحد الأدنى ${formatSAR(minNext, false)}`, 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/autobid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          auction_id: auctionId,
          max_amount: n,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر التفعيل')
      show('تم تفعيل المزايدة التلقائية', 'success')
      onSuccess()
      onClose()
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setLoading(false)
    }
  }

  const cancel = async () => {
    setCancelLoading(true)
    try {
      await onCancelAutobid()
      onClose()
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="المزايدة التلقائية">
      <div className="space-y-4" dir="rtl">
        <p className="text-sm text-muted-foreground">
          حدد أقصى مبلغ وسنزايد تلقائياً نيابة عنك بأقل زيادة ممكنة حتى هذا الحد.
        </p>
        {hasAutobid && autobidMaxRiyal != null ? (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
            <p className="font-bold text-emerald-800 dark:text-emerald-200">
              لديك مزايدة تلقائية نشطة حتى {formatSAR(autobidMaxRiyal, false)}
            </p>
            <button
              type="button"
              disabled={cancelLoading}
              onClick={() => void cancel()}
              className="mt-2 text-sm font-bold text-red-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-red-400"
            >
              {cancelLoading ? 'جاري الإلغاء…' : 'إلغاء المزايدة التلقائية'}
            </button>
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">أقصى مبلغ (ر.س)</label>
          <input
            type="number"
            min={minNext}
            step={bidIncrementRiyal}
            value={maxVal}
            onChange={(e) => setMaxVal(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            الحد الأدنى المطلوب: {formatSAR(minNext, false)}
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void submit()}
          className="min-h-[48px] w-full rounded-xl bg-[#1B7F7A] py-3 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-teal-600"
        >
          {loading ? 'جاري الحفظ…' : hasAutobid ? 'تحديث الحد الأقصى' : 'فعّل المزايدة التلقائية'}
        </button>
      </div>
    </Sheet>
  )
}
