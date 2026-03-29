'use client'

import { CheckCircle, VideoCamera, XCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DefectConfirmation } from '@/components/DefectConfirmation'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import type { Video360Result } from '@/lib/video360-types'
import { Video360Viewer } from '@/components/Video360Viewer'

export interface Video360UploadProps {
  auctionId?: string
  onComplete?: (result: Video360Result) => void
}

const STATUS_AR: Record<string, string> = {
  pending: 'في انتظار البدء...',
  uploading: 'جاري رفع الفيديو...',
  extracting: 'جاري استخراج الإطارات...',
  filtering: 'جاري فحص جودة الصور...',
  enhancing: 'جاري تحسين جودة الصور...',
  'removing-bg': 'جاري إزالة خلفية الإطارات...',
  analyzing: 'الذكاء الاصطناعي يحلل المنتج...',
  annotating: 'جاري تعليم العيوب...',
  done: 'اكتملت المعالجة!',
  failed: 'فشلت المعالجة',
}

function statusToPercent(s: string): number {
  const m: Record<string, number> = {
    pending: 8,
    uploading: 18,
    extracting: 38,
    filtering: 48,
    enhancing: 56,
    'removing-bg': 62,
    analyzing: 72,
    annotating: 88,
    done: 100,
    failed: 0,
  }
  return m[s] ?? 10
}

function rowToResult(row: Record<string, unknown>, jobId: string): Video360Result {
  const frame_urls = (row.frame_urls as string[]) || []
  const annotated_urls = (row.annotated_urls as string[]) || []
  const nobg_urls = (row.nobg_urls as string[]) || []
  const defects = (row.defects as Video360Result['defects']) || []
  const hotspots = (row.hotspots as Video360Result['hotspots']) || []
  return {
    job_id: jobId,
    status: String(row.status || 'done'),
    total_frames: Number(row.total_extracted) || frame_urls.length,
    valid_frames: Number(row.valid_frames) || frame_urls.length,
    defects_count: Array.isArray(defects) ? defects.length : 0,
    overall_condition:
      String(row.overall_condition || 'unknown') === 'unknown'
        ? 'غير محدد'
        : String(row.overall_condition || 'unknown'),
    condition_score: Number(row.condition_score) || 0,
    summary: String(row.condition_summary_ar || ''),
    frame_urls,
    annotated_urls,
    nobg_urls: nobg_urls.length ? nobg_urls : undefined,
    hotspots,
    defects,
  }
}

export function Video360Upload({ auctionId, onComplete }: Video360UploadProps) {
  const [drag, setDrag] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [percent, setPercent] = useState(0)
  const [error, setError] = useState('')
  const [doneResult, setDoneResult] = useState<Video360Result | null>(null)
  const [showViewer, setShowViewer] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [autoEnhance, setAutoEnhance] = useState(true)
  const [removeBg, setRemoveBg] = useState(false)
  const [defectFlowDone, setDefectFlowDone] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopPoll()
  }, [stopPoll])

  const pollStatus = useCallback(
    (id: string) => {
      stopPoll()
      const tick = async () => {
        try {
          const res = await fetch('/api/video360/status?job_id=' + encodeURIComponent(id))
          const row = await res.json()
          if (!res.ok) return
          const st = String(row.status || '')
          setStatus(st)
          setPercent(statusToPercent(st))
          if (st === 'done') {
            stopPoll()
            const result = rowToResult(row, id)
            setDoneResult(result)
            setDefectFlowDone(result.defects.length === 0)
            setUploading(false)
            onComplete?.(result)
          }
          if (st === 'failed') {
            stopPoll()
            setUploading(false)
            setError(String(row.error_message || 'حدث خطأ أثناء المعالجة'))
          }
        } catch {
          /* ignore */
        }
      }
      void tick()
      pollRef.current = setInterval(() => void tick(), 3000)
    },
    [onComplete, stopPoll]
  )

  const sendFile = async (file: File) => {
    setError('')
    setDoneResult(null)
    setShowViewer(false)
    const u = readQaboUserFromStorage()
    if (!u?.user_id) {
      setError('يجب تسجيل الدخول لرفع الفيديو')
      return
    }
    const okMime = ['video/mp4', 'video/quicktime', 'video/webm']
    if (!okMime.includes(file.type)) {
      setError('الصيغ المسموحة: MP4، MOV، WebM')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('الحد الأقصى لحجم الملف 100 ميجابايت')
      return
    }

    setUploading(true)
    setStatus('pending')
    setPercent(5)

    const fd = new FormData()
    fd.append('file', file)
    if (auctionId) fd.append('auction_id', auctionId)
    fd.append('enhance', autoEnhance ? 'true' : 'false')
    fd.append('removeBg', removeBg ? 'true' : 'false')

    try {
      const res = await fetch('/api/video360/process?user_id=' + encodeURIComponent(u.user_id), {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل بدء المعالجة')
      }
      const jid = data.job_id as string
      setJobId(jid)
      setStatus('pending')
      pollStatus(jid)
    } catch (e: unknown) {
      setUploading(false)
      setError(e instanceof Error ? e.message : 'خطأ')
    }
  }

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) void sendFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void sendFile(f)
  }

  const retry = () => {
    setError('')
    setJobId(null)
    setStatus('')
    setPercent(0)
    setDefectFlowDone(false)
  }

  const r = 52
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c

  return (
    <div className="rounded-2xl border-2 border-dashed border-[#1B7F7A]/60 bg-white p-4 dark:border-[#1B7F7A]/40 dark:bg-slate-800" dir="rtl">
      <input id="v360-file" type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={onInput} />

      <AnimatePresence mode="wait">
        {!uploading && !doneResult && !error && (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={
              'flex flex-col items-center justify-center gap-3 py-8 text-center transition-colors ' +
              (drag ? 'bg-[#E6F4F3]/80 dark:bg-[#134e4a]/30' : '')
            }
          >
            <VideoCamera className="h-16 w-16 text-[#1B7F7A]" weight="duotone" />
            <p className="text-base font-bold text-[#1F2937] dark:text-slate-100">
              صوّر فيديو 15-20 ثانية وأنت تدور حول المنتج
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400">MP4, MOV, WebM — حد أقصى 100MB</p>
            <label
              htmlFor="v360-file"
              className="cursor-pointer rounded-full bg-[#1B7F7A] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#156661] active:scale-95"
            >
              اختر فيديو
            </label>
            <div className="mt-4 w-full max-w-sm space-y-3 text-right text-sm">
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[#1B7F7A]/30 bg-[#F3F4F6]/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-900/50">
                <span className="text-[#1F2937] dark:text-slate-200">✨ تحسين جودة الصور تلقائياً</span>
                <input
                  type="checkbox"
                  checked={autoEnhance}
                  onChange={(e) => setAutoEnhance(e.target.checked)}
                  className="h-4 w-4 accent-[#1B7F7A]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[#FF8C42]/40 bg-[#F3F4F6]/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-900/50">
                <span className="text-[#1F2937] dark:text-slate-200">🖼️ إزالة خلفية الصور</span>
                <input
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                  className="h-4 w-4 accent-[#FF8C42]"
                />
              </label>
            </div>
          </motion.div>
        )}

        {uploading && (
          <motion.div
            key="prog"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-10"
          >
            <div className="relative h-32 w-32">
              <svg className="-rotate-90 transform" width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-slate-600" />
                <circle
                  cx="64"
                  cy="64"
                  r={r}
                  fill="none"
                  stroke="#1B7F7A"
                  strokeWidth="8"
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[#1B7F7A]">{percent}%</div>
            </div>
            <p className="text-center text-sm font-medium text-[#1F2937] dark:text-slate-200">
              {STATUS_AR[status] || 'جاري المعالجة...'}
            </p>
            {jobId && <p className="font-mono text-[10px] text-gray-400">job: {jobId.slice(0, 8)}…</p>}
          </motion.div>
        )}

        {error && !uploading && (
          <motion.div
            key="err"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-8"
          >
            <XCircle className="h-14 w-14 text-red-500" weight="fill" />
            <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="rounded-full bg-[#FF8C42] px-5 py-2 text-sm font-bold text-white"
            >
              حاول مرة أخرى
            </button>
          </motion.div>
        )}

        {doneResult && !uploading && doneResult.defects.length > 0 && !defectFlowDone && jobId && (
          <motion.div key="defects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
            <DefectConfirmation
              jobId={jobId}
              auctionId={auctionId}
              defects={doneResult.defects}
              frameUrls={doneResult.frame_urls}
              annotatedUrls={doneResult.annotated_urls}
              onComplete={() => {
                setDefectFlowDone(true)
                setShowViewer(true)
              }}
            />
          </motion.div>
        )}

        {doneResult && !uploading && (doneResult.defects.length === 0 || defectFlowDone) && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-14 w-14 text-green-500" weight="fill" />
              <p className="font-bold text-[#1F2937] dark:text-slate-100">تم تحليل {doneResult.valid_frames} إطاراً صالحاً</p>
              <p className="text-sm text-gray-600 dark:text-slate-300">الحالة: {doneResult.overall_condition}</p>
              <p className="text-sm text-gray-600 dark:text-slate-300">العيوب المكتشفة: {doneResult.defects_count}</p>
              <div className="mt-2 w-full max-w-xs">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>النتيجة</span>
                  <span>
                    {doneResult.condition_score}/100
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                  <div
                    className={
                      'h-full rounded-full ' +
                      (doneResult.condition_score >= 80
                        ? 'bg-green-500'
                        : doneResult.condition_score >= 50
                          ? 'bg-[#FF8C42]'
                          : 'bg-red-500')
                    }
                    style={{ width: `${Math.min(100, doneResult.condition_score)}%` }}
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowViewer(true)}
              className="w-full rounded-xl bg-[#1B7F7A] py-3 text-center text-sm font-bold text-white"
            >
              عرض النتيجة 360°
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showViewer && doneResult && doneResult.frame_urls.length > 0 && (doneResult.defects.length === 0 || defectFlowDone) && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-slate-700">
          <Video360Viewer
            frameUrls={doneResult.frame_urls}
            annotatedUrls={doneResult.annotated_urls}
            nobgUrls={doneResult.nobg_urls}
            hotspots={doneResult.hotspots}
            defects={doneResult.defects}
            overallCondition={doneResult.overall_condition}
            conditionScore={doneResult.condition_score}
            summaryAr={doneResult.summary}
          />
        </div>
      )}
    </div>
  )
}
