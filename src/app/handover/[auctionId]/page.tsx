'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { HandoverBuyer } from '@/components/HandoverBuyer'
import { HandoverSeller } from '@/components/HandoverSeller'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

type Session = {
  id: string
  auction_id: string
  seller_id: string
  buyer_id: string
  verification_code: string
  qr_data: string
  status: string
}

export default function HandoverPage() {
  const params = useParams()
  const auctionId = typeof params.auctionId === 'string' ? params.auctionId : ''
  const [userId, setUserId] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const u = readQaboUserFromStorage()
    if (!u || !auctionId) {
      setLoading(false)
      return
    }
    setUserId(u.user_id)
    const res = await fetch(
      '/api/handover?auction_id=' + encodeURIComponent(auctionId) + '&user_id=' + encodeURIComponent(u.user_id)
    )
    const data = await res.json()
    if (res.ok) setSession(data as Session | null)
    setLoading(false)
  }, [auctionId])

  useEffect(() => {
    void load()
  }, [load])

  const start = async () => {
    const u = readQaboUserFromStorage()
    if (!u) return
    const res = await fetch('/api/handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.user_id, auction_id: auctionId }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'تعذر البدء')
      return
    }
    setSession(data as Session)
  }

  if (!auctionId) return null

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] dark:bg-slate-900">
        جاري التحميل...
      </div>
    )
  }

  if (!userId) {
    window.location.href = '/auth/login'
    return null
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 dark:bg-slate-900" dir="rtl">
      <header className="border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <Link href="/" className="text-sm font-semibold text-[#1B7F7A]">
          ← رجوع
        </Link>
      </header>

      {!session ? (
        <div className="mx-auto max-w-md px-4 py-8 text-center">
          <p className="mb-4 text-gray-600 dark:text-slate-400">لا توجد جلسة تسليم بعد</p>
          <button
            type="button"
            onClick={() => void start()}
            className="rounded-xl bg-[#1B7F7A] px-6 py-3 font-bold text-white"
          >
            بدء التسليم (البائع)
          </button>
        </div>
      ) : session.seller_id === userId ? (
        <HandoverSeller session={session} onRefresh={() => void load()} />
      ) : session.buyer_id === userId ? (
        <HandoverBuyer session={session} userId={userId} onRefresh={() => void load()} />
      ) : (
        <p className="p-6 text-center text-red-600">غير مصرح</p>
      )}
    </div>
  )
}
