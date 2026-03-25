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
