'use client'

import { CaretDown, CaretUp, CheckCircle, Clock, Robot, Warning } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import type { Defect } from '@/lib/video360-types'

export interface DefectBadgeProps {
  auctionId: string
}

type ViewPayload = {
  available?: boolean
  defects?: Defect[]
  condition_score?: number
  seller_response_status?: string
  seller_confirmed_defects?: number
  seller_denied_defects?: number
}

type ResponseRow = {
  defect_index: number
  seller_confirmed: boolean
  seller_comment?: string
  defect_type?: string
}

export function DefectBadge({ auctionId }: DefectBadgeProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ViewPayload | null>(null)
  const [rows, setRows] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!auctionId?.trim()) return
    setLoading(true)
    try {
      const [vRes, dRes] = await Promise.all([
        fetch('/api/video360/view?auction_id=' + encodeURIComponent(auctionId)),
        fetch('/api/video360/defect-response?auction_id=' + encodeURIComponent(auctionId)),
      ])
      const v = await vRes.json()
      const d = await dRes.json()
      setView(vRes.ok ? v : null)
      setRows(Array.isArray(d?.responses) ? d.responses : [])
    } catch {
      setView(null)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800" dir="rtl">
        جاري التحميل…
      </div>
    )
  }

  if (!view?.available) {
    return null
  }

  const defects = (view.defects || []) as Defect[]
  const score = Number(view.condition_score) || 0
  const status = String(view.seller_response_status || 'pending')
  const confirmedJob = Number(view.seller_confirmed_defects) || 0
  const deniedJob = Number(view.seller_denied_defects) || 0

  if (defects.length === 0) {
    return (
      <div
        className="rounded-xl border border-green-200 bg-green-50/90 p-4 dark:border-green-900 dark:bg-green-950/40"
        dir="rtl"
      >
        <div className="flex items-start gap-2">
          <CheckCircle className="h-6 w-6 shrink-0 text-green-600" weight="fill" />
          <div>
            <p className="text-sm font-bold text-green-800 dark:text-green-200">
              ✅ تم فحص المنتج بالذكاء الاصطناعي — لم يتم اكتشاف عيوب
            </p>
            <p className="mt-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold text-[#1B7F7A] dark:bg-slate-800">
              حالة المنتج: {score}/100
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'pending' || status !== 'completed') {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 dark:border-slate-600 dark:bg-slate-800" dir="rtl">
        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
          <Clock className="h-6 w-6" weight="duotone" />
          <p className="text-sm font-medium">⏳ بانتظار مراجعة البائع</p>
        </div>
      </div>
    )
  }

  const n = defects.length
  const denied = deniedJob > 0 ? deniedJob : rows.filter((r) => !r.seller_confirmed).length
  const confirmed = confirmedJob > 0 ? confirmedJob : rows.filter((r) => r.seller_confirmed).length

  const sellerDeniedSome = denied > 0
  const baseClass = sellerDeniedSome
    ? 'border-red-200 bg-red-50/90 dark:border-red-900 dark:bg-red-950/30'
    : 'border-[#FF8C42]/40 bg-orange-50/90 dark:border-orange-900 dark:bg-orange-950/30'

  return (
    <div className={'rounded-xl border p-4 ' + baseClass} dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-right"
      >
        <div className="flex items-center gap-2">
          <Robot className="h-6 w-6 text-[#1B7F7A]" weight="duotone" />
          <div>
            {sellerDeniedSome ? (
              <p className="text-sm font-bold text-red-800 dark:text-red-200">
                🤖 {n} ملاحظة — البائع أنكر {denied} منها
              </p>
            ) : (
              <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
                ⚠️ {n} ملاحظة — البائع أقرّ بها
              </p>
            )}
            <p className="text-xs text-gray-600 dark:text-slate-400">حالة المنتج: {score}/100</p>
          </div>
        </div>
        {open ? <CaretUp className="h-5 w-5 shrink-0" /> : <CaretDown className="h-5 w-5 shrink-0" />}
      </button>
      {sellerDeniedSome ? (
        <p className="mt-2 flex items-start gap-1 text-xs text-red-700 dark:text-red-300">
          <Warning className="h-4 w-4 shrink-0" weight="fill" />
          البائع يتحمل المسؤولية الكاملة عن دقة الوصف
        </p>
      ) : null}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-3 space-y-2 border-t border-black/5 pt-3 dark:border-white/10">
              {defects.map((d, i) => {
                const row = rows.find((r) => r.defect_index === i)
                const ok = row ? row.seller_confirmed : i < confirmed
                return (
                  <li
                    key={i}
                    className={
                      'rounded-lg p-2 text-sm ' +
                      (ok
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-red-50 dark:bg-red-900/20')
                    }
                  >
                    <span className="font-bold">{d.type}</span> — {d.description_ar}
                    {row?.seller_comment ? (
                      <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">تعليق البائع: {row.seller_comment}</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
