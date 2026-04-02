'use client'

import { useCallback, useState } from 'react'

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, unknown>) => void
    }
  }
}

export function MoyasarCardForm({
  userId,
  publishableKey,
}: {
  userId: string
  publishableKey: string
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const loadSdk = useCallback(async () => {
    if (typeof window === 'undefined') return false
    if (window.Moyasar) return true
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('فشل تحميل مُيسر'))
      document.body.appendChild(s)
    })
    await new Promise<void>((resolve, reject) => {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css'
      l.onload = () => resolve()
      l.onerror = () => reject(new Error('فشل تحميل أنماط مُيسر'))
      document.head.appendChild(l)
    })
    return true
  }, [])

  const start = async () => {
    setErr(null)
    setLoading(true)
    try {
      await loadSdk()
      const el = document.getElementById('moyasar-card-element')
      if (!el || !window.Moyasar) throw new Error('عنصر الدفع غير جاهز')
      const base = window.location.origin
      window.Moyasar.init({
        element: el,
        amount: 100,
        currency: 'SAR',
        description: 'التحقق من البطاقة — القبو',
        publishable_api_key: publishableKey,
        methods: ['creditcard'],
        callback_url: `${base}/api/payment/callback?action=save_card`,
        on_completed: async (payment: { id?: string }) => {
          const pid = payment?.id
          if (!pid) {
            setErr('لم يُرجع معرّف الدفع')
            setLoading(false)
            return
          }
          const res = await fetch('/api/payment/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, payment_id: pid }),
          })
          if (!res.ok) {
            const j = await res.json().catch(() => ({}))
            setErr(j.error ?? 'فشل حفظ البطاقة')
          }
          setLoading(false)
        },
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطأ')
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-gray-700 dark:text-slate-300">
        سيتم خصم 1 ريال للتحقق ثم إرجاعه فوراً عبر مُيسر.
      </p>
      <div id="moyasar-card-element" className="min-h-[120px]" />
      <button
        type="button"
        disabled={loading}
        onClick={() => void start()}
        className="w-full rounded-lg bg-[#1B7F7A] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'جاري التحميل…' : 'تحميل نموذج البطاقة'}
      </button>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  )
}
