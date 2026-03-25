'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

function ConfettiBurst() {
  const pieces = Array.from({ length: 32 }, (_, i) => i)
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <motion.span
          key={i}
          className="absolute top-[12%] h-3 w-2 rounded-sm shadow-sm"
          style={{
            left: `${(i * 3.1) % 96}%`,
            backgroundColor: i % 3 === 0 ? '#FF8C42' : i % 3 === 1 ? '#1B7F7A' : '#ffffff',
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: typeof window !== 'undefined' ? window.innerHeight * 0.9 : 700,
            opacity: 0,
            rotate: 280 + (i % 7) * 40,
            x: ((i % 5) - 2) * 55,
          }}
          transition={{ duration: 2.4, delay: i * 0.035, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function CallbackInner() {
  const searchParams = useSearchParams()
  const provider = searchParams.get('provider')
  const moyasarId = provider === 'moyasar' ? searchParams.get('id') : null
  const tapId =
    searchParams.get('tap_id') ||
    searchParams.get('charge_id') ||
    (provider !== 'moyasar' ? searchParams.get('id') : null)

  const [phase, setPhase] = useState<'loading' | 'success' | 'failed'>('loading')
  const [detail, setDetail] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [walletTopup, setWalletTopup] = useState(false)
  const [auctionId, setAuctionId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    try {
      const aid = sessionStorage.getItem('qabboo_last_checkout_auction')
      if (aid) setAuctionId(aid)
    } catch {
      /* ignore */
    }

    if (moyasarId) {
      fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: moyasarId }),
      })
        .then((r) => r.json())
        .then(
          (data: {
            success?: boolean
            status?: string
            error?: string
            order_id?: string
            kind?: string
          }) => {
            if (cancelled) return
            if (data.success) {
              setPhase('success')
              setDetail(data.status || 'paid')
              if (data.order_id) setOrderId(String(data.order_id))
              if (data.kind === 'wallet') setWalletTopup(true)
            } else {
              setPhase('failed')
              setDetail(data.error || data.status || 'فشل التحقق')
            }
          }
        )
        .catch(() => {
          if (!cancelled) {
            setPhase('failed')
            setDetail('تعذر الاتصال بالخادم')
          }
        })
      return () => {
        cancelled = true
      }
    }

    if (!tapId) {
      setPhase('failed')
      setDetail('لم يُستلم رقم العملية')
      return
    }

    fetch('/api/payments/verify?tap_id=' + encodeURIComponent(tapId))
      .then((r) => r.json())
      .then((data: { success?: boolean; status?: string; error?: string }) => {
        if (cancelled) return
        if (data.success) {
          setPhase('success')
          setDetail(data.status || 'CAPTURED')
        } else {
          setPhase('failed')
          setDetail(data.error || data.status || 'فشل التحقق')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase('failed')
          setDetail('تعذر الاتصال بالخادم')
        }
      })

    return () => {
      cancelled = true
    }
  }, [moyasarId, tapId])

  const retryAuctionId = auctionId

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center px-4 py-12" dir="rtl">
      {phase === 'success' && <ConfettiBurst />}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center relative z-10">
        {phase === 'loading' && (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-[#1B7F7A] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 font-medium">جاري التحقق من الدفع...</p>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/15 text-[#059669] text-3xl font-bold">
              ✓
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {walletTopup ? 'تم شحن المحفظة بنجاح!' : 'تمت عملية الدفع بنجاح!'}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {walletTopup ? 'تم إضافة المبلغ إلى رصيدك المتاح.' : 'شكراً لك. تم تأكيد عملية الدفع.'}
            </p>
            {!walletTopup && orderId && (
              <Link
                href={'/orders/' + orderId}
                className="inline-block w-full py-3.5 rounded-xl bg-[#FF8C42] text-white font-bold shadow-md hover:bg-[#E87A35] mb-3"
              >
                عرض الطلب
              </Link>
            )}
            {walletTopup && (
              <Link
                href="/wallet"
                className="inline-block w-full py-3.5 rounded-xl bg-[#1B7F7A] text-white font-bold shadow-md hover:bg-[#156661] mb-3"
              >
                فتح المحفظة
              </Link>
            )}
            <Link
              href="/"
              className="inline-block w-full py-3 rounded-xl border-2 border-gray-200 text-gray-800 font-bold"
            >
              الرئيسية
            </Link>
          </>
        )}

        {phase === 'failed' && (
          <>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 text-3xl font-bold">
              ✕
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">فشلت عملية الدفع</h1>
            <p className="text-sm text-gray-600 mb-6">{detail}</p>
            {retryAuctionId && (
              <Link
                href={'/checkout/' + retryAuctionId}
                className="block w-full py-3.5 rounded-xl bg-[#FF8C42] text-white font-bold mb-3"
              >
                إعادة المحاولة
              </Link>
            )}
            <Link href="/" className="block w-full py-3 rounded-xl bg-gray-900 text-white font-bold">
              الرئيسية
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]" dir="rtl">
          <div className="animate-spin w-10 h-10 border-4 border-[#1B7F7A] border-t-transparent rounded-full" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  )
}
