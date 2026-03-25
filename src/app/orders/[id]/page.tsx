'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, ShieldCheck, XCircle } from '@phosphor-icons/react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { OrderStatusTracker } from '@/components/OrderStatusTracker'
import { useToast } from '@/components/Toast'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type AuctionDetailEmbed = {
  id: string
  title: string
  images?: unknown
  city?: string | null
  category?: string | null
  condition?: string | null
} | null

type ProfileSeller = { full_name: string; city: string | null } | null
type ProfileBuyer = { full_name: string } | null

type OrderDetail = {
  id: string
  auction_id: string
  buyer_id: string
  seller_id: string
  product_amount: number
  commission_amount: number
  vat_amount: number
  total_amount: number
  shipping_amount?: number
  moyasar_payment_id?: string | null
  tap_charge_id?: string | null
  status: string
  tracking_number?: string | null
  created_at: string
  updated_at?: string
  auction: AuctionDetailEmbed
  seller_profile: ProfileSeller
  buyer_profile: ProfileBuyer
}

type EscrowRow = {
  id: string
  status: string
  amount: number
  created_at: string
  released_at?: string | null
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { show } = useToast()
  const id = typeof params.id === 'string' ? params.id : ''

  const [userId, setUserId] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [shipOpen, setShipOpen] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [escrow, setEscrow] = useState<EscrowRow | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<{
    payment_id: string
    amount: number
    status: string
    created_at: string
  } | null>(null)

  const load = useCallback(
    async (uid: string, orderId: string) => {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await fetch(
          '/api/orders?order_id=' + encodeURIComponent(orderId) + '&user_id=' + encodeURIComponent(uid)
        )
        const data = await res.json()
        if (res.status === 404) {
          setOrder(null)
          setNotFound(true)
          return
        }
        if (!res.ok) throw new Error((data as { error?: string }).error || 'تعذر تحميل الطلب')
        setOrder(data as OrderDetail)
        setTrackingInput(String((data as OrderDetail).tracking_number || ''))
      } catch (e: unknown) {
        setOrder(null)
        show(e instanceof Error ? e.message : 'تعذر تحميل الطلب', 'error')
      } finally {
        setLoading(false)
      }
    },
    [show]
  )

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login'
      return
    }
    setUserId(u.user_id)
    if (id) void load(u.user_id, id)
  }, [id, load])

  useEffect(() => {
    if (!order || !userId) {
      setEscrow(null)
      setPaymentInfo(null)
      return
    }
    let cancelled = false
    fetch('/api/escrow?auction_id=' + encodeURIComponent(order.auction_id))
      .then((r) => r.json())
      .then((d: { escrow?: EscrowRow | null }) => {
        if (!cancelled) setEscrow(d.escrow ?? null)
      })
      .catch(() => {
        if (!cancelled) setEscrow(null)
      })

    fetch('/api/payments?user_id=' + encodeURIComponent(userId))
      .then((r) => r.json())
      .then(
        (d: {
          payments?: Array<{
            payment_id: string
            auction_id: string | null
            amount: number
            status: string
            created_at: string
          }>
        }) => {
          if (cancelled || !d.payments) return
          const hit = d.payments.find((p) => p.auction_id === order.auction_id)
          setPaymentInfo(
            hit
              ? {
                  payment_id: hit.payment_id,
                  amount: Number(hit.amount),
                  status: hit.status,
                  created_at: hit.created_at,
                }
              : null
          )
        }
      )
      .catch(() => {
        if (!cancelled) setPaymentInfo(null)
      })

    return () => {
      cancelled = true
    }
  }, [order, userId])

  const isBuyer = Boolean(order && userId && order.buyer_id === userId)
  const isSeller = Boolean(order && userId && order.seller_id === userId)
  const st = order ? order.status.toLowerCase() : ''

  const daysSinceOrder = useMemo(() => {
    if (!order) return 0
    return (Date.now() - new Date(order.created_at).getTime()) / 86400000
  }, [order])

  const canDispute =
    isBuyer && st === 'shipped' && escrow?.status === 'held' && daysSinceOrder >= 3

  const trackerDates = useMemo(() => {
    if (!order) return undefined
    const created = order.created_at
    const updated = order.updated_at || order.created_at
    return {
      pending: created,
      paid: ['captured', 'paid', 'shipped', 'delivered'].includes(st) ? updated : undefined,
      shipped: ['shipped', 'delivered'].includes(st) ? updated : undefined,
      delivered: st === 'delivered' ? updated : undefined,
    }
  }, [order, st])

  const copyTracking = async () => {
    const t = order?.tracking_number?.trim()
    if (!t) return
    try {
      await navigator.clipboard.writeText(t)
      show('تم نسخ رقم التتبع', 'success')
    } catch {
      show('تعذر النسخ', 'error')
    }
  }

  const patchOrder = async (body: Record<string, unknown>) => {
    if (!userId || !order) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, user_id: userId, ...body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || 'فشل التحديث')
      show('تم التحديث بنجاح', 'success')
      setShipOpen(false)
      await load(userId, order.id)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const confirmReceiptWithEscrow = async () => {
    if (!userId || !order) return
    setActionLoading(true)
    try {
      if (escrow?.id && escrow.status === 'held') {
        const r = await fetch('/api/escrow/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ escrow_id: escrow.id }),
        })
        const d = (await r.json()) as { error?: string }
        if (!r.ok) throw new Error(d.error || 'فشل تحرير درع الصفقة')
      }
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          user_id: userId,
          action: 'confirm_delivery',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || 'فشل تأكيد الاستلام')
      show('تم تأكيد الاستلام', 'success')
      await load(userId, order.id)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const submitDispute = async () => {
    if (!escrow?.id) return
    const raw = typeof window !== 'undefined' ? window.prompt('صف سبب فتح النزاع (اختياري)') : null
    if (raw === null) return
    const reason = raw
    setActionLoading(true)
    try {
      const res = await fetch('/api/escrow/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escrow_id: escrow.id, reason }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'فشل فتح النزاع')
      show('تم تسجيل النزاع', 'success')
      await load(userId!, order!.id)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const imgs = order?.auction ? normalizeAuctionImages(order.auction.images) : []
  const thumb = imgs[0] ?? null
  const title = order?.auction?.title || 'مزاد'

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-lg"
          aria-label="رجوع"
        >
          →
        </button>
        <h1 className="font-bold text-lg text-gray-900 flex-1 text-center">تفاصيل الطلب</h1>
        <span className="w-10" />
      </header>

      {loading && (
        <div className="px-4 mt-4 space-y-3">
          <div className="h-40 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
          <div className="h-24 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
          <div className="h-32 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
        </div>
      )}

      {!loading && notFound && (
        <div className="p-8 text-center">
          <p className="text-gray-600 mb-4">الطلب غير موجود</p>
          <Link href="/orders" className="text-[#1B7F7A] font-medium">
            العودة لطلباتي
          </Link>
        </div>
      )}

      {!loading && order && (
        <div className="px-4 mt-4 space-y-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="relative h-48 w-full bg-gray-100">
              {thumb ? (
                <Image src={thumb} alt="" fill className="object-cover" sizes="100vw" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-5xl">📦</div>
              )}
            </div>
            <div className="p-4 text-right">
              <h2 className="font-bold text-lg text-gray-900 leading-snug">{title}</h2>
              <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600">
                {order.auction?.category && (
                  <span className="px-2 py-1 bg-gray-100 rounded-lg">📁 {order.auction.category}</span>
                )}
                {order.auction?.condition && (
                  <span className="px-2 py-1 bg-gray-100 rounded-lg">✨ {order.auction.condition}</span>
                )}
                <span className="px-2 py-1 bg-gray-100 rounded-lg">
                  📍 {order.auction?.city || 'غير محدد'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <OrderStatusTracker currentStatus={order.status} size="lg" dates={trackerDates} />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2 text-right">
            <h3 className="font-bold text-gray-900 mb-2">تفاصيل السعر</h3>
            <div className="flex justify-between text-sm text-gray-700">
              <span>سعر المنتج</span>
              <span>{Number(order.product_amount).toLocaleString()} ر.س</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>العمولة (5%)</span>
              <span>{Number(order.commission_amount).toLocaleString()} ر.س</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>ضريبة القيمة المضافة (15% على العمولة)</span>
              <span>{Number(order.vat_amount).toLocaleString()} ر.س</span>
            </div>
            {Number(order.shipping_amount ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-gray-700">
                <span>الشحن</span>
                <span>{Number(order.shipping_amount).toLocaleString()} ر.س</span>
              </div>
            )}
            <hr className="border-gray-200 my-2" />
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-gray-900">الإجمالي</span>
              <span className="text-xl font-extrabold text-[#1B7F7A]">
                {Number(order.total_amount).toLocaleString()} ر.س
              </span>
            </div>
          </div>

          {(paymentInfo || order.moyasar_payment_id || order.tap_charge_id) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-right space-y-2">
              <h3 className="font-bold text-gray-900 mb-2">معلومات الدفع</h3>
              <div className="flex justify-between text-sm text-gray-700">
                <span>الوسيلة</span>
                <span className="font-semibold">
                  {order.moyasar_payment_id || paymentInfo ? 'بطاقة / Moyasar' : 'Tap'}
                </span>
              </div>
              {paymentInfo && (
                <>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>حالة العملية</span>
                    <span className="font-semibold">{paymentInfo.status}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>المبلغ المدفوع</span>
                    <span>{paymentInfo.amount.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>رقم المعاملة</span>
                    <span className="font-mono text-xs break-all">{paymentInfo.payment_id}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>التاريخ</span>
                    <span>
                      {format(new Date(paymentInfo.created_at), 'd MMM yyyy — HH:mm', { locale: arSA })}
                    </span>
                  </div>
                </>
              )}
              {!paymentInfo && order.moyasar_payment_id && (
                <div className="flex justify-between text-sm text-gray-700">
                  <span>رقم Moyasar</span>
                  <span className="font-mono text-xs break-all">{order.moyasar_payment_id}</span>
                </div>
              )}
              {!paymentInfo && order.tap_charge_id && (
                <div className="flex justify-between text-sm text-gray-700">
                  <span>رقم Tap</span>
                  <span className="font-mono text-xs break-all">{order.tap_charge_id}</span>
                </div>
              )}
            </div>
          )}

          {escrow && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-right space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center justify-end gap-2">
                درع الصفقة
                <ShieldCheck className="h-5 w-5 text-[#1B7F7A]" weight="fill" aria-hidden />
              </h3>
              <p className="text-xs text-gray-500">
                حالة الضمان:{' '}
                <span className="font-bold text-gray-800">
                  {escrow.status === 'held'
                    ? 'قيد الحماية'
                    : escrow.status === 'released'
                      ? 'تم التحرير'
                      : escrow.status === 'disputed'
                        ? 'نزاع'
                        : escrow.status}
                </span>
              </p>
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-end gap-2 text-sm">
                  <span
                    className={
                      ['paid', 'captured', 'shipped', 'delivered'].includes(st)
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-400'
                    }
                  >
                    تم الدفع
                  </span>
                  {['paid', 'captured', 'shipped', 'delivered'].includes(st) ? (
                    <CheckCircle className="h-5 w-5 text-[#10B981]" weight="fill" aria-hidden />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" aria-hidden />
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 text-sm">
                  <span
                    className={
                      ['shipped', 'delivered'].includes(st) ? 'text-gray-900 font-medium' : 'text-gray-400'
                    }
                  >
                    تم الشحن
                  </span>
                  {['shipped', 'delivered'].includes(st) ? (
                    <CheckCircle className="h-5 w-5 text-[#10B981]" weight="fill" aria-hidden />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" aria-hidden />
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 text-sm">
                  <span className={st === 'delivered' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    تم الاستلام
                  </span>
                  {st === 'delivered' ? (
                    <CheckCircle className="h-5 w-5 text-[#10B981]" weight="fill" aria-hidden />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" aria-hidden />
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 text-sm">
                  <span
                    className={
                      escrow.status === 'released' || st === 'delivered'
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-400'
                    }
                  >
                    تم التحويل للبائع
                  </span>
                  {escrow.status === 'released' || st === 'delivered' ? (
                    <CheckCircle className="h-5 w-5 text-[#10B981]" weight="fill" aria-hidden />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" aria-hidden />
                  )}
                </div>
              </div>
            </div>
          )}

          {order.tracking_number && String(order.tracking_number).trim() !== '' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-right min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">رقم التتبع</p>
                  <p className="font-mono text-sm font-semibold text-gray-900 break-all">
                    {order.tracking_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyTracking()}
                  className="shrink-0 rounded-lg bg-[#FF8C42] px-4 py-2 text-sm font-bold text-white"
                >
                  نسخ
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-right">
            <h3 className="font-bold text-gray-900 mb-2">البائع</h3>
            <p className="text-gray-800">{order.seller_profile?.full_name || '—'}</p>
            <p className="text-sm text-gray-500 mt-1">
              {order.seller_profile?.city ? '📍 ' + order.seller_profile.city : ''}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-right">
            <h3 className="font-bold text-gray-900 mb-2">المشتري</h3>
            <p className="text-gray-800">{order.buyer_profile?.full_name || '—'}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-right">
            <h3 className="font-bold text-gray-900 mb-2">تاريخ الطلب</h3>
            <p className="text-gray-700">
              {format(new Date(order.created_at), 'EEEE d MMMM yyyy — HH:mm', { locale: arSA })}
            </p>
          </div>

          {isBuyer && st === 'pending' && (
            <button
              type="button"
              onClick={() => router.push('/checkout/' + order.auction_id)}
              className="w-full py-3.5 rounded-2xl bg-[#FF8C42] text-white font-bold shadow-md hover:bg-[#E87A35]"
            >
              ادفع الآن
            </button>
          )}

          {isBuyer && st === 'shipped' && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void confirmReceiptWithEscrow()}
              className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-bold shadow-md disabled:opacity-50"
            >
              تأكيد الاستلام
            </button>
          )}

          {canDispute && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void submitDispute()}
              className="w-full py-3 rounded-2xl border-2 border-red-200 bg-red-50 text-red-700 font-bold disabled:opacity-50"
            >
              فتح نزاع
            </button>
          )}

          {isSeller && ['captured', 'paid'].includes(st) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              {!shipOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setShipOpen(true)
                    setTrackingInput(order.tracking_number || '')
                  }}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold"
                >
                  تأكيد الشحن
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="رقم التتبع (اختياري)"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        void patchOrder({
                          action: 'mark_shipped',
                          tracking_number: trackingInput.trim() || undefined,
                        })
                      }
                      className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
                    >
                      إرسال
                    </button>
                    <button
                      type="button"
                      onClick={() => setShipOpen(false)}
                      className="py-3 px-4 rounded-xl bg-gray-100 text-sm font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
