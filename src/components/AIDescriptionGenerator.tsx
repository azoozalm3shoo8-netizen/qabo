'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { generateProductDescription } from '@/lib/ai-description'

type Props = {
  title: string
  condition: string
  onDescriptionChange: (v: string) => void
  onAcceptedChange?: (accepted: boolean) => void
}

export function AIDescriptionGenerator({
  title,
  condition,
  onDescriptionChange,
  onAcceptedChange,
}: Props) {
  const canGenerate = title.trim().length >= 3 && Boolean(condition)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [accepted, setAccepted] = useState(false)

  const runGenerate = async () => {
    if (!canGenerate) return
    setErr('')
    setLoading(true)
    setAccepted(false)
    onAcceptedChange?.(false)
    try {
      const res = await generateProductDescription({ title: title.trim(), condition })
      if (!res.ok) {
        setErr(res.error)
        return
      }
      setDraft(res.text)
    } finally {
      setLoading(false)
    }
  }

  const accept = () => {
    if (!draft.trim()) return
    onDescriptionChange(draft.trim())
    setAccepted(true)
    onAcceptedChange?.(true)
  }

  const regenerate = () => {
    setAccepted(false)
    onAcceptedChange?.(false)
    void runGenerate()
  }

  if (!canGenerate) return null

  return (
    <div className="space-y-3 rounded-2xl border border-[#1B7F7A]/20 bg-[#F3F4F6]/80 p-4 dark:border-slate-600 dark:bg-slate-800/80">
      {!draft && !accepted ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void runGenerate()}
          className="w-full rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 dark:hover:bg-[#156661]"
        >
          {loading ? 'جاري الكتابة...' : 'اكتب لي الوصف تلقائياً'}
        </button>
      ) : null}

      {draft ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <label className="block text-xs font-bold text-[#1F2937] dark:text-slate-300">الوصف المقترح</label>
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setAccepted(false)
              onAcceptedChange?.(false)
            }}
            rows={5}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1B7F7A] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="rounded-xl border border-amber-300/80 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
            ⚠️ تنبيه: هذا وصف مُقترح من الذكاء الاصطناعي. بالضغط على &quot;أوافق وأتحمل المسؤولية&quot; أنت
            تؤكد أن الوصف دقيق ومطابق للسلعة. أنت المسؤول الوحيد عن صحة المعلومات.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={accept}
              disabled={!draft.trim()}
              className="flex-1 rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              أوافق وأتحمل المسؤولية
            </button>
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={loading}
              className="flex-1 rounded-xl bg-gray-200 py-3 text-sm font-bold text-[#1F2937] disabled:opacity-50 dark:bg-slate-700 dark:text-slate-100"
            >
              أعد التوليد
            </button>
          </div>
        </motion.div>
      ) : null}

      {accepted ? (
        <p className="rounded-xl bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          تم قبول الوصف — أنت مسؤول عن دقته
        </p>
      ) : null}

      {err ? <p className="text-center text-sm text-red-600 dark:text-red-400">{err}</p> : null}
    </div>
  )
}
