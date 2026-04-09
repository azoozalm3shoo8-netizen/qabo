'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuctionCard, type AuctionCardAuction } from '@/components/auction/AuctionCard'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { ACTIVE_CITY } from '@/lib/region-lock'
import { supabase } from '@/lib/supabase/client'

export function HotAuctionsSection() {
  const [rows, setRows] = useState<AuctionCardAuction[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setUserId(readQaboUserFromStorage()?.user_id ?? null)
  }, [])

  useEffect(() => {
    void supabase
      .from('auctions')
      .select('id, title, current_bid, bid_count, images, ends_at, status, city')
      .eq('status', 'active')
      .eq('city', ACTIVE_CITY)
      .order('bid_count', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setRows((data as AuctionCardAuction[]) ?? [])
      })
  }, [])

  if (rows.length === 0) return null

  return (
    <section className="px-4" dir="rtl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">🔥 مزادات ساخنة</h2>
        <Link href="/search?sort=popular" className="text-xs font-semibold text-[#1B7F7A] dark:text-teal-300">
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
