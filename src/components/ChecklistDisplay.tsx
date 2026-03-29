'use client'

import { Buildings, Calendar, CheckCircle, FileText } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { getChecklistForCategory, type ChecklistItem } from '@/lib/category-checklists'

export interface ChecklistDisplayProps {
  auctionId: string
}

type ApiRow = {
  found?: boolean
  category_id?: string
  responses?: Record<string, unknown>
  file_urls?: Record<string, string>
  validation_passed?: boolean
}

function formatDateAr(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

function daysAgo(iso: string): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
}

function labelForItem(item: ChecklistItem | undefined, value: unknown): string {
  if (value === true) return '✅ نعم'
  if (value === false) return '❌ لا'
  if (item?.type === 'select' && item.options) {
    const o = item.options.find((x) => x.value === value)
    return o?.label_ar || String(value ?? '—')
  }
  return String(value ?? '—')
}

export function ChecklistDisplay({ auctionId }: ChecklistDisplayProps) {
  const [data, setData] = useState<ApiRow | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!auctionId?.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/checklist?auction_id=' + encodeURIComponent(auctionId))
      const j = await res.json()
      setData(res.ok ? j : null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-800" dir="rtl">
        جاري التحميل…
      </div>
    )
  }

  if (!data?.found) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 dark:border-slate-700 dark:bg-slate-800" dir="rtl">
        <p className="text-sm text-gray-600 dark:text-slate-400">⏳ لم يكمل البائع قائمة الفحص بعد</p>
      </div>
    )
  }

  const catId = String(data.category_id || 'general')
  const checklist = getChecklistForCategory(catId)
  const responses = data.responses || {}
  const fileUrls = data.file_urls || {}

  const carCenter = typeof responses.car_inspection_center === 'string' ? responses.car_inspection_center : ''
  const carDate = typeof responses.car_inspection_date === 'string' ? responses.car_inspection_date : ''
  const carReport = fileUrls.car_inspection_report || (typeof responses.car_inspection_report === 'string' ? responses.car_inspection_report : '')

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800" dir="rtl">
      <h3 className="text-lg font-bold text-[#1F2937] dark:text-slate-100">
        📋 تفاصيل حالة المنتج — تصريح البائع
      </h3>
      {data.validation_passed ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-800 dark:bg-green-900/30 dark:text-green-200">
          <CheckCircle className="h-5 w-5" weight="fill" />
          ✅ أكمل البائع قائمة الفحص
        </div>
      ) : null}

      {catId === 'cars' && carCenter && carDate ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#1B7F7A]/30 bg-[#E6F4F3]/60 p-3 text-sm dark:bg-teal-950/30">
          <Buildings className="h-6 w-6 text-[#1B7F7A]" weight="duotone" />
          <span className="font-bold">🔍 فحص مركز {carCenter} — {formatDateAr(carDate)}</span>
          {carReport ? (
            <a
              href={carReport}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-[#1B7F7A] px-3 py-1 text-xs font-bold text-white"
            >
              <FileText className="h-4 w-4" />
              عرض التقرير
            </a>
          ) : null}
        </div>
      ) : null}

      <ul className="space-y-2 text-sm">
        {checklist.items.map((item) => {
          const v = responses[item.id]
          const fileUrl = fileUrls[item.id]
          if (v === undefined && !fileUrl) return null
          const itemDef = checklist.items.find((x) => x.id === item.id)

          if (item.type === 'file' || fileUrl) {
            const url = (fileUrl || v) as string
            if (!url || typeof url !== 'string') return null
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-slate-700">
                <span className="text-gray-600 dark:text-slate-400">{item.question_ar}</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-[#FF8C42] px-3 py-1 text-xs font-bold text-white"
                >
                  📄 عرض المستند
                </a>
              </li>
            )
          }

          if (item.type === 'date' && typeof v === 'string') {
            return (
              <li key={item.id} className="border-b border-gray-100 pb-2 dark:border-slate-700">
                <span className="text-gray-600 dark:text-slate-400">{item.question_ar}: </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <Calendar className="h-4 w-4 text-[#1B7F7A]" />
                  {formatDateAr(v)} (قبل {daysAgo(v)} يوم)
                </span>
              </li>
            )
          }

          return (
            <li key={item.id} className="border-b border-gray-100 pb-2 dark:border-slate-700">
              <span className="text-gray-600 dark:text-slate-400">{item.question_ar}: </span>
              <span className="font-medium text-[#1F2937] dark:text-slate-200">
                {item.type === 'select' ? (
                  <span className="inline-block rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs dark:bg-slate-700">
                    {labelForItem(itemDef, v)}
                  </span>
                ) : (
                  labelForItem(itemDef, v)
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
