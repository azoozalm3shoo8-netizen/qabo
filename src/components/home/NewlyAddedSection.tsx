'use client'

import { useEffect, useState } from 'react'
import { AuctionCard, type AuctionCardAuction } from '@/components/auction/AuctionCard'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { ACTIVE_CITY } from '@/lib/region-lock'
import { supabase } from '@/lib/supabase/client'

export function NewlyAddedSection() {
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
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setRows((data as AuctionCardAuction[]) ?? [])
      })
  }, [])

  if (rows.length === 0) return null

  return (
    <section className="px-4" dir="rtl">
      <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-slate-100">✨ أُضيفت حديثاً</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {rows.map((a, i) => (
          <AuctionCard key={a.id} auction={a} userId={userId} priorityImage={i < 2} />
        ))}
      </div>
    </section>
  )
}
