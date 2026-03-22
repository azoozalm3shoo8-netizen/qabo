'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
            backgroundColor: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#fcd34d' : '#fff7ed',
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const tapId = searchParams.get('tap_id') || searchParams.get('charge_id') || searchParams.get('id')

  const [phase, setPhase] = useState<'loading' | 'success' | 'failed'>('loading')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    if (!tapId) {
      setPhase('failed')
      setDetail('لم يُستلم رقم العملية')
      return
    }

    let cancelled = false
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
  }, [tapId])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12" dir="rtl">
      {phase === 'success' && <ConfettiBurst />}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center relative z-10">
        {phase === 'loading' && (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 font-medium">جاري التحقق من الدفع...</p>
          </>
        )}

        {phase === 'success' && (
          <>
            <p className="text-5xl mb-3">🎉</p>
            <h1 className="text-xl font-bold text-gray-900 mb-2">تم الدفع بنجاح! 🎉</h1>
            <p className="text-sm text-gray-500 mb-6">شكراً لك. تم تأكيد عملية الدفع.</p>
            <Link
              href="/"
              className="inline-block w-full py-3.5 rounded-xl bg-amber-500 text-white font-bold shadow-md"
            >
              العودة للرئيسية
            </Link>
          </>
        )}

        {phase === 'failed' && (
          <>
            <p className="text-5xl mb-3">😕</p>
            <h1 className="text-xl font-bold text-gray-900 mb-2">فشل الدفع</h1>
            <p className="text-sm text-gray-600 mb-6">{detail}</p>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold"
            >
              حاول مرة أخرى
            </button>
            <Link href="/" className="block mt-3 text-sm text-amber-700 font-medium">
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  )
}
