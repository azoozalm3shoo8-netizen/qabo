'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { useLocale } from '@/lib/locale-context'
import { supabase } from '@/lib/supabase/client'

interface AuctionItem {
  id: string
  title: string
  current_bid: number
  status: string
  ends_at: string
  image_url?: string
  bid_count: number
  highest_bidder_id: string | null
}

type Tab = 'selling' | 'bidding' | 'won'

export default function MyAuctionsPage() {
  const { dir } = useLocale()
  const [tab, setTab] = useState<Tab>('selling')
  const [auctions, setAuctions] = useState<AuctionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = readQaboUserFromStorage()
    if (!user) {
      window.location.href = '/auth/login'
      return
    }
    setLoading(true)

    const load = async () => {
      let query

      if (tab === 'selling') {
        query = supabase
          .from('auctions')
          .select('id, title, current_bid, status, ends_at, bid_count, highest_bidder_id')
          .eq('seller_id', user.user_id)
          .order('created_at', { ascending: false })
      } else if (tab === 'bidding') {
        const { data: bidAuctionIds } = await supabase
          .from('bids')
          .select('auction_id')
          .eq('bidder_id', user.user_id)
        const ids = [...new Set((bidAuctionIds || []).map((b: { auction_id: string }) => b.auction_id))]
        if (ids.length === 0) {
          setAuctions([])
          setLoading(false)
          return
        }
        query = supabase
          .from('auctions')
          .select('id, title, current_bid, status, ends_at, bid_count, highest_bidder_id')
          .in('id', ids)
          .eq('status', 'active')
          .order('ends_at', { ascending: true })
      } else {
        query = supabase
          .from('auctions')
          .select('id, title, current_bid, status, ends_at, bid_count, highest_bidder_id')
          .eq('highest_bidder_id', user.user_id)
          .neq('status', 'active')
          .order('ends_at', { ascending: false })
      }

      const { data } = await query!
      setAuctions((data as AuctionItem[]) || [])
      setLoading(false)
    }

    void load()
  }, [tab])

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'selling', label: 'إعلاناتي', icon: '📦' },
    { key: 'bidding', label: 'مزايداتي', icon: '🔨' },
    { key: 'won', label: 'فزت بها', icon: '🏆' },
  ]

  const statusBadge = (s: string) => {
    if (s === 'active')
      return (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
          نشط
        </span>
      )
    if (s === 'ended')
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-slate-300">
          منتهي
        </span>
      )
    return (
      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
        {s}
      </span>
    )
  }

  return (
    <div
      className="mx-auto min-h-screen max-w-lg bg-[#F3F4F6] px-4 pb-24 pt-6 dark:bg-slate-900"
      dir={dir}
    >
      <h1 className="mb-6 text-xl font-bold text-[#1F2937] dark:text-slate-100">مزاداتي</h1>

      <div className="mb-6 flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-slate-800">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={
              'flex-1 rounded-lg py-2 text-sm font-medium transition ' +
              (tab === tabItem.key
                ? 'bg-white text-[#1B7F7A] shadow dark:bg-slate-700 dark:text-slate-100'
                : 'text-gray-500 dark:text-slate-400')
            }
          >
            {tabItem.icon} {tabItem.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400 dark:text-slate-500">جاري التحميل...</div>
      ) : auctions.length === 0 ? (
        <div className="py-20 text-center text-gray-400 dark:text-slate-500">
          {tab === 'selling'
            ? 'لا توجد إعلانات بعد'
            : tab === 'bidding'
              ? 'لم تزايد على شيء بعد'
              : 'لم تفز بأي مزاد بعد'}
        </div>
      ) : (
        <div className="space-y-3">
          {auctions.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                href={'/auction/' + a.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 transition hover:shadow dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#E6F4F3] text-xl dark:bg-[#134e4a]/40">
                  🔨
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1F2937] dark:text-slate-100">{a.title}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {a.current_bid?.toLocaleString() || 0} ر.س · {a.bid_count || 0} مزايدة
                  </p>
                </div>
                {statusBadge(a.status)}
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav active="myauctions" />
    </div>
  )
}
