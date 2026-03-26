'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Session = {
  id: string
  auction_id: string
  qr_data: string
  verification_code: string
  status: string
}

export function HandoverBuyer({
  session,
  userId,
  onRefresh,
}: {
  session: Session
  userId: string
  onRefresh: () => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [skipLoading, setSkipLoading] = useState(false)
  const [c1, setC1] = useState(false)
  const [c2, setC2] = useState(false)
  const [c3, setC3] = useState(false)

  useEffect(() => {
    const ch = supabase
      .channel('handover-buyer-' + session.id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'handover_sessions',
          filter: 'id=eq.' + session.id,
        },
        () => onRefresh()
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [session.id, onRefresh])

  const scan = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/handover', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          auction_id: session.auction_id,
          action: 'scan',
          qr_data: code.trim() || undefined,
          verification_code: /^\d{6}$/.test(code.trim()) ? code.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل')
      onRefresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/handover', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          auction_id: session.auction_id,
          action: 'confirm',
          skipped_qr: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل')
      onRefresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  const dispute = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/handover', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          auction_id: session.auction_id,
          action: 'dispute',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل')
      onRefresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  if (session.status === 'pending') {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-6">
        <h1 className="text-center text-xl font-bold text-[#1F2937] dark:text-slate-100">استلام المنتج</h1>
        <p className="text-center text-sm text-gray-600 dark:text-slate-400">
          الصق بيانات QR أو أدخل الرمز المكوّن من 6 أرقام
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="UUID من QR أو الرقم السري"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          disabled={busy || !code.trim()}
          onClick={() => void scan()}
          className="w-full rounded-xl bg-[#1B7F7A] py-3 font-bold text-white disabled:opacity-50"
        >
          تأكيد المسح
        </button>

        {session.status === 'pending' && !showSkipConfirm ? (
          <button
            type="button"
            onClick={() => setShowSkipConfirm(true)}
            className="mt-4 w-full text-center text-xs text-gray-400 underline dark:text-slate-500"
          >
            تخطي مسح الباركود
          </button>
        ) : null}

        {showSkipConfirm && session.status === 'pending' ? (
          <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-900/20">
            <p className="mb-2 text-sm font-bold text-amber-800 dark:text-amber-300">⚠️ تحذير مهم</p>
            <p className="mb-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              بتخطيك لمسح الباركود، أنت تؤكد أنك استلمت المنتج وفحصته شخصياً وتتحمل المسؤولية الكاملة عن حالته. لن
              تتمكن من فتح نزاع بعد التأكيد.
            </p>
            <label className="mb-3 flex items-start gap-2">
              <input type="checkbox" id="skip-agree" className="mt-1 h-4 w-4 accent-[#1B7F7A]" />
              <span className="text-xs text-amber-800 dark:text-amber-300">
                أقر بأنني استلمت المنتج وفحصته وأتحمل كامل المسؤولية
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSkipConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 dark:border-slate-600 dark:text-slate-300"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={async () => {
                  const checkbox = document.getElementById('skip-agree') as HTMLInputElement
                  if (!checkbox?.checked) {
                    alert('يجب الموافقة على الإقرار أولاً')
                    return
                  }
                  setSkipLoading(true)
                  try {
                    const res = await fetch('/api/handover', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        user_id: userId,
                        session_id: session.id,
                        auction_id: session.auction_id,
                        action: 'confirm',
                        skipped_qr: true,
                      }),
                    })
                    if (res.ok) {
                      onRefresh()
                    } else {
                      const d = (await res.json()) as { error?: string }
                      alert(d.error || 'حدث خطأ')
                    }
                  } catch {
                    alert('حدث خطأ في الاتصال')
                  } finally {
                    setSkipLoading(false)
                  }
                }}
                disabled={skipLoading}
                className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {skipLoading ? 'جاري التأكيد...' : 'تأكيد الاستلام بدون مسح'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  if (session.status === 'scanned') {
    const okCheck = c1 && c2 && c3
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-6">
        <h1 className="text-xl font-bold text-[#1F2937] dark:text-slate-100">فحص السلعة</h1>
        <label className="flex items-center gap-2 text-sm dark:text-slate-200">
          <input type="checkbox" checked={c1} onChange={(e) => setC1(e.target.checked)} />
          المنتج مطابق للوصف
        </label>
        <label className="flex items-center gap-2 text-sm dark:text-slate-200">
          <input type="checkbox" checked={c2} onChange={(e) => setC2(e.target.checked)} />
          المنتج سليم بدون أضرار
        </label>
        <label className="flex items-center gap-2 text-sm dark:text-slate-200">
          <input type="checkbox" checked={c3} onChange={(e) => setC3(e.target.checked)} />
          أوافق على الاستلام
        </label>
        <button
          type="button"
          disabled={busy || !okCheck}
          onClick={() => void confirm()}
          className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-50"
        >
          أؤكد الاستلام والسلعة سليمة
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void dispute()}
          className="w-full rounded-xl border border-red-300 py-2 text-sm font-bold text-red-600 dark:border-red-800 dark:text-red-400"
        >
          المنتج غير مطابق — فتح نزاع
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 text-center text-[#1F2937] dark:text-slate-100">
      {session.status === 'confirmed' ? '✅ تم تأكيد الاستلام' : null}
      {session.status === 'disputed' ? 'تم تسجيل نزاع — سيتواصل فريق قبو' : null}
    </div>
  )
}
