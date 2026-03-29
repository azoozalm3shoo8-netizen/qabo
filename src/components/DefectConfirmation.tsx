'use client'

import {
  ArrowsIn,
  CheckCircle,
  Drop,
  EggCrack,
  Knife,
  Lightning,
  Robot,
  ShieldWarning,
  SpinnerGap,
  Sun,
  Warning,
  XCircle,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import type { Defect } from '@/lib/video360-types'

export interface DefectConfirmationProps {
  jobId: string
  auctionId?: string
  defects: Defect[]
  frameUrls: string[]
  annotatedUrls: string[]
  onComplete?: (summary: { confirmed: number; denied: number; acknowledged: boolean }) => void
}

function defectIcon(type: string) {
  const t = type.toLowerCase()
  if (t.includes('خدش')) return Knife
  if (t.includes('كسر')) return EggCrack
  if (t.includes('صدأ')) return Warning
  if (t.includes('بهت')) return Sun
  if (t.includes('انبعاج')) return ArrowsIn
  if (t.includes('شرخ')) return Lightning
  if (t.includes('بقع')) return Drop
  return Warning
}

function severityLabel(s: Defect['severity']) {
  if (s === 'minor') return 'طفيف'
  if (s === 'moderate') return 'متوسط'
  return 'كبير'
}

function severityClass(s: Defect['severity']) {
  if (s === 'minor') return 'text-green-600 dark:text-green-400'
  if (s === 'moderate') return 'text-[#FF8C42]'
  return 'text-red-600 dark:text-red-400'
}

export function DefectConfirmation({
  jobId,
  auctionId,
  defects,
  frameUrls,
  annotatedUrls,
  onComplete,
}: DefectConfirmationProps) {
  const [step, setStep] = useState(0)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<
    Record<number, { confirmed: boolean | null; comment: string }>
  >({})
  const [ack, setAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [doneMsg, setDoneMsg] = useState(false)
  const [err, setErr] = useState('')

  const summaryCounts = useMemo(() => {
    let minor = 0,
      moderate = 0,
      major = 0
    for (const d of defects) {
      if (d.severity === 'minor') minor++
      else if (d.severity === 'moderate') moderate++
      else major++
    }
    return { minor, moderate, major }
  }, [defects])

  const current = defects[idx]
  const annUrl = annotatedUrls[current?.frame_index] || frameUrls[current?.frame_index] || ''

  const setAnswer = useCallback((i: number, confirmed: boolean) => {
    setAnswers((a) => ({
      ...a,
      [i]: { confirmed, comment: a[i]?.comment || '' },
    }))
  }, [])

  const setComment = useCallback((i: number, c: string) => {
    setAnswers((a) => ({
      ...a,
      [i]: { confirmed: a[i]?.confirmed ?? null, comment: c },
    }))
  }, [])

  const deniedList = useMemo(() => {
    return defects
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => answers[i]?.confirmed === false)
  }, [defects, answers])

  const confirmedN = defects.filter((_, i) => answers[i]?.confirmed === true).length
  const deniedN = defects.filter((_, i) => answers[i]?.confirmed === false).length

  const submit = async () => {
    setErr('')
    const u = readQaboUserFromStorage()
    if (!u?.user_id) {
      setErr('يجب تسجيل الدخول')
      return
    }
    setSubmitting(true)
    try {
      const responses = defects.map((_, i) => ({
        defect_index: i,
        confirmed: answers[i]?.confirmed === true,
        comment: answers[i]?.comment || '',
      }))
      const res = await fetch(
        '/api/video360/defect-response?user_id=' + encodeURIComponent(u.user_id),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: jobId,
            auction_id: auctionId,
            responses,
            acknowledge_responsibility: deniedN > 0 ? ack : true,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل الإرسال')
      }
      setDoneMsg(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setSubmitting(false)
    }
  }

  const needsAckStep = deniedN > 0

  const goNextFromReview = () => {
    if (idx < defects.length - 1) {
      setIdx((x) => x + 1)
    } else {
      if (needsAckStep) setStep(2)
      else setStep(3)
    }
  }

  const Icon = current ? defectIcon(current.type) : Warning

  return (
    <div className="space-y-4" dir="rtl">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="s0"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <Robot className="mx-auto h-16 w-16 text-[#1B7F7A]" weight="duotone" />
            <h3 className="mt-3 text-lg font-bold text-[#1F2937] dark:text-slate-100">
              نتائج الفحص بالذكاء الاصطناعي
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
              اكتشف الذكاء الاصطناعي {defects.length} ملاحظة في منتجك
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold">
              <div className="rounded-xl bg-green-50 py-2 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                طفيف: {summaryCounts.minor}
              </div>
              <div className="rounded-xl bg-orange-50 py-2 text-[#FF8C42] dark:bg-orange-900/20">
                متوسط: {summaryCounts.moderate}
              </div>
              <div className="rounded-xl bg-red-50 py-2 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                كبير: {summaryCounts.major}
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-slate-400">
              راجع كل ملاحظة وأكّد أو أنكر وجودها. صدقك يزيد ثقة المشترين.
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-6 w-full rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white"
            >
              ابدأ المراجعة
            </button>
          </motion.div>
        )}

        {step === 1 && current && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {annUrl ? (
              <a href={annUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={annUrl} alt="" className="mx-auto max-h-48 w-auto object-contain" />
              </a>
            ) : null}
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#F3F4F6]/80 p-3 dark:bg-slate-900/50">
              <Icon className="h-8 w-8 shrink-0 text-[#1B7F7A]" weight="duotone" />
              <div className="min-w-0 text-right">
                <p className="font-bold text-[#1F2937] dark:text-slate-100">{current.type}</p>
                <p className={'text-xs font-bold ' + severityClass(current.severity)}>
                  {severityLabel(current.severity)}
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">{current.description_ar}</p>
                <p className="mt-1 text-xs text-gray-500">{current.location}</p>
              </div>
            </div>
            <hr className="my-4 border-gray-100 dark:border-slate-600" />
            <p className="mb-3 font-bold text-[#1F2937] dark:text-slate-100">هل هذا العيب موجود في المنتج؟</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAnswer(idx, true)}
                className={
                  'flex-1 rounded-xl py-3 text-sm font-bold transition ' +
                  (answers[idx]?.confirmed === true
                    ? 'scale-[1.02] bg-[#1B7F7A] text-white shadow-md'
                    : 'bg-[#1B7F7A]/20 text-[#1B7F7A] opacity-70')
                }
              >
                ✅ نعم، موجود
              </button>
              <button
                type="button"
                onClick={() => setAnswer(idx, false)}
                className={
                  'flex-1 rounded-xl py-3 text-sm font-bold transition ' +
                  (answers[idx]?.confirmed === false
                    ? 'scale-[1.02] bg-red-500 text-white shadow-md'
                    : 'bg-red-100 text-red-600 opacity-70 dark:bg-red-900/30 dark:text-red-300')
                }
              >
                ❌ لا، غير موجود
              </button>
            </div>
            <textarea
              value={answers[idx]?.comment || ''}
              onChange={(e) => setComment(idx, e.target.value)}
              placeholder="مثال: هذا ليس خدش بل خط في التصميم"
              rows={2}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-4 flex items-center justify-center gap-1">
              {defects.map((_, i) => (
                <span
                  key={i}
                  className={
                    'h-2 w-2 rounded-full ' + (i === idx ? 'bg-[#1B7F7A]' : 'bg-gray-300 dark:bg-slate-600')
                  }
                />
              ))}
            </div>
            <p className="mt-1 text-center text-xs text-gray-500">
              {idx + 1} من {defects.length}
            </p>
            <div className="mt-4 flex justify-between gap-2">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => setIdx((x) => Math.max(0, x - 1))}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-slate-600 disabled:opacity-40"
              >
                ← السابق
              </button>
              <button
                type="button"
                onClick={goNextFromReview}
                disabled={
                  answers[idx]?.confirmed !== true && answers[idx]?.confirmed !== false
                }
                className="rounded-lg bg-[#1B7F7A] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                التالي →
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && needsAckStep && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-2xl border border-red-100 bg-white p-6 dark:border-red-900/40 dark:bg-slate-800"
          >
            <ShieldWarning className="mx-auto h-14 w-14 text-red-500" weight="fill" />
            <h3 className="mt-3 text-center text-lg font-bold text-red-600 dark:text-red-400">إقرار المسؤولية</h3>
            <p className="mt-2 text-center text-sm text-gray-700 dark:text-slate-300">
              رفضت {deniedN} ملاحظة اكتشفها الذكاء الاصطناعي:
            </p>
            <ul className="mt-3 max-h-40 space-y-2 overflow-auto text-sm">
              {deniedList.map(({ d, i }) => (
                <li key={i} className="rounded-lg bg-red-50/80 p-2 dark:bg-red-900/20">
                  <span className="font-bold">{d.type}</span> — {severityLabel(d.severity)}
                  {answers[i]?.comment ? (
                    <span className="block text-xs text-gray-600 dark:text-slate-400">{answers[i]!.comment}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <hr className="my-4 border-gray-100 dark:border-slate-600" />
            <label className="flex cursor-pointer items-start gap-2 text-right text-sm text-gray-800 dark:text-slate-300">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-1 h-4 w-4 accent-red-600"
              />
              <span>
                أقر بأنني راجعت جميع ملاحظات الذكاء الاصطناعي بعناية، وأنني أتحمل كامل المسؤولية عن صحة وصف حالة
                المنتج المعروض. أفهم أنه في حال ثبوت عدم صحة إفادتي، قد يتعرض حسابي لعقوبات تشمل التعليق أو الحظر.
              </span>
            </label>
            <button
              type="button"
              disabled={!ack}
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              أتعهد وأوافق
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <h3 className="text-center text-lg font-bold text-[#1F2937] dark:text-slate-100">ملخص المراجعة</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-600" weight="fill" />
                <div>
                  <p className="text-xs text-gray-500">مؤكدة</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{confirmedN}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
                <XCircle className="h-8 w-8 text-red-500" weight="fill" />
                <div>
                  <p className="text-xs text-gray-500">مرفوضة</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-300">{deniedN}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[#F3F4F6] p-3 dark:bg-slate-900">
                <ShieldWarning className="h-8 w-8 text-[#1B7F7A]" />
                <div>
                  <p className="text-xs text-gray-500">إقرار</p>
                  <p className="text-sm font-bold">{deniedN > 0 ? (ack ? 'نعم' : 'لا') : '—'}</p>
                </div>
              </div>
            </div>
            <ul className="mt-4 max-h-32 space-y-1 overflow-auto text-xs">
              {defects.map((d, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-gray-100 pb-1 dark:border-slate-700">
                  <span>{d.type}</span>
                  <span className={answers[i]?.confirmed ? 'text-green-600' : 'text-red-500'}>
                    {answers[i]?.confirmed === true ? 'مؤكد' : answers[i]?.confirmed === false ? 'مرفوض' : '—'}
                  </span>
                </li>
              ))}
            </ul>
            {err ? <p className="mt-2 text-center text-sm text-red-600">{err}</p> : null}
            {!doneMsg ? (
              <button
                type="button"
                disabled={submitting || defects.some((_, i) => answers[i]?.confirmed === null)}
                onClick={() => void submit()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                {submitting ? <SpinnerGap className="h-5 w-5 animate-spin" /> : null}
                إرسال الردود
              </button>
            ) : (
              <div className="mt-6 text-center">
                <CheckCircle className="mx-auto h-14 w-14 text-green-500" weight="fill" />
                <p className="mt-2 font-bold text-green-700 dark:text-green-400">تم حفظ ردودك</p>
                <button
                  type="button"
                  onClick={() =>
                    onComplete?.({
                      confirmed: confirmedN,
                      denied: deniedN,
                      acknowledged: deniedN > 0 ? ack : true,
                    })
                  }
                  className="mt-4 w-full rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white"
                >
                  متابعة لعرض 360°
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
