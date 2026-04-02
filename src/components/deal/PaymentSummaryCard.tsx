'use client'

import { useEffect, useState } from 'react'

export function PaymentSummaryCard({
  saleHalalas,
  sellerRate,
  buyerProtection,
  totalBuyer,
  sellerPayout,
  platformRev,
}: {
  saleHalalas: number
  sellerRate: number
  buyerProtection: number
  totalBuyer: number
  sellerPayout: number
  platformRev: number
}) {
  const [free, setFree] = useState(false)
  useEffect(() => {
    void fetch('/api/platform/free-period')
      .then((r) => r.json())
      .then((j) => setFree(Boolean(j.isActive)))
      .catch(() => setFree(false))
  }, [])

  const f = (h: number) => (h / 100).toLocaleString('ar-SA', { minimumFractionDigits: 2 })
  const sr = (sellerRate * 100).toFixed(2)
  const usualComm = Math.round(saleHalalas * 0.05)
  const oldComm = Math.round(saleHalalas * sellerRate)
  const oldProt = buyerProtection || Math.round(saleHalalas * 0.02)

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-gray-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <p>سعر المنتج: {f(saleHalalas)} ر.س</p>
      {free ? (
        <>
          <p>
            عمولة البائع: 0 ر.س (مجانية حالياً! عادةً {f(usualComm)} ر.س —{' '}
            <span className="text-gray-400 line-through">{f(oldComm)} ر.س</span> — {sr}%)
          </p>
          <p>
            رسم حماية المشتري: 0 ر.س (مجاني حالياً! عادةً{' '}
            <span className="text-gray-400 line-through">{f(oldProt)} ر.س</span>)
          </p>
        </>
      ) : (
        <>
          <p>
            عمولة البائع ({sr}%): -{f(saleHalalas * sellerRate)} ر.س
          </p>
          <p>رسم حماية المشتري: +{f(buyerProtection)} ر.س</p>
        </>
      )}
      <hr className="my-2 border-gray-200 dark:border-slate-600" />
      <p className="font-bold">المشتري يدفع: {f(free ? saleHalalas : totalBuyer)} ر.س</p>
      <p className="font-bold">البائع يحصل: {f(free ? saleHalalas : sellerPayout)} ر.س {free ? '(كامل المبلغ!)' : ''}</p>
      <p>عمولة المنصة: {f(free ? 0 : platformRev)} ر.س {free ? '🎉' : ''}</p>
    </div>
  )
}
