'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Tx = {
  id: string
  amount: number
  balance_after: number | null
  type: string
  description: string | null
  created_at: string
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      window.location.href = '/auth/login'
      return
    }
    const u = JSON.parse(stored) as { user_id: string }
    fetch('/api/wallet?user_id=' + encodeURIComponent(u.user_id))
      .then((r) => r.json())
      .then((data: { wallet_balance?: number; transactions?: Tx[] }) => {
        setBalance(Number(data.wallet_balance ?? 0))
        setTransactions(Array.isArray(data.transactions) ? data.transactions : [])
      })
      .catch(() => {
        setBalance(0)
        setTransactions([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1F2937] shadow-sm backdrop-blur-sm"
          aria-label="رجوع"
        >
          →
        </Link>
        <h1 className="font-bold text-lg text-gray-900 flex-1 text-center">المحفظة</h1>
        <div className="w-10" />
      </header>

      <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
        <div className="bg-gradient-to-br from-[#1B7F7A] to-[#156661] rounded-2xl p-6 text-white shadow-lg">
          <p className="text-white/70 text-sm mb-1">الرصيد الحالي</p>
          {loading ? (
            <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-extrabold tabular-nums">
              ر.س {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled
            className="py-3 rounded-xl border-2 border-dashed border-gray-200 bg-white text-gray-400 text-sm font-medium"
          >
            شحن المحفظة
            <span className="block text-[10px] mt-0.5">قريباً</span>
          </button>
          <button
            type="button"
            disabled
            className="py-3 rounded-xl border-2 border-dashed border-gray-200 bg-white text-gray-400 text-sm font-medium"
          >
            سحب الرصيد
            <span className="block text-[10px] mt-0.5">قريباً</span>
          </button>
        </div>

        <div>
          <h2 className="font-bold text-gray-900 text-sm mb-2">سجل المعاملات</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[120px]">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#1B7F7A] border-t-transparent rounded-full" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-10 px-4">لا توجد معاملات بعد</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <li key={t.id} className="px-4 py-3 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {t.description || (t.type === 'credit' ? 'إيداع' : 'خصم')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(t.created_at), 'd MMM yyyy — HH:mm', { locale: arSA })}
                        </p>
                      </div>
                      <span
                        className={
                          'font-bold tabular-nums shrink-0 ' +
                          (t.type === 'credit' ? 'text-[#10B981]' : 'text-[#EF4444]')
                        }
                      >
                        {t.type === 'credit' ? '+' : '-'}
                        {Number(t.amount).toLocaleString()} ر.س
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
