'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

type Session = {
  id: string
  verification_code: string
  qr_data: string
  status: string
}

export function HandoverSeller({
  session,
  onRefresh,
}: {
  session: Session
  onRefresh: () => void
}) {
  useEffect(() => {
    const ch = supabase
      .channel('handover-' + session.id)
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

  const label =
    session.status === 'confirmed'
      ? '✅ مُؤكد'
      : session.status === 'scanned'
        ? '📱 تم المسح'
        : session.status === 'disputed'
          ? '⚠️ نزاع'
          : '⏳ في الانتظار'

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 text-center">
      <h1 className="text-xl font-bold text-[#1F2937] dark:text-slate-100">تسليم المنتج</h1>
      <p className="text-sm text-gray-600 dark:text-slate-400">اعرض هذا الرمز للمشتري لمسحه</p>
      <div className="mx-auto flex justify-center rounded-2xl bg-[#1F2937] p-6 dark:bg-slate-950">
        <QRCodeSVG value={session.qr_data} size={220} bgColor="#ffffff" fgColor="#000000" />
      </div>
      <p className="font-mono text-lg font-bold text-[#1B7F7A] dark:text-slate-200">
        أو الرمز: {session.verification_code}
      </p>
      <p className="text-sm font-semibold text-[#FF8C42]">{label}</p>
    </div>
  )
}
