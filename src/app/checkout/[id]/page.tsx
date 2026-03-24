'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { paymentBreakdown } from '@/lib/payment-breakdown'

type Auction = {
  id: string
  title: string
  current_bid: number
  status: string
  highest_bidder_id: string | null
  images?: string[] | null
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''

  const [user, setUser] = useState<{ user_id: string } | null>(null)
  const [auction, setAuction] = useState<Auction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      router.replace('/auth/login')
      return
    }
    try {
      setUser(JSON.parse(stored))
    } catch {
      router.replace('/auth/login')
    }
  }, [router])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auctions/' + id)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر تحميل المزاد')
      setAuction(data as Auction)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
      setAuction(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const pay = async () => {
    if (!auction || !user) return
    setPaying(true)
    setError('')
    try {
      const res = await fetch('/api/payments/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auction.id,
          buyer_id: user.user_id,
          amount: Number(auction.current_bid),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل بدء الدفع')
      if (data.checkout_url) {
        window.location.href = data.checkout_url as string
        return
      }
      throw new Error('لا يوجد رابط دفع')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setPaying(false)
    }
  }

  if (!id) {
    return null
  }

  const imgs = auction ? normalizeAuctionImages(auction.images) : []
  const thumb = imgs[0] ?? null
  const productAmount = auction ? Number(auction.current_bid) : 0
  const breakdown = Number.isFinite(productAmount) ? paymentBreakdown(productAmount) : null

  const canPay =
    auction &&
    user &&
    auction.status === 'ended' &&
    auction.highest_bidder_id &&
    auction.highest_bidder_id === user.user_id

  return (
    <div className="min-h-screen bg-gray-50 pb-12" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg"
          aria-label="رجوع"
        >
          →
        </button>
        <h1 className="font-bold text-gray-900 flex-1 text-center">إتمام الدفع</h1>
        <div className="w-10" />
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-[#1B7F7A] border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && error && !auction && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm text-center">{error}</div>
        )}

        {!loading && auction && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
                {thumb ? (
                  <Image src={thumb} alt="" fill className="object-cover" sizes="100vw" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl text-gray-300">
                    📷
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-bold text-lg text-gray-900 leading-snug">{auction.title}</h2>
                <p className="text-sm text-gray-500 mt-1">سعر الفوز (المنتج)</p>
                <p className="text-2xl font-extrabold text-[#1B7F7A]">
                  {breakdown?.productAmount.toLocaleString()} <span className="text-base">ر.س</span>
                </p>
              </div>
            </div>

            {breakdown && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3 text-sm">
                <h3 className="font-bold text-gray-900 mb-2">تفاصيل المبلغ</h3>
                <div className="flex justify-between text-gray-700">
                  <span>سعر المنتج</span>
                  <span className="font-semibold tabular-nums">
                    {breakdown.productAmount.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>عمولة المنصة (٥٪)</span>
                  <span className="font-semibold tabular-nums">
                    {breakdown.commission.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>ضريبة القيمة المضافة (١٥٪ على العمولة)</span>
                  <span className="font-semibold tabular-nums">{breakdown.vat.toLocaleString()} ر.س</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-bold text-gray-900">
                  <span>الإجمالي</span>
                  <span className="text-[#1B7F7A] tabular-nums">{breakdown.total.toLocaleString()} ر.س</span>
                </div>
              </div>
            )}

            {!canPay && (
              <div className="rounded-xl border border-[#1B7F7A]/20 bg-[#E6F4F3] p-4 text-center text-sm text-[#156661]">
                لا يمكن إتمام الدفع من هذا الحساب لهذا المزاد.
              </div>
            )}

            {error && auction && (
              <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm text-center">{error}</div>
            )}

            <button
              type="button"
              onClick={() => void pay()}
              disabled={!canPay || paying}
              className="w-full rounded-2xl bg-[#FF8C42] py-4 text-lg font-bold text-white shadow-md transition-transform active:scale-95 hover:bg-[#E87A35] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {paying ? 'جاري التحويل لبوابة الدفع...' : 'ادفع الآن 💳'}
            </button>

            <Link
              href={'/auction/' + id}
              className="block text-center text-sm text-[#1B7F7A] font-medium py-2"
            >
              العودة لتفاصيل المزاد
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
