'use client'

import { CheckCircle, Images, SpinnerGap, Trash, XCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

export interface ProcessedImage {
  originalUrl: string
  enhancedUrl: string
  noBgUrl?: string
  thumbhash: string
  appliedSteps: string[]
  compressionRatio: number
}

export interface ImageEnhancerProps {
  onComplete?: (images: ProcessedImage[]) => void
  maxFiles?: number
  showRemoveBg?: boolean
  showBeforeAfter?: boolean
  compact?: boolean
}

const STEPS_AR = [
  'جاري رفع الصور…',
  'جاري تحسين الجودة…',
  'جاري المعالجة الاختيارية…',
  'جاري توليد الأحجام…',
  'جاري الرفع إلى التخزين…',
]

export function ImageEnhancer({
  onComplete,
  maxFiles = 10,
  showRemoveBg = true,
  showBeforeAfter = true,
  compact = false,
}: ImageEnhancerProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [enhanceOn, setEnhanceOn] = useState(true)
  const [removeBg, setRemoveBg] = useState(false)
  const [upscale, setUpscale] = useState(false)
  const [outputFormat, setOutputFormat] = useState<'webp' | 'jpeg' | 'avif'>('webp')
  const [busy, setBusy] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [done, setDone] = useState<ProcessedImage[]>([])
  const [err, setErr] = useState('')
  const [perFileStatus, setPerFileStatus] = useState<boolean[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u))
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [previews])

  const onPick = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return
      const next: File[] = []
      for (let i = 0; i < list.length && files.length + next.length < maxFiles; i++) {
        const f = list[i]
        const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
        if (!ok || f.size > 20 * 1024 * 1024) continue
        next.push(f)
      }
      if (!next.length) return
      const merged = [...files, ...next].slice(0, maxFiles)
      setFiles(merged)
      setPreviews((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u))
        return merged.map((f) => URL.createObjectURL(f))
      })
    },
    [files, maxFiles]
  )

  const removeAt = (i: number) => {
    setFiles((f) => f.filter((_, j) => j !== i))
    setPreviews((p) => {
      const u = p[i]
      if (u) URL.revokeObjectURL(u)
      return p.filter((_, j) => j !== i)
    })
  }

  const process = async () => {
    setErr('')
    const u = readQaboUserFromStorage()
    if (!u?.user_id) {
      setErr('يجب تسجيل الدخول')
      return
    }
    if (!files.length) return

    setBusy(true)
    setDone([])
    setStepIdx(0)
    setPerFileStatus(files.map(() => false))

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setStepIdx((s) => (s + 1) % STEPS_AR.length)
    }, 1400)

    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    fd.append('enhance', enhanceOn ? 'true' : 'false')
    fd.append('removeBg', removeBg ? 'true' : 'false')
    fd.append('upscale', upscale ? 'true' : 'false')
    fd.append('outputFormat', outputFormat)
    fd.append('addBadge', 'false')

    try {
      const res = await fetch('/api/images/process-all?user_id=' + encodeURIComponent(u.user_id), {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشلت المعالجة')
      }
      const imgs = (data.images || []) as {
        url: string
        thumbhash?: string
        appliedSteps?: string[]
        compressionRatio?: number
      }[]
      const out: ProcessedImage[] = imgs.map((img, i) => ({
        originalUrl: previews[i] || '',
        enhancedUrl: img.url,
        thumbhash: img.thumbhash || '',
        appliedSteps: img.appliedSteps || [],
        compressionRatio: typeof img.compressionRatio === 'number' ? img.compressionRatio : 1,
      }))
      setDone(out)
      setPerFileStatus(files.map(() => true))
    } catch (e) {
      console.error('Image processing error:', e)
      setErr(e instanceof Error ? e.message : 'خطأ')
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setBusy(false)
      setStepIdx(0)
    }
  }

  return (
    <div className={'space-y-4 ' + (compact ? '' : '')} dir="rtl">
      {files.length === 0 && !done.length ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={
            'rounded-2xl border-2 border-dashed border-[#1B7F7A]/60 bg-white p-6 dark:border-[#1B7F7A]/40 dark:bg-slate-800 ' +
            (compact ? 'p-4' : '')
          }
        >
          <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
            <Images className="h-14 w-14 text-[#1B7F7A]" weight="duotone" />
            <p className="font-bold text-[#1F2937] dark:text-slate-100">ارفع صور المنتج (حتى {maxFiles} صور)</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">JPEG, PNG, WebP — حد 20MB لكل صورة</p>
            <p className="text-xs text-[#1B7F7A]">تم اختيار {files.length} من {maxFiles}</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />
            <span className="rounded-full bg-[#1B7F7A]/10 px-4 py-2 text-sm font-bold text-[#1B7F7A]">
              اضغط للاختيار أو اسحب هنا
            </span>
          </label>
          <div
            className="mt-4 min-h-[80px] rounded-xl border border-gray-100 p-2 dark:border-slate-700"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              onPick(e.dataTransfer.files)
            }}
          />
        </motion.div>
      ) : null}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {previews.map((src, i) => (
            <motion.div
              key={src + i}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700"
            >
              <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#1B7F7A] text-xs font-bold text-white">
                {i + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-28 w-full object-cover" />
              <button
                type="button"
                disabled={busy}
                onClick={() => removeAt(i)}
                className="absolute left-2 top-2 rounded-full bg-red-500 p-1 text-white"
              >
                <Trash className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {files.length > 0 && !done.length ? (
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-[#F3F4F6]/50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
            <span title="يحسّن الإضاءة والحدة والألوان">✨ تحسين الجودة</span>
            <input
              type="checkbox"
              checked={enhanceOn}
              onChange={(e) => setEnhanceOn(e.target.checked)}
              className="h-4 w-4 accent-[#1B7F7A]"
            />
          </label>
          {showRemoveBg ? (
            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span title="يحذف الخلفية ويضع خلفية بيضاء نظيفة">🖼️ إزالة الخلفية</span>
              <input
                type="checkbox"
                checked={removeBg}
                onChange={(e) => setRemoveBg(e.target.checked)}
                className="h-4 w-4 accent-[#FF8C42]"
              />
            </label>
          ) : null}
          <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
            <span>📐 تكبير الصور الصغيرة</span>
            <input
              type="checkbox"
              checked={upscale}
              onChange={(e) => setUpscale(e.target.checked)}
              className="h-4 w-4 accent-[#1B7F7A]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-slate-400">صيغة الإخراج:</span>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as typeof outputFormat)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="webp">WebP</option>
              <option value="jpeg">JPEG</option>
              <option value="avif">AVIF</option>
            </select>
          </div>
        </div>
      ) : null}

      {files.length > 0 && !done.length ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void process()}
          className="mx-auto block w-full max-w-md rounded-xl bg-[#1B7F7A] py-4 text-center text-base font-bold text-white disabled:opacity-50"
        >
          {busy ? 'جاري المعالجة…' : 'معالجة الصور'}
        </button>
      ) : null}

      {busy && (
        <div className="space-y-2 rounded-xl border border-[#1B7F7A]/30 bg-white p-4 dark:bg-slate-800">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
            <motion.div
              className="h-full bg-[#1B7F7A]"
              initial={{ width: '5%' }}
              animate={{ width: `${((stepIdx + 1) / STEPS_AR.length) * 100}%` }}
            />
          </div>
          <p className="text-center text-sm text-[#1F2937] dark:text-slate-200">
            {stepIdx + 1}/{STEPS_AR.length} — {STEPS_AR[stepIdx]}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {files.map((_, i) => (
              <span key={i}>
                {perFileStatus[i] ? (
                  <CheckCircle className="h-6 w-6 text-green-500" weight="fill" />
                ) : (
                  <SpinnerGap className="h-6 w-6 animate-spin text-[#1B7F7A]" />
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {err ? (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="h-5 w-5" weight="fill" />
          {err}
        </p>
      ) : null}

      <AnimatePresence>
        {done.length > 0 && showBeforeAfter && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {done.map((img, i) => (
              <BeforeAfterCard key={i} img={img} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {done.length > 0 ? (
        <button
          type="button"
          onClick={() => onComplete?.(done)}
          className="w-full rounded-xl bg-[#FF8C42] py-3 text-sm font-bold text-white"
        >
          استخدام الصور المحسّنة
        </button>
      ) : null}
    </div>
  )
}

function BeforeAfterCard({ img }: { img: ProcessedImage }) {
  const [pos, setPos] = useState(50)
  const [mode, setMode] = useState<'slider' | 'toggle'>('slider')
  const pct = Math.max(0, Math.round((1 - 1 / Math.max(img.compressionRatio, 0.01)) * 100))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex justify-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode('slider')}
          className={mode === 'slider' ? 'font-bold text-[#1B7F7A]' : 'text-gray-500'}
        >
          سحب للمقارنة
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={() => setMode('toggle')}
          className={mode === 'toggle' ? 'font-bold text-[#1B7F7A]' : 'text-gray-500'}
        >
          قبل | بعد
        </button>
      </div>
      {mode === 'slider' ? (
        <div className="relative mx-auto flex min-h-[200px] w-full max-w-lg items-center justify-center overflow-hidden rounded-xl bg-[#F3F4F6] dark:bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.enhancedUrl} alt="" className="max-h-64 w-full object-contain" />
          <div
            className="absolute inset-y-0 start-0 overflow-hidden"
            style={{ width: `${pos}%` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.originalUrl} alt="" className="h-full w-full min-w-full object-contain" />
          </div>
          <input
            type="range"
            dir="ltr"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            className="absolute bottom-2 left-1/2 w-[90%] max-w-md -translate-x-1/2 accent-[#1B7F7A]"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center text-xs text-gray-500">قبل</div>
          <div className="text-center text-xs text-gray-500">بعد</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.originalUrl} alt="" className="h-32 w-full rounded-lg object-contain bg-[#F3F4F6] dark:bg-slate-900" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.enhancedUrl} alt="" className="h-32 w-full rounded-lg object-contain bg-[#F3F4F6] dark:bg-slate-900" />
        </div>
      )}
      <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">
        الخطوات: {img.appliedSteps.join('، ')}
      </p>
      <p className="text-xs font-bold text-[#1B7F7A]">الحجم انخفض بنسبة تقريبية {pct}%</p>
    </div>
  )
}
