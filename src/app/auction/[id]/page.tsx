'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { AuctionCountdown } from '@/components/AuctionCountdown'
import { AuctionImageGallery } from '@/components/AuctionImageGallery'
import { BottomNav } from '@/components/BottomNav'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { OrderStatusTracker } from '@/components/OrderStatusTracker'
import { ReviewModal } from '@/components/ReviewModal'
import { useToast } from '@/components/Toast'
import { sameUserId } from '@/lib/ids'
import { supabase } from '@/lib/supabase/client'

type Seller = {
  full_name: string
  city: string | null
  rating: number | null
}

type HighestBidder = { full_name: string } | null

type AuctionOrderRow = {
  id: string
  auction_id: string
  status: string
}

type AuctionDetail = {
  id: string
  seller_id: string
  images?: string[] | null
  title: string
  description: string | null
  category: string
  condition: string
  city: string | null
  start_price: number
  current_bid: number
  buy_now_price: number | null
  bid_increment: number
  bid_count: number
  highest_bidder_id: string | null
  status: string
  starts_at: string | null
  ends_at: string
  created_at: string
  seller: Seller
  highest_bidder: HighestBidder
}

export default function AuctionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { show } = useToast()
  const id = typeof params.id === 'string' ? params.id : ''

  const [auction, setAuction] = useState<AuctionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [user, setUser] = useState<{ user_id: string; phone: string } | null>(null)
  const [ended, setEnded] = useState(false)

  const [showBidModal, setShowBidModal] = useState(false)
  const [bidAmount, setBidAmount] = useState(0)
  const [bidSubmitting, setBidSubmitting] = useState(false)
  const [bidError, setBidError] = useState('')
  const [msgLoading, setMsgLoading] = useState(false)
  const [reviewExists, setReviewExists] = useState<boolean | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')
  const [auctionOrder, setAuctionOrder] = useState<AuctionOrderRow | null>(null)

  const loadAuction = useCallback(async () => {
    if (!id) return
    const res = await fetch('/api/auctions/' + id)
    const data = await res.json()
    if (!res.ok) {
      setFetchError(data.error || 'تعذر تحميل المزاد')
      setAuction(null)
      return
    }
    setFetchError('')
    setAuction(data as AuctionDetail)
  }, [id])

  const loadAuctionRef = useRef(loadAuction)
  loadAuctionRef.current = loadAuction

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadAuction().finally(() => setLoading(false))
  }, [id, loadAuction])

  useEffect(() => {
    if (!auction?.id || !user?.user_id) {
      setAuctionOrder(null)
      return
    }
    let cancelled = false
    fetch('/api/orders?user_id=' + encodeURIComponent(user.user_id))
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return
        if (!Array.isArray(data)) {
          setAuctionOrder(null)
          return
        }
        const found = data.find(
          (o: { auction_id?: string; id?: string; status?: string }) => o.auction_id === auction.id
        )
        if (found && typeof found.id === 'string' && typeof found.status === 'string') {
          setAuctionOrder({
            id: found.id,
            auction_id: String(found.auction_id),
            status: found.status,
          })
        } else {
          setAuctionOrder(null)
        }
      })
      .catch(() => {
        if (!cancelled) setAuctionOrder(null)
      })
    return () => {
      cancelled = true
    }
  }, [auction?.id, user?.user_id])

  useEffect(() => {
    if (!id) return

    let debounce: ReturnType<typeof setTimeout>
    const channel = supabase
      .channel('auction-' + id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'auctions',
          filter: 'id=eq.' + id,
        },
        () => {
          clearTimeout(debounce)
          debounce = setTimeout(() => void loadAuctionRef.current(), 280)
        }
      )
      .subscribe()

    return () => {
      clearTimeout(debounce)
      void supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    if (!auction) return
    const past = new Date(auction.ends_at).getTime() <= Date.now()
    setEnded(auction.status !== 'active' || past)
  }, [auction?.id, auction?.ends_at, auction?.status])

  useEffect(() => {
    if (!auction || !user) {
      setReviewExists(null)
      return
    }
    const pastEnd = new Date(auction.ends_at).getTime() <= Date.now()
    const closed = auction.status !== 'active' || pastEnd
    const winner =
      Boolean(auction.highest_bidder_id) &&
      sameUserId(user.user_id, auction.highest_bidder_id as string)
    if (!closed || !winner) {
      setReviewExists(null)
      return
    }
    let cancelled = false
    setReviewExists(null)
    fetch(
      '/api/reviews?auction_id=' +
        encodeURIComponent(auction.id) +
        '&reviewer_id=' +
        encodeURIComponent(user.user_id)
    )
      .then((r) => r.json())
      .then((d: { exists?: boolean }) => {
        if (!cancelled) setReviewExists(Boolean(d?.exists))
      })
      .catch(() => {
        if (!cancelled) setReviewExists(true)
      })
    return () => {
      cancelled = true
    }
  }, [
    auction?.id,
    auction?.ends_at,
    auction?.status,
    auction?.highest_bidder_id,
    user?.user_id,
  ])

  const handleEndedChange = useCallback((e: boolean) => {
    setEnded(e)
  }, [])

  const minBid = useMemo(() => {
    if (!auction) return 0
    return Number(auction.current_bid) + Number(auction.bid_increment)
  }, [auction])

  const isSeller = Boolean(
    auction && user && sameUserId(user.user_id, auction.seller_id)
  )

  const openBidModal = () => {
    if (!auction || auction.status !== 'active' || ended) return
    if (!user) return
    if (sameUserId(user.user_id, auction.seller_id)) return
    setBidError('')
    setBidAmount(minBid)
    setShowBidModal(true)
  }

  const handleBidButtonClick = () => {
    if (!auction || auction.status !== 'active' || ended) return
    if (!user) {
      window.location.href = '/auth/login'
      return
    }
    openBidModal()
  }

  const submitBid = async () => {
    if (!auction || !user) return
    setBidError('')
    if (bidAmount < minBid) {
      setBidError('المبلغ أقل من الحد الأدنى: ' + minBid.toLocaleString() + ' ر.س')
      return
    }
    setBidSubmitting(true)
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          auction_id: auction.id,
          bidder_id: user.user_id,
          amount: bidAmount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشلت المزايدة')
      show('تم تسجيل مزايدتك بنجاح', 'success')
      setShowBidModal(false)
      await loadAuction()
    } catch (e: unknown) {
      setBidError(e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setBidSubmitting(false)
    }
  }

  const bidButtonDisabled =
    !auction ||
    auction.status !== 'active' ||
    ended ||
    (user != null && isSeller)

  const auctionClosed = !auction || auction.status !== 'active' || ended

  const isWinner = Boolean(
    auction &&
      user &&
      auctionClosed &&
      auction.highest_bidder_id &&
      sameUserId(user.user_id, auction.highest_bidder_id)
  )

  const openSellerChat = async () => {
    if (!user || !auction) {
      window.location.href = '/auth/login'
      return
    }
    if (sameUserId(user.user_id, auction.seller_id)) return
    setMsgLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          other_user_id: auction.seller_id,
          auction_id: auction.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر فتح المحادثة')
      router.push('/messages/' + data.conversation_id)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setMsgLoading(false)
    }
  }

  const sellerDisplayName =
    auction?.seller?.full_name?.trim() ||
    (auction ? 'بائع' : '')

  const submitReport = async () => {
    if (!auction || !user) return
    if (!reportReason) {
      setReportError('اختر سبب البلاغ')
      return
    }
    setReportSubmitting(true)
    setReportError('')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          auction_id: auction.id,
          reported_user_id: auction.seller_id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال')
      show('تم إرسال البلاغ، شكراً لك', 'success')
      setShowReportModal(false)
      setReportReason('')
      setReportDetails('')
    } catch (e: unknown) {
      setReportError(e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setReportSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-lg"
          aria-label="الرئيسية"
        >
          →
        </Link>
        <h1 className="font-bold text-gray-900 flex-1 text-center">تفاصيل المزاد</h1>
        <Link
          href="/notifications"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0"
          aria-label="الإشعارات"
        >
          🔔
        </Link>
      </header>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && fetchError && (
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-4">{fetchError}</p>
          <Link href="/" className="text-amber-600 font-medium">
            العودة للرئيسية
          </Link>
        </div>
      )}

      {!loading && auction && (
        <>
          <div className="bg-white relative">
            <div className="absolute top-3 left-3 z-10 flex gap-2">
              <FavoriteHeart auctionId={auction.id} userId={user?.user_id ?? null} />
            </div>
            <AuctionImageGallery images={auction.images} />
          </div>

          <div className="px-4 mt-3 space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 leading-snug">{auction.title}</h2>
              <div className="flex flex-wrap gap-2 mt-3 text-sm text-gray-600">
                <span className="px-2 py-1 bg-gray-100 rounded-lg">📁 {auction.category}</span>
                <span className="px-2 py-1 bg-gray-100 rounded-lg">✨ {auction.condition}</span>
                <span className="px-2 py-1 bg-gray-100 rounded-lg">
                  📍 {auction.city || 'غير محدد'}
                </span>
              </div>
            </div>

            <AuctionCountdown
              endsAt={auction.ends_at}
              status={auction.status}
              onEndedChange={handleEndedChange}
            />

            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-1">السعر الحالي</p>
              <p className="text-4xl font-extrabold text-amber-500">
                {Number(auction.current_bid).toLocaleString()}{' '}
                <span className="text-xl font-bold text-amber-600">ر.س</span>
              </p>
              <div className="mt-4 flex justify-center gap-6 text-sm text-gray-600 border-t border-gray-100 pt-4">
                <div>
                  <span className="text-gray-400 block text-xs">المزايدات</span>
                  <span className="font-semibold text-gray-900">{auction.bid_count}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">أعلى مزايد</span>
                  <span className="font-semibold text-gray-900">
                    {auction.highest_bidder?.full_name ?? '—'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                الحد الأدنى للمزايدة التالية: {minBid.toLocaleString()} ر.س
              </p>
            </div>

            <button
              type="button"
              onClick={handleBidButtonClick}
              disabled={bidButtonDisabled}
              className="w-full py-4 rounded-2xl bg-amber-500 text-white font-bold text-lg shadow-md hover:bg-amber-600 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              {!user
                ? 'سجّل الدخول للمزايدة'
                : isSeller
                  ? 'لا يمكنك المزايدة على مزادك'
                  : auctionClosed
                    ? 'المزاد غير نشط'
                    : 'زايد الآن'}
            </button>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">الوصف</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {auction.description || 'لا يوجد وصف.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">البائع</h3>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl shrink-0">
                  👤
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-semibold text-gray-900 text-base leading-snug break-words">
                    {sellerDisplayName}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {auction.seller.city ? '📍 ' + auction.seller.city + ' · ' : ''}
                    ⭐{' '}
                    {auction.seller.rating != null
                      ? Number(auction.seller.rating).toFixed(1)
                      : '—'}
                  </p>
                </div>
              </div>

              {user && !isSeller && (
                <button
                  type="button"
                  onClick={() => void openSellerChat()}
                  disabled={msgLoading}
                  className="w-full mt-4 py-3 rounded-xl border-2 border-amber-500 text-amber-600 font-bold bg-amber-50/50 hover:bg-amber-50 disabled:opacity-50"
                >
                  {msgLoading ? 'جاري الفتح...' : '💬 مراسلة البائع'}
                </button>
              )}

              {!user && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  <Link href="/auth/login" className="text-amber-600 font-semibold">
                    سجّل الدخول
                  </Link>
                  {' لمراسلة البائع'}
                </p>
              )}
            </div>

            {auctionClosed && isWinner && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-sm text-green-800 font-bold mb-1">أنت الفائز! 🎉</p>
                <p className="text-sm text-gray-700 mb-2">
                  سعر الفوز: {Number(auction.current_bid).toLocaleString()} ر.س
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/checkout/' + auction.id)}
                  className="w-full py-3.5 rounded-xl bg-amber-500 text-white font-bold shadow-md hover:bg-amber-600"
                >
                  ادفع الآن
                </button>
              </div>
            )}

            {auctionClosed && isWinner && auctionOrder && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-sm font-bold text-gray-900 text-center">حالة الطلب</p>
                <OrderStatusTracker currentStatus={auctionOrder.status} />
                <button
                  type="button"
                  onClick={() => router.push('/orders/' + auctionOrder.id)}
                  className="w-full py-3 rounded-xl border-2 border-amber-500 text-amber-600 font-bold bg-amber-50/50"
                >
                  عرض تفاصيل الطلب
                </button>
              </div>
            )}

            {auctionClosed &&
              isSeller &&
              auction.highest_bidder_id &&
              auction.highest_bidder && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-sm text-emerald-800 font-medium mb-1">تم بيع مزادك</p>
                  <p className="text-lg font-bold text-gray-900">{auction.highest_bidder.full_name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    سعر البيع: {Number(auction.current_bid).toLocaleString()} ر.س
                  </p>
                </div>
              )}

            {auctionClosed && auctionOrder && isSeller && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-sm font-bold text-gray-900 text-center">إدارة الشحن</p>
                <OrderStatusTracker currentStatus={auctionOrder.status} />
                <button
                  type="button"
                  onClick={() => router.push('/orders/' + auctionOrder.id)}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold shadow-md"
                >
                  إدارة الطلب
                </button>
              </div>
            )}

            {auctionClosed &&
              !isWinner &&
              !isSeller &&
              auction.highest_bidder_id && (
                <div className="bg-gray-100 rounded-2xl p-4 text-center text-gray-600 text-sm font-medium">
                  انتهى المزاد
                </div>
              )}

            {auctionClosed && !auction.highest_bidder_id && (
              <div className="bg-gray-100 rounded-2xl p-4 text-center text-gray-600 text-sm">
                انتهى المزاد دون مزايدات
              </div>
            )}

            {reviewExists === false && user && auction.highest_bidder_id && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-2">كيف كانت تجربتك مع البائع؟</p>
                <p className="text-xs text-gray-600 mb-3">ساعد المجتمع بتقييم سريع للبائع.</p>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm"
                >
                  تقييم البائع
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {auction && user && (
        <ReviewModal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          auctionId={auction.id}
          sellerId={auction.seller_id}
          userId={user.user_id}
          onSubmitted={() => setReviewExists(true)}
        />
      )}

      {showReportModal && auction && (
        <div
          className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 id="report-modal-title" className="font-bold text-lg text-gray-900">
                الإبلاغ عن هذا المزاد
              </h2>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سبب البلاغ</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm"
                >
                  <option value="">— اختر —</option>
                  <option value="محتوى مخالف">محتوى مخالف</option>
                  <option value="منتج ممنوع">منتج ممنوع</option>
                  <option value="احتيال محتمل">احتيال محتمل</option>
                  <option value="سعر غير واقعي">سعر غير واقعي</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تفاصيل إضافية (اختياري)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="تفاصيل إضافية (اختياري)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
                />
              </div>
              {reportError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{reportError}</p>
              )}
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={reportSubmitting}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-50"
              >
                {reportSubmitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBidModal && auction && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bid-modal-title"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 id="bid-modal-title" className="font-bold text-lg text-gray-900">
                تقديم مزايدة
              </h2>
              <button
                type="button"
                onClick={() => setShowBidModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                الحد الأدنى:{' '}
                <span className="font-bold text-amber-600">{minBid.toLocaleString()} ر.س</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ المزايدة</label>
                <input
                  type="number"
                  min={minBid}
                  step={auction.bid_increment}
                  value={bidAmount || ''}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold text-center focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBidAmount((v) => Math.max(minBid, v - auction.bid_increment))}
                  className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-700"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setBidAmount((v) => v + auction.bid_increment)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-700"
                >
                  +
                </button>
              </div>
              {bidError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{bidError}</p>
              )}
              <button
                type="button"
                onClick={() => void submitBid()}
                disabled={bidSubmitting || bidAmount < minBid}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-50"
              >
                {bidSubmitting ? 'جاري الإرسال...' : 'تأكيد المزايدة'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
