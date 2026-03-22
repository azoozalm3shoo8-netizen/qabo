'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { auctionCountdownParts } from '@/lib/time'

type Tab = 'sell' | 'buy'

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('sell')
  const [userId, setUserId] = useState<string | null>(null)
  const [sellList, setSellList] = useState<any[]>([])
  const [buyList, setBuyList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const [sRes, bRes] = await Promise.all([
        fetch('/api/auctions?seller_id=' + uid),
        fetch('/api/auctions?participant_id=' + uid),
      ])
      const s = await sRes.json()
      const b = await bRes.json()
      setSellList(Array.isArray(s) ? s : [])
      setBuyList(Array.isArray(b) ? b : [])
    } catch {
      setSellList([])
      setBuyList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      window.location.href = '/auth/login'
      return
    }
    const uid = JSON.parse(stored).user_id
    setUserId(uid)
    void load(uid)
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  void tick

  const badge = (a: any) => {
    const ended = a.status !== 'active' || auctionCountdownParts(a.ends_at, a.status).ended
    const won =
      ended && a.highest_bidder_id && userId && a.highest_bidder_id === userId && tab === 'buy'
    if (won)
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          فزت
        </span>
      )
    if (a.status === 'active' && !auctionCountdownParts(a.ends_at, a.status).ended)
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          نشط
        </span>
      )
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        انتهى
      </span>
    )
  }

  const list = tab === 'sell' ? sellList : buyList

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm rounded-b-2xl">
        <h1 className="font-bold text-lg text-center text-gray-900">مزاداتي و مشترياتي</h1>
      </div>

      <div className="px-4 mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('sell')}
          className={
            'flex-1 py-2.5 rounded-xl text-sm font-bold shadow-sm ' +
            (tab === 'sell' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-100')
          }
        >
          مزاداتي
        </button>
        <button
          type="button"
          onClick={() => setTab('buy')}
          className={
            'flex-1 py-2.5 rounded-xl text-sm font-bold shadow-sm ' +
            (tab === 'buy' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-100')
          }
        >
          مشترياتي
        </button>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl shadow-sm animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
            <p className="text-5xl mb-3">📦</p>
            <p className="text-gray-600">لا توجد عناصر في هذا التبويب</p>
            <Link href="/" className="inline-block mt-4 text-amber-600 font-medium">
              تصفح المزادات
            </Link>
          </div>
        ) : (
          list.map((a) => {
            const parts = auctionCountdownParts(a.ends_at, a.status)
            const label = parts.ended
              ? 'انتهى'
              : `${parts.hours}س ${parts.minutes}د ${parts.seconds}ث`
            return (
              <Link
                key={a.id}
                href={'/auction/' + a.id}
                className="flex gap-3 bg-white rounded-2xl p-3 shadow-md border border-gray-100"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center text-3xl shrink-0">
                  📦
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm truncate">{a.title}</h3>
                    {badge(a)}
                  </div>
                  <p className="text-amber-600 font-bold text-sm mt-1">
                    {Number(a.current_bid).toLocaleString()} ر.س
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {a.city || '—'} · {label}
                  </p>
                </div>
              </Link>
            )
          })
        )}
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
