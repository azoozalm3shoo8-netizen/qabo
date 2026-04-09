'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { formatSAR } from '@/lib/utils/currency'

type Auction = {
  id: string
  title: string
  current_bid: number
  status: string
  highest_bidder_id: string | null
  images?: string[] | null
}

declare global {
  interface Window {
    Moyasar?: {
      init: (options: Record<string, unknown>) => void
    }
  }
}

const SHIPPING_SAR = 25

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''

  const [user, setUser] = useState<{ user_id: string } | null>(null)
  const [auction, setAuction] = useState<Auction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const formHostRef = useRef<HTMLDivElement>(null)
  const moyasarStarted = useRef(false)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
      router.replace('/auth/login')
      return
    }
    setUser({ user_id: u.user_id })
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

  const productAmount = auction ? Number(auction.current_bid) : 0
  const totalSar =
    auction && Number.isFinite(productAmount) ? Math.round((productAmount + SHIPPING_SAR) * 100) / 100 : 0
  const totalHalalas = Math.round(totalSar * 100)

  const canPay =
    Boolean(auction && user) &&
    auction!.status === 'ended' &&
    Boolean(auction!.highest_bidder_id) &&
    auction!.highest_bidder_id === user!.user_id

  useEffect(() => {
    if (canPay && auction?.id) {
      try {
        sessionStorage.setItem('qabboo_last_checkout_auction', auction.id)
      } catch {
        /* ignore */
      }
    }
  }, [canPay, auction?.id])

  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
  const pk = process.env.NEXT_PUBLIC_MOYASAR_PK || ''

  useEffect(() => {
    if (!canPay || !auction || !user || !pk || !formHostRef.current || moyasarStarted.current) return
    if (totalHalalas <= 0) return

    const host = formHostRef.current
    host.innerHTML = '<div class="mysr-form"></div>'

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
      if (host) host.innerHTML = ''
      moyasarStarted.current = false
    }

    script.onload = () => {
      if (!window.Moyasar || moyasarStarted.current) return
      moyasarStarted.current = true
      try {
        window.Moyasar.init({
          element: '.mysr-form',
          amount: totalHalalas,
          currency: 'SAR',
          description: `Qabboo Auction — ${auction.title}`,
          publishable_api_key: pk,
          callback_url: `${baseUrl}/checkout/callback?provider=moyasar`,
          supported_networks: ['mada', 'visa', 'mastercard'],
          methods: ['creditcard', 'stcpay', 'applepay'],
          metadata: {
            kind: 'auction',
            auction_id: auction.id,
            user_id: user.user_id,
          },
          on_completed: async (payment: { id?: string }) => {
            const paymentId = payment?.id
            if (!paymentId) return
            try {
              await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  payment_id: paymentId,
                  auction_id: auction.id,
                  user_id: user.user_id,
                  amount: totalSar,
                }),
              })
            } catch {
              /* ignore */
            }
          },
        })
      } catch {
        moyasarStarted.current = false
      }
    }

    document.body.appendChild(script)

    return cleanup
  }, [auction, user, canPay, pk, baseUrl, totalHalalas, totalSar])

  if (!id) {
    return null
  }

  const imgs = auction ? normalizeAuctionImages(auction.images) : []
  const thumb = imgs[0] ?? null

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-12" dir="rtl">
      <header className="sticky top-0 z-20 bg-[#1B7F7A] text-white px-4 py-4 flex items-center gap-3 shadow-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B7F7A]"
          aria-label="رجوع"
        >
          →
        </button>
        <h1 className="font-bold flex-1 text-center text-lg">إتمام الدفع</h1>
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
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="relative aspect-video bg-muted">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={auction.title ? `صورة ${auction.title}` : 'صورة المنتج'}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl text-gray-300">
                    📷
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-lg font-bold leading-snug text-foreground">{auction.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">سعر الفوز</p>
                <p className="text-2xl font-extrabold text-[#1B7F7A]">{formatSAR(productAmount, false)}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-background p-4 text-sm shadow-sm">
              <h3 className="mb-1 font-bold text-foreground">ملخص الطلب</h3>
              <div className="flex justify-between text-foreground">
                <span>سعر المنتج</span>
                <span className="font-semibold tabular-nums">{formatSAR(productAmount, false)}</span>
              </div>
              <div className="flex justify-between text-foreground">
                <span>الشحن</span>
                <span className="font-semibold tabular-nums">{formatSAR(SHIPPING_SAR, false)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold text-foreground">
                <span>الإجمالي</span>
                <span className="text-[#1B7F7A] tabular-nums">{formatSAR(totalSar, false)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1B7F7A]/25 bg-[#E6F4F3] p-3 text-xs text-[#156661] text-center leading-relaxed">
              مبلغك محمي بدرع الصفقة حتى استلام المنتج عند تأكيد الاستلام.
            </div>

            {!canPay && (
              <div className="rounded-xl border border-[#1B7F7A]/20 bg-white p-4 text-center text-sm text-[#156661]">
                لا يمكن إتمام الدفع من هذا الحساب لهذا المزاد.
              </div>
            )}

            {error && auction && (
              <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm text-center">{error}</div>
            )}

            {canPay && !pk && (
              <div className="bg-orange-50 text-orange-800 rounded-xl p-3 text-sm text-center">
                مفتاح Moyasar غير مُعرّف (NEXT_PUBLIC_MOYASAR_PK).
              </div>
            )}

            {canPay && pk && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                <h3 className="font-bold text-gray-900 text-center">بطاقة الدفع</h3>
                <p className="text-xs text-gray-500 text-center">
                  ندعم مدى، فيزا، ماستركارد، STC Pay وApple Pay
                </p>
                <div ref={formHostRef} className="min-h-[120px]" />
                <p className="text-[11px] text-gray-400 text-center">
                  بمتابعتك، أنت توافق على شروط بوابة الدفع.
                </p>
              </div>
            )}

            <Link
              href={'/auction/' + id}
              className="block py-2 text-center text-sm font-medium text-[#1B7F7A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            >
              العودة لتفاصيل المزاد
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
