'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_name: string
  auction_title: string
}

export function ReviewsList({ userId }: { userId: string }) {
  const [list, setList] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetch('/api/reviews?user_id=' + encodeURIComponent(userId))
      .then((r) => r.json())
      .then((data) => {
        setList(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-200 rounded-2xl">
        لا توجد تقييمات بعد
      </div>
    )
  }

  return (
    <div className="space-y-3" dir="rtl">
      {list.map((r) => (
        <div
          key={r.id}
          className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-yellow-500 text-sm" aria-hidden>
              {'⭐'.repeat(r.rating)}
              <span className="text-gray-300">{'☆'.repeat(5 - r.rating)}</span>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: arSA })}
            </span>
          </div>
          <p className="font-semibold text-gray-900 text-sm mt-2">{r.reviewer_name}</p>
          <p className="text-xs text-[#156661]/80 mt-0.5">{r.auction_title}</p>
          {r.comment && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{r.comment}</p>
          )}
        </div>
      ))}
    </div>
  )
}
