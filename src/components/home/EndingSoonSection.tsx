'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AuctionCard, type AuctionCardAuction } from '@/components/auction/AuctionCard'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { ACTIVE_CITY } from '@/lib/region-lock'
import { supabase } from '@/lib/supabase/client'

export function EndingSoonSection() {
  const [rows, setRows] = useState<AuctionCardAuction[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setUserId(readQaboUserFromStorage()?.user_id ?? null)
  }, [])

  useEffect(() => {
    const now = new Date().toISOString()
    const day = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    void supabase
      .from('auctions')
      .select('id, title, current_bid, bid_count, images, ends_at, status, city')
      .eq('status', 'active')
      .eq('city', ACTIVE_CITY)
      .gt('ends_at', now)
      .lt('ends_at', day)
      .order('ends_at', { ascending: true })
      .limit(10)
      .then(({ data }) => {
        setRows((data as AuctionCardAuction[]) ?? [])
      })
  }, [])

  if (rows.length === 0) return null

  return (
    <section className="px-4" dir="rtl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">⏰ ينتهي قريباً</h2>
        <Link href="/search?sort=ending" className="text-xs font-semibold text-[#1B7F7A] dark:text-teal-300">
          عرض الكل ←
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {rows.map((a) => (
          <div key={a.id} className="w-[160px] shrink-0 sm:w-[180px]">
            <AuctionCard auction={a} userId={userId} />
          </div>
        ))}
      </div>
    </section>
  )
}
