'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { OrderStatusTracker } from '@/components/OrderStatusTracker'
import { useToast } from '@/components/Toast'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Tab = 'buy' | 'sell'

type AuctionEmbed = {
  id?: string
  title?: string
  images?: unknown
  city?: string | null
  category?: string | null
} | null

type OrderWithAuction = {
  id: string
  auction_id: string
  buyer_id: string
  seller_id: string
  product_amount: number
  status: string
  tracking_number?: string | null
  created_at: string
  updated_at?: string
  auction: AuctionEmbed
}

function statusBadge(status: string) {
  const s = status.toLowerCase()
  if (s === 'pending')
    return { cls: 'bg-yellow-100 text-yellow-800', label: 'بانتظار الدفع' }
  if (s === 'captured' || s === 'paid')
    return { cls: 'bg-green-100 text-green-700', label: 'تم الدفع' }
  if (s === 'shipped') return { cls: 'bg-blue-100 text-blue-700', label: 'تم الشحن' }
  if (s === 'delivered') return { cls: 'bg-emerald-100 text-emerald-700', label: 'تم التوصيل' }
  if (s === 'cancelled') return { cls: 'bg-red-100 text-red-700', label: 'ملغي' }
  return { cls: 'bg-gray-100 text-gray-700', label: status }
}

export default function OrdersPage() {
  const router = useRouter()
  const { show } = useToast()
  const [tab, setTab] = useState<Tab>('buy')
  const [userId, setUserId] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderWithAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [shipForId, setShipForId] = useState<string | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders?user_id=' + encodeURIComponent(uid))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر التحميل')
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
      show('تعذر تحميل الطلبات', 'error')
    } finally {
      setLoading(false)
    }
  }, [show])

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      window.location.href = '/auth/login'
      return
    }
    const uid = JSON.parse(stored).user_id as string
    setUserId(uid)
    void load(uid)
  }, [load])

  const filtered = useMemo(() => {
    if (!userId) return []
    return orders.filter((o) => (tab === 'buy' ? o.buyer_id === userId : o.seller_id === userId))
  }, [orders, tab, userId])

  const submitShip = async (orderId: string) => {
    if (!userId) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          user_id: userId,
          action: 'mark_shipped',
          tracking_number: trackingInput.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التحديث')
      show('تم تأكيد الشحن', 'success')
      setShipForId(null)
      setTrackingInput('')
      await load(userId)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const submitConfirm = async (orderId: string) => {
    if (!userId) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          user_id: userId,
          action: 'confirm_delivery',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التأكيد')
      show('تم تأكيد استلام الطلب', 'success')
      await load(userId)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <h1 className="font-bold text-lg text-center text-gray-900">طلباتي</h1>
      </header>

      <div className="px-4 mt-3 flex gap-2">
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
        <button
          type="button"
          onClick={() => setTab('sell')}
          className={
            'flex-1 py-2.5 rounded-xl text-sm font-bold shadow-sm ' +
            (tab === 'sell' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-100')
          }
        >
          مبيعاتي
        </button>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
            <p className="text-5xl mb-3">📦</p>
            <p className="text-gray-600 font-medium">لا توجد طلبات</p>
            <Link href="/" className="inline-block mt-4 text-amber-600 font-medium text-sm">
              تصفح المزادات
            </Link>
          </div>
        ) : (
          filtered.map((o) => {
            const auc = o.auction
            const title = (auc?.title && String(auc.title)) || 'مزاد'
            const imgs = normalizeAuctionImages(auc?.images)
            const thumb = imgs[0] ?? null
            const badge = statusBadge(o.status)
            const dateSrc = o.created_at || o.updated_at || new Date().toISOString()
            const isBuyer = userId === o.buyer_id
            const isSeller = userId === o.seller_id
            const st = o.status.toLowerCase()

            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex gap-3"
              >
                <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  {thumb ? (
                    <Image src={thumb} alt="" fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm truncate flex-1">{title}</h3>
                    <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ' + badge.cls}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-amber-600 font-bold text-sm mt-1">
                    {Number(o.product_amount).toLocaleString()} ر.س
                  </p>
                  <OrderStatusTracker currentStatus={o.status} />
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(dateSrc), 'd MMM yyyy — HH:mm', { locale: arSA })}
                  </p>

                  {isBuyer && st === 'pending' && (
                    <button
                      type="button"
                      onClick={() => router.push('/checkout/' + o.auction_id)}
                      className="mt-2 w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-bold"
                    >
                      ادفع الآن
                    </button>
                  )}

                  {isBuyer && st === 'shipped' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void submitConfirm(o.id)}
                      className="mt-2 w-full py-2 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-50"
                    >
                      تأكيد الاستلام
                    </button>
                  )}

                  {isSeller && ['pending', 'captured', 'paid'].includes(st) && (
                    <div className="mt-2 space-y-2">
                      {shipForId === o.id ? (
                        <>
                          <input
                            type="text"
                            value={trackingInput}
                            onChange={(e) => setTrackingInput(e.target.value)}
                            placeholder="رقم التتبع (اختياري)"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => void submitShip(o.id)}
                              className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
                            >
                              إرسال
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShipForId(null)
                                setTrackingInput('')
                              }}
                              className="py-2 px-3 rounded-xl bg-gray-100 text-sm"
                            >
                              إلغاء
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShipForId(o.id)
                            setTrackingInput(o.tracking_number || '')
                          }}
                          className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
                        >
                          تأكيد الشحن
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <BottomNav active="orders" />
    </div>
  )
}
