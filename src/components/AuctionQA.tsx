'use client'

import { useState } from 'react'
import { useAuctionQuestions } from '@/hooks/useAuctionQuestions'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

export function AuctionQA({ auctionId, isOwner }: { auctionId: string; isOwner: boolean }) {
  const { rows, loading, ask, answer } = useAuctionQuestions(auctionId)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')

  const submitQ = async () => {
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login'
      return
    }
    if (!text.trim()) return
    setBusy(true)
    try {
      await ask(u.user_id, text.trim())
      setText('')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  const submitA = async (qid: string) => {
    const u = readQaboUserFromStorage()
    if (!u) return
    if (!answerText.trim()) return
    setBusy(true)
    try {
      await answer(u.user_id, qid, answerText.trim())
      setAnsweringId(null)
      setAnswerText('')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 text-lg font-bold text-[#1F2937] dark:text-slate-100">
        💬 أسئلة وأجوبة عن هذا المنتج
      </h3>

      <div className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اطرح سؤالك..."
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-sm text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1B7F7A] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void submitQ()}
          className="rounded-xl bg-[#1B7F7A] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          إرسال
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-500 dark:text-slate-400">جاري التحميل...</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-gray-100 bg-[#F3F4F6]/80 p-3 dark:border-slate-600 dark:bg-slate-900/50"
            >
              <p className="text-xs text-gray-500 dark:text-slate-400">
                مستخدم · {new Date(r.created_at).toLocaleDateString('ar-SA')}
              </p>
              <p className="mt-1 text-sm font-medium text-[#1F2937] dark:text-slate-100">{r.question}</p>
              {r.answer ? (
                <div className="mt-2 rounded-lg bg-[#E6F4F3] px-3 py-2 text-sm text-[#1F2937] dark:bg-[#134e4a]/40 dark:text-slate-100">
                  <span className="font-bold text-[#1B7F7A] dark:text-slate-200">↩️ رد البائع:</span> {r.answer}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">بانتظار رد البائع</p>
              )}
              {isOwner && !r.answer ? (
                answeringId === r.id ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void submitA(r.id)}
                        className="rounded-lg bg-[#1B7F7A] px-3 py-1 text-xs font-bold text-white"
                      >
                        إرسال الإجابة
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnsweringId(null)}
                        className="text-xs text-gray-500"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAnsweringId(r.id)
                      setAnswerText('')
                    }}
                    className="mt-2 rounded-lg bg-[#FF8C42] px-3 py-1 text-xs font-bold text-white"
                  >
                    أجب
                  </button>
                )
              ) : null}
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="text-center text-sm text-gray-400 dark:text-slate-500">لا أسئلة بعد</li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
