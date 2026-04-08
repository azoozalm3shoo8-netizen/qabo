'use client'

import { useEffect, useState } from 'react'
import type { SocialProof } from '@/lib/types/social-proof'

type Props = {
  auctionId: string
  pollMs?: number
}

export function SocialProofBadge({ auctionId, pollMs = 30_000 }: Props) {
  const [proof, setProof] = useState<SocialProof | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/auctions/' + encodeURIComponent(auctionId) + '/social-proof')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'فشل التحميل')
        if (!cancelled) {
          setProof(data as SocialProof)
          setErr('')
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'خطأ')
      }
    }
    void load()
    const t = setInterval(() => void load(), pollMs)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [auctionId, pollMs])

  if (err && !proof) return null
  if (!proof) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <span>جاري تحميل التفاعل…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span
        className="inline-flex items-center gap-1 rounded-full bg-[#E6F4F3] px-3 py-1 font-medium text-[#1B7F7A] dark:bg-[#134e4a]/50 dark:text-slate-100"
        style={{ color: '#1B7F7A' }}
      >
        👁 {proof.watcherCount} يراقبون
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-200">
        🏷 {proof.totalBids} مزايدة
      </span>
      {proof.lastBidAgo !== '—' ? (
        <span className="text-xs text-gray-500 dark:text-slate-400">آخر مزايدة {proof.lastBidAgo}</span>
      ) : null}
      {proof.isHot ? (
        <span
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: '#FF8C42' }}
        >
          🔥 {proof.hotReason ?? 'مزاد ساخن'}
        </span>
      ) : null}
    </div>
  )
}
