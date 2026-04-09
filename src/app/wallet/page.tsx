'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { formatSAR } from '@/lib/utils/currency'

type Tx = {
  id: string
  amount: number
  balance_after: number | null
  type: string
  description: string | null
  reference?: string | null
  created_at: string
}

declare global {
  interface Window {
    Moyasar?: {
      init: (options: Record<string, unknown>) => void
    }
  }
}

function txColor(type: string) {
  const t = type.toLowerCase()
  if (t === 'deposit' || t === 'credit' || t === 'refund') return 'text-[#10B981]'
  if (t === 'withdraw' || t === 'payment') return 'text-[#EF4444]'
  if (t === 'freeze') return 'text-[#FF8C42]'
  if (t === 'release') return 'text-[#1B7F7A]'
  return 'text-gray-800'
}

export default function WalletPage() {
  const [available, setAvailable] = useState(0)
  const [frozen, setFrozen] = useState(0)
  const [transactions, setTransactions] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositAmount, setDepositAmount] = useState('100')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [iban, setIban] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const depositHostRef = useRef<HTMLDivElement>(null)
  const moyasarStarted = useRef(false)

  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
  const pk = process.env.NEXT_PUBLIC_MOYASAR_PK || ''

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/wallet?user_id=' + encodeURIComponent(uid))
      const data = (await res.json()) as {
        available_balance?: number
        frozen_balance?: number
        wallet_balance?: number
        transactions?: Tx[]
      }
      const av = Number(data.available_balance ?? data.wallet_balance ?? 0)
      const fz = Number(data.frozen_balance ?? 0)
      setAvailable(av)
      setFrozen(fz)
      setTransactions(Array.isArray(data.transactions) ? data.transactions : [])
    } catch {
      setAvailable(0)
      setFrozen(0)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login'
      return
    }
    setUserId(u.user_id)
    void load(u.user_id)
  }, [load])

  useEffect(() => {
    if (!showDeposit || !userId || !pk || !depositHostRef.current) return
    const n = Number(depositAmount)
    if (!Number.isFinite(n) || n <= 0) return
    const halalas = Math.round(n * 100)

    const host = depositHostRef.current
    host.innerHTML = '<div class="mysr-wallet-form"></div>'
    moyasarStarted.current = false

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js'
    script.async = true

    const cleanup = () => {
      script.remove()
      link.remove()
      host.innerHTML = ''
      moyasarStarted.current = false
    }

    script.onload = () => {
      if (!window.Moyasar || moyasarStarted.current) return
      moyasarStarted.current = true
      try {
        window.Moyasar.init({
          element: '.mysr-wallet-form',
          amount: halalas,
          currency: 'SAR',
          description: 'Qabboo Wallet topup',
          publishable_api_key: pk,
          callback_url: `${baseUrl}/checkout/callback?provider=moyasar`,
          supported_networks: ['mada', 'visa', 'mastercard'],
          methods: ['creditcard', 'stcpay', 'applepay'],
          metadata: { kind: 'wallet', user_id: userId },
          on_completed: async (payment: { id?: string }) => {
            const pid = payment?.id
            if (!pid) return
            await fetch('/api/wallet/topup-save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                payment_id: pid,
                user_id: userId,
                amount: n,
              }),
            })
          },
        })
      } catch {
        moyasarStarted.current = false
      }
    }

    document.body.appendChild(script)
    return cleanup
  }, [showDeposit, userId, pk, depositAmount, baseUrl])

  const submitWithdraw = async () => {
    if (!userId) return
    const amt = Number(withdrawAmount)
    if (!Number.isFinite(amt) || amt < 50) {
      setMsg('الحد الأدنى للسحب 50 ر.س')
      return
    }
    if (!iban.trim()) {
      setMsg('أدخل رقم الآيبان')
      return
    }
    setActionLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          type: 'withdraw',
          amount: amt,
          reference: iban.trim(),
          description: 'سحب إلى حساب بنكي',
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'فشل السحب')
      setShowWithdraw(false)
      setIban('')
      setWithdrawAmount('')
      await load(userId)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setActionLoading(false)
    }
  }

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
          <p className="text-white/75 text-sm mb-1">الرصيد المتاح</p>
          {loading ? (
            <div className="h-10 w-40 bg-white/20 rounded-lg animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-extrabold tabular-nums">{formatSAR(available, false)}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#FF8C42]">رصيد مجمّد</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                مبالغ مجمدة لصفقات قيد التنفيذ (درع الصفقة)
              </p>
            </div>
            <p className="text-xl font-extrabold text-[#FF8C42] tabular-nums">{formatSAR(frozen, false)}</p>
          </div>
        </div>

        {msg && (
          <div className="rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2 text-center">{msg}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setShowDeposit((v) => !v)
              setShowWithdraw(false)
              setMsg('')
            }}
            className="rounded-xl bg-[#FF8C42] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#E87A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            إيداع
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWithdraw((v) => !v)
              setShowDeposit(false)
              setMsg('')
            }}
            className="rounded-xl border-2 border-[#1B7F7A] bg-background py-3 text-sm font-bold text-[#1B7F7A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            سحب
          </button>
        </div>

        {showDeposit && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
            <label className="block text-sm font-medium text-gray-800">مبلغ الإيداع (ر.س)</label>
            <input
              type="number"
              min={1}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 outline-none focus:border-[#1B7F7A]"
            />
            {!pk ? (
              <p className="text-xs text-orange-700 text-center">NEXT_PUBLIC_MOYASAR_PK غير مُعرّف</p>
            ) : (
              <div ref={depositHostRef} className="min-h-[100px]" />
            )}
          </div>
        )}

        {showWithdraw && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
            <label className="block text-sm font-medium text-gray-800">المبلغ (الحد الأدنى 50 ر.س)</label>
            <input
              type="number"
              min={50}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 outline-none focus:border-[#1B7F7A]"
            />
            <label className="block text-sm font-medium text-gray-800">رقم الآيبان</label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="SA..."
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 outline-none focus:border-[#1B7F7A] font-mono text-sm"
            />
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void submitWithdraw()}
              className="w-full py-3 rounded-xl bg-[#1B7F7A] text-white font-bold disabled:opacity-50"
            >
              {actionLoading ? 'جاري التنفيذ...' : 'تأكيد السحب'}
            </button>
          </div>
        )}

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
                          {t.description || t.type}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(t.created_at), 'd MMM yyyy — HH:mm', { locale: arSA })}
                        </p>
                      </div>
                      <span className={'font-bold tabular-nums shrink-0 ' + txColor(t.type)}>
                        {['withdraw', 'payment', 'freeze'].includes(t.type.toLowerCase()) ? '-' : '+'}
                        {formatSAR(Number(t.amount), false)}
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
