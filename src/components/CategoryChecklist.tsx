'use client'

import {
  Armchair,
  BatteryFull,
  Bed,
  Buildings,
  Calendar,
  Camera,
  Car,
  ChatText,
  Checks,
  Circle,
  CircleDashed,
  Clock,
  CoatHanger,
  Cube,
  DeviceMobile,
  Drop,
  FileText,
  Gauge,
  Hammer,
  House,
  IdentificationCard,
  Lightning,
  ListBullets,
  MagnifyingGlass,
  Monitor,
  NotePencil,
  Package,
  PaintBrush,
  Plugs,
  Receipt,
  Ruler,
  Scissors,
  SealCheck,
  ShieldCheck,
  Star,
  TShirt,
  Truck,
  Warning,
  WarningCircle,
  Watch,
  Wrench,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import {
  getChecklistForCategory,
  isChecklistItemVisible,
  validateChecklistResponses,
  type CategoryChecklist,
  type ChecklistItem,
} from '@/lib/category-checklists'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

const ICONS: Record<string, React.ComponentType<{ className?: string; weight?: 'duotone' | 'fill' | 'regular' }>> = {
  Package,
  Lightning,
  Plugs,
  ShieldCheck,
  FileText,
  BatteryFull,
  Monitor,
  Checks,
  MagnifyingGlass,
  Calendar,
  Buildings,
  Gauge,
  Camera,
  WarningCircle,
  PaintBrush,
  ListBullets,
  CircleDashed,
  IdentificationCard,
  House,
  Ruler,
  Bed,
  Drop,
  Clock,
  Hammer,
  SealCheck,
  Receipt,
  Scissors,
  Warning,
  Watch,
  Wrench,
  Circle,
  Cube,
  Truck,
  ChatText,
  NotePencil,
  DeviceMobile,
  Car,
  TShirt,
  Armchair,
  Star,
  CoatHanger,
}

function ItemIcon({ name, color }: { name: string; color: string }) {
  const Cmp = ICONS[name] || Package
  return (
    <span className="inline-flex shrink-0" style={{ color }}>
      <Cmp className="h-6 w-6" weight="duotone" />
    </span>
  )
}

export interface CategoryChecklistProps {
  categoryId: string
  /** مطلوب لحفظ القائمة عبر API */
  auctionId?: string
  /** عند true: التحقق فقط واستدعاء onComplete دون POST (لدمج الإرسال مع نشر المزاد) */
  skipApiSave?: boolean
  onComplete?: (responses: Record<string, unknown>, files: Record<string, File>) => void
  initialValues?: Record<string, unknown>
  readOnly?: boolean
}

export function CategoryChecklist({
  categoryId,
  auctionId,
  skipApiSave,
  onComplete,
  initialValues,
  readOnly,
}: CategoryChecklistProps) {
  const checklist = useMemo(() => getChecklistForCategory(categoryId), [categoryId])
  const [responses, setResponses] = useState<Record<string, unknown>>(initialValues || {})
  const [files, setFiles] = useState<Record<string, File>>({})
  const [err, setErr] = useState<{ itemId: string; message_ar: string }[]>([])
  const [saving, setSaving] = useState(false)

  const validation = useMemo(
    () => validateChecklistResponses(checklist, responses, files),
    [checklist, responses, files]
  )

  const carInspectionFalse = responses.car_inspection === false
  const inspectionDateStr = typeof responses.car_inspection_date === 'string' ? responses.car_inspection_date : ''
  let inspectionOld = false
  if (inspectionDateStr && responses.car_inspection === true) {
    const d = new Date(inspectionDateStr)
    if (!Number.isNaN(d.getTime())) {
      const days = Math.floor((Date.now() - d.getTime()) / 86400000)
      inspectionOld = days > 30
    }
  }

  const setVal = useCallback((id: string, v: unknown) => {
    setResponses((r) => ({ ...r, [id]: v }))
    setErr([])
  }, [])

  const save = async () => {
    const v = validateChecklistResponses(checklist, responses, files)
    if (!v.valid) {
      setErr(v.errors)
      return
    }
    if (skipApiSave) {
      onComplete?.(responses, files)
      return
    }
    const u = readQaboUserFromStorage()
    if (!u?.user_id) {
      setErr([{ itemId: '_', message_ar: 'يجب تسجيل الدخول' }])
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      const aid = (auctionId || (responses._auction_id as string) || '').trim()
      if (!aid) {
        setErr([{ itemId: '_', message_ar: 'معرّف الإعلان (auction_id) مطلوب للحفظ' }])
        setSaving(false)
        return
      }
      fd.append('auction_id', aid)
      fd.append('category_id', categoryId)
      fd.append('responses', JSON.stringify(responses))
      for (const [id, f] of Object.entries(files)) {
        fd.append('file_' + id, f)
      }
      const res = await fetch('/api/checklist?user_id=' + encodeURIComponent(u.user_id), {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.errors?.[0]?.message_ar || 'فشل الحفظ')
      }
      onComplete?.(responses, files)
    } catch (e) {
      setErr([{ itemId: '_', message_ar: e instanceof Error ? e.message : 'خطأ' }])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Header checklist={checklist} />
      {checklist.warningBanner_ar ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {checklist.warningBanner_ar}
        </div>
      ) : null}
      {carInspectionFalse ? (
        <div className="rounded-xl border border-red-300 bg-red-100 p-3 text-sm font-bold text-red-800 dark:border-red-800 dark:bg-red-900/40">
          ❌ لا يمكن عرض السيارة بدون فحص معتمد حديث
        </div>
      ) : null}
      {inspectionOld ? (
        <div className="rounded-xl border border-[#FF8C42] bg-orange-50 p-3 text-sm text-orange-900 dark:bg-orange-950/40">
          الفحص قديم (يجب أن يكون خلال 30 يوم)
        </div>
      ) : null}

      <div className="space-y-3">
        {checklist.items.map((item) => (
          <AnimatePresence key={item.id}>
            {isChecklistItemVisible(item, responses) ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <ItemCard
                  item={item}
                  checklist={checklist}
                  value={responses[item.id]}
                  file={files[item.id]}
                  readOnly={readOnly}
                  onChange={(v) => setVal(item.id, v)}
                  onFile={(f) => setFiles((fl) => ({ ...fl, [item.id]: f }))}
                  error={err.find((e) => e.itemId === item.id)?.message_ar}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        ))}
      </div>

      {!readOnly ? (
        <button
          type="button"
          disabled={!validation.valid || saving}
          onClick={() => void save()}
          className="w-full rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? 'جاري الحفظ…' : skipApiSave ? 'تأكيد تفاصيل الحالة' : 'حفظ القائمة'}
        </button>
      ) : null}
    </div>
  )
}

function Header({ checklist }: { checklist: CategoryChecklist }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <ItemIcon name={checklist.icon} color={checklist.color} />
      <div>
        <h3 className="text-lg font-bold text-[#1F2937] dark:text-slate-100">{checklist.categoryName_ar}</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400">{checklist.description_ar}</p>
      </div>
    </div>
  )
}

function ItemCard({
  item,
  checklist,
  value,
  file,
  readOnly,
  onChange,
  onFile,
  error,
}: {
  item: ChecklistItem
  checklist: CategoryChecklist
  value: unknown
  file?: File
  readOnly?: boolean
  onChange: (v: unknown) => void
  onFile: (f: File) => void
  error?: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex gap-3">
        <ItemIcon name={item.icon} color={checklist.color} />
        <div className="min-w-0 flex-1 text-right">
          <p className="font-medium text-[#1F2937] dark:text-slate-100">
            {item.question_ar}
            {item.required ? <span className="text-red-500"> *</span> : null}
          </p>

          {readOnly ? (
            <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">{String(value ?? '—')}</p>
          ) : item.type === 'boolean' ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onChange(true)}
                className={
                  'flex-1 rounded-full py-2 text-sm font-bold ' +
                  (value === true ? 'bg-[#1B7F7A] text-white' : 'bg-gray-100 dark:bg-slate-700')
                }
              >
                نعم
              </button>
              <button
                type="button"
                onClick={() => onChange(false)}
                className={
                  'flex-1 rounded-full py-2 text-sm font-bold ' +
                  (value === false ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-700')
                }
              >
                لا
              </button>
            </div>
          ) : item.type === 'select' && item.options ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onChange(o.value)}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-bold ' +
                    (value === o.value
                      ? 'bg-[#1B7F7A] text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200')
                  }
                >
                  {o.label_ar}
                </button>
              ))}
            </div>
          ) : item.type === 'text' ? (
            <input
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          ) : item.type === 'number' ? (
            <input
              type="number"
              min={item.validation?.min}
              max={item.validation?.max}
              value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          ) : item.type === 'date' ? (
            <input
              type="date"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
          ) : item.type === 'file' ? (
            <label className="mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-[#1B7F7A]/40 p-4">
              <FileText className="h-8 w-8 text-[#1B7F7A]" />
              <span className="text-xs text-gray-600">اضغط لاختيار ملف</span>
              <input
                type="file"
                className="hidden"
                accept={item.validation?.fileTypes?.join(',') || 'image/*,application/pdf'}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onFile(f)
                }}
              />
              {file ? (
                <span className="text-xs text-[#1B7F7A]">{file.name}</span>
              ) : null}
            </label>
          ) : null}

          {item.hint_ar ? <p className="mt-1 text-xs text-gray-500">{item.hint_ar}</p> : null}
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
