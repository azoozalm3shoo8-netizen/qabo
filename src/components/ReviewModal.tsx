'use client'

import { useState } from 'react'
import { useToast } from '@/components/Toast'

export function ReviewModal({
  open,
  onClose,
  auctionId,
  sellerId,
  userId,
  onSubmitted,
}: {
  open: boolean
  onClose: () => void
  auctionId: string
  sellerId: string
  userId: string
  onSubmitted: () => void
}) {
  const { show } = useToast()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (rating < 1) {
      show('اختر عدد النجوم', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          reviewer_id: userId,
          auction_id: auctionId,
          reviewed_id: sellerId,
          rating,
          comment: comment.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال')
      show('شكراً لتقييمك', 'success')
      onSubmitted()
      onClose()
      setRating(0)
      setComment('')
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">تقييم البائع</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">التقييم</p>
            <div className="flex gap-2 justify-center flex-row-reverse">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="text-3xl p-1 focus:outline-none focus:ring-2 focus:ring-[#1B7F7A] rounded-lg"
                  aria-label={`${n} نجوم`}
                >
                  {n <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">تعليق (اختياري)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="شاركنا تجربتك..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B7F7A] outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{comment.length}/200</p>
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || rating < 1}
            className="w-full rounded-xl bg-[#1B7F7A] py-3 font-bold text-white transition-transform active:scale-95 hover:bg-[#156661] disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال التقييم'}
          </button>
        </div>
      </div>
    </div>
  )
}
