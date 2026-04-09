'use client'

import {
  ArrowRight,
  Bell,
  ChatCircle,
  Confetti,
  Folder,
  MapPin,
  Robot,
  ShieldCheck,
  Star,
  UserCircle,
  X,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { AuctionCountdown } from '@/components/AuctionCountdown'
import { RecommendationCarousel } from '@/components/auction/RecommendationCarousel'
import { SocialProofBadge } from '@/components/auction/SocialProofBadge'
import { AuctionQA } from '@/components/AuctionQA'
import { LiveBidPanel } from '@/components/LiveBidPanel'
import { AuctionImageGallery } from '@/components/AuctionImageGallery'
import { Video360Viewer } from '@/components/Video360Viewer'
import { BottomNav } from '@/components/BottomNav'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { OrderStatusTracker } from '@/components/OrderStatusTracker'
import { ReviewModal } from '@/components/ReviewModal'
import { SellerResponsivenessBadge } from '@/components/seller/SellerResponsivenessBadge'
import { AuctionJsonLd } from '@/components/seo/AuctionJsonLd'
import { useToast } from '@/components/Toast'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { sameUserId } from '@/lib/ids'
import { useLocale } from '@/lib/locale-context'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import type { ResponsivenessData } from '@/lib/types/seller-responsiveness'
import type { CI360Hotspot, Defect } from '@/lib/video360-types'
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
  seller_responsiveness?: ResponsivenessData
}

export default function AuctionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { show } = useToast()
  const { t, dir } = useLocale()
  const id = typeof params.id === 'string' ? params.id : ''

  const [auction, setAuction] = useState<AuctionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [user, setUser] = useState<{ user_id: string; phone?: string; email?: string; name?: string } | null>(
    null
  )
  const [ended, setEnded] = useState(false)

  const [msgLoading, setMsgLoading] = useState(false)
  const [reviewExists, setReviewExists] = useState<boolean | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')
  const [auctionOrder, setAuctionOrder] = useState<AuctionOrderRow | null>(null)
  const [hasAutobid, setHasAutobid] = useState(false)
  const [showAutobidModal, setShowAutobidModal] = useState(false)
  const [autobidMax, setAutobidMax] = useState('')
  const [autobidLoading, setAutobidLoading] = useState(false)
  const [autobidError, setAutobidError] = useState('')
  const [views, setViews] = useState(0)
  const viewsBumpedForIdRef = useRef(false)
  const [v360, setV360] = useState<{
    frame_urls: string[]
    annotated_urls: string[]
    hotspots: CI360Hotspot[]
    defects: Defect[]
    overall_condition: string
    condition_score: number
    summary_ar: string
  } | null>(null)

  const loadAuction = useCallback(async () => {
    if (!id) return
    const res = await fetch('/api/auctions/' + id)
    const data = await res.json()
    if (!res.ok) {
      setFetchError(data.error || t('auction_loadError'))
      setAuction(null)
      return
    }
    setFetchError('')
    setAuction(data as AuctionDetail)

    if (!viewsBumpedForIdRef.current) {
      viewsBumpedForIdRef.current = true
      try {
        await supabase.rpc('increment_views', { auction_id_input: id })
        const { data: vd } = await supabase
          .from('auction_views')
          .select('view_count')
          .eq('auction_id', id)
          .maybeSingle()
        if (vd && typeof vd.view_count === 'number') setViews(vd.view_count)
      } catch {}
    }
  }, [id, t])

  const loadAuctionRef = useRef(loadAuction)
  loadAuctionRef.current = loadAuction

  useEffect(() => {
    setUser(readQaboUserFromStorage())
  }, [])

  useEffect(() => {
    if (!id) return
    let cancel = false
    void fetch('/api/video360/view?auction_id=' + encodeURIComponent(id))
      .then((r) => r.json())
      .then((d: { available?: boolean; frame_urls?: string[] }) => {
        if (cancel) return
        if (d.available !== false && Array.isArray(d.frame_urls) && d.frame_urls.length >= 2) {
          setV360({
            frame_urls: d.frame_urls,
            annotated_urls: (d as { annotated_urls?: string[] }).annotated_urls ?? [],
            hotspots: ((d as { hotspots?: CI360Hotspot[] }).hotspots ?? []) as CI360Hotspot[],
            defects: ((d as { defects?: Defect[] }).defects ?? []) as Defect[],
            overall_condition: String((d as { overall_condition?: string }).overall_condition ?? 'unknown'),
            condition_score: Number((d as { condition_score?: number }).condition_score) || 0,
            summary_ar: String((d as { summary_ar?: string }).summary_ar ?? ''),
          })
        } else setV360(null)
      })
      .catch(() => {
        if (!cancel) setV360(null)
      })
    return () => {
      cancel = true
    }
  }, [id])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadAuction().finally(() => setLoading(false))
  }, [id, loadAuction])

  useEffect(() => {
    viewsBumpedForIdRef.current = false
    setViews(0)
  }, [id])

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
    if (!auction?.id || !user?.user_id) {
      setHasAutobid(false)
      return
    }
    if (sameUserId(user.user_id, auction.seller_id)) {
      setHasAutobid(false)
      return
    }
    let cancelled = false
    fetch(
      '/api/autobid?user_id=' +
        encodeURIComponent(user.user_id) +
        '&auction_id=' +
        encodeURIComponent(auction.id)
    )
      .then((r) => r.json())
      .then((d: { has_autobid?: boolean }) => {
        if (!cancelled) setHasAutobid(Boolean(d?.has_autobid))
      })
      .catch(() => {
        if (!cancelled) setHasAutobid(false)
      })
    return () => {
      cancelled = true
    }
  }, [auction?.id, auction?.seller_id, user?.user_id])

  useEffect(() => {
    if (!auction) return
    document.title = auction.title + ' — مزاد على قبو Qabboo'
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', property)
        document.head.appendChild(el)
      }
      el.content = content
    }
    setMeta('og:title', auction.title + ' — قبو')
    setMeta('og:description', (auction.description || '').slice(0, 160))
    setMeta('og:type', 'product')
    const imgs = normalizeAuctionImages(auction.images)
    if (imgs[0]) setMeta('og:image', imgs[0])
    setMeta('og:url', typeof window !== 'undefined' ? window.location.href : '')
  }, [auction])

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

  const auctionClosed = !auction || auction.status !== 'active' || ended

  const isWinner = Boolean(
    auction &&
      user &&
      auctionClosed &&
      auction.highest_bidder_id &&
      sameUserId(user.user_id, auction.highest_bidder_id)
  )

  const openChatWith = async (otherUserId: string) => {
    if (!user || !auction) {
      window.location.href = '/auth/login'
      return
    }
    if (sameUserId(user.user_id, otherUserId)) return
    setMsgLoading(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          other_user_id: otherUserId,
          auction_id: auction.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('auction_chatOpenError'))
      router.push('/chat/' + data.conversation_id)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setMsgLoading(false)
    }
  }

  const openSellerChat = async () => {
    if (!auction) return
    await openChatWith(auction.seller_id)
  }

  const sellerDisplayName =
    auction?.seller?.full_name?.trim() ||
    (auction ? t('common_seller') : '')

  const submitReport = async () => {
    if (!auction || !user) return
    if (!reportReason) {
      setReportError(t('auction_reportPick'))
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
      if (!res.ok) throw new Error(data.error || t('common_error'))
      show(t('auction_reportSent'), 'success')
      setShowReportModal(false)
      setReportReason('')
      setReportDetails('')
    } catch (e: unknown) {
      setReportError(e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setReportSubmitting(false)
    }
  }

  const submitAutobid = async () => {
    if (!auction || !user) return
    const max = Number(autobidMax.replace(/,/g, ''))
      if (!Number.isFinite(max) || max <= 0) {
      setAutobidError(t('auction_autobidMaxInvalid'))
      return
    }
    setAutobidLoading(true)
    setAutobidError('')
    try {
      const res = await fetch('/api/autobid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          auction_id: auction.id,
          max_amount: max,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common_error'))
      show(t('auction_autobidOn'), 'success')
      setHasAutobid(true)
      setShowAutobidModal(false)
      setAutobidMax('')
    } catch (e: unknown) {
      setAutobidError(e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setAutobidLoading(false)
    }
  }

  const stopAutobid = async () => {
    if (!auction || !user) return
    setAutobidLoading(true)
    try {
      const res = await fetch('/api/autobid', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, auction_id: auction.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('common_error'))
      show(t('auction_autobidOff'), 'info')
      setHasAutobid(false)
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setAutobidLoading(false)
    }
  }

  const msLeft =
    auction && auction.status === 'active' && !ended
      ? new Date(auction.ends_at).getTime() - Date.now()
      : 0
  const pulseBid = msLeft > 0 && msLeft < 3600000

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-28 dark:bg-slate-900" dir={dir}>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1F2937] shadow-sm dark:bg-slate-800 dark:text-slate-100"
          aria-label={t('auction_ariaHome')}
        >
          <ArrowRight className="h-5 w-5" weight="bold" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-semibold text-[#1F2937] dark:text-slate-100">
          {t('auction_title')}
        </h1>
        <Link
          href="/notifications"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1F2937] shadow-sm dark:bg-slate-800 dark:text-slate-100"
          aria-label={t('auction_ariaNotif')}
        >
          <Bell className="h-5 w-5" weight="bold" />
        </Link>
      </header>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1B7F7A] border-t-transparent" />
        </div>
      )}

      {!loading && fetchError && (
        <div className="p-6 text-center">
          <p className="mb-4 text-gray-600">{fetchError}</p>
          <Link href="/" className="font-medium text-[#1B7F7A]">
            {t('auction_goHome')}
          </Link>
        </div>
      )}

      {!loading && auction && (
        <>
          <AuctionJsonLd
            auction={{
              id: auction.id,
              title: auction.title,
              description: auction.description,
              current_bid_halalas: Math.round(Number(auction.current_bid) * 100),
              starting_bid_halalas: Math.round(Number(auction.start_price) * 100),
              bid_count: auction.bid_count,
              ends_at: auction.ends_at,
              images: auction.images ?? undefined,
              category: auction.category,
              seller_name: auction.seller?.full_name ?? null,
            }}
          />
          <div className="relative bg-white dark:bg-slate-900">
            <div className="absolute top-3 left-3 z-10 flex gap-2 rounded-full bg-white/95 p-1 shadow-md ring-1 ring-white/80">
              <FavoriteHeart auctionId={auction.id} userId={user?.user_id ?? null} />
            </div>
            <div className="relative w-full px-2 pt-2">
              <AuctionImageGallery images={auction.images} />
            </div>
            {v360 ? (
              <div className="border-t border-gray-100 px-2 pb-4 pt-4 dark:border-slate-700">
                <h2 className="mb-3 px-1 text-center text-sm font-bold text-[#1B7F7A] dark:text-emerald-400">
                  عرض 360° تفاعلي
                </h2>
                <Video360Viewer
                  frameUrls={v360.frame_urls}
                  annotatedUrls={v360.annotated_urls}
                  hotspots={v360.hotspots}
                  defects={v360.defects}
                  overallCondition={v360.overall_condition}
                  conditionScore={v360.condition_score}
                  summaryAr={v360.summary_ar}
                />
              </div>
            ) : null}
          </div>

          <div className="px-4 mt-3 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <h1 className="min-w-0 flex-1 text-xl font-bold text-gray-900 dark:text-slate-100">
                  {auction.title}
                </h1>
                <div className="shrink-0">
                  <ShareButton
                    auctionId={auction.id}
                    title={auction.title}
                    currentBidHalalas={Math.round(Number(auction.current_bid) * 100)}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#1F2937]">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-3 py-1.5 dark:bg-slate-700 dark:text-slate-100">
                  <Folder className="h-4 w-4 text-[#1B7F7A]" weight="bold" />
                  {auction.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-3 py-1.5 dark:bg-slate-700 dark:text-slate-100">
                  <Star className="h-4 w-4 text-[#1B7F7A]" weight="fill" />
                  {auction.condition}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-3 py-1.5 dark:bg-slate-700 dark:text-slate-100">
                  <MapPin className="h-4 w-4 text-[#1B7F7A]" weight="bold" />
                  {auction.city || t('common_undefinedCity')}
                </span>
              </div>
            </div>

            <AuctionCountdown
              endsAt={auction.ends_at}
              status={auction.status}
              onEndedChange={handleEndedChange}
            />

            {auction.status === 'active' && !ended ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <SocialProofBadge auctionId={auction.id} />
              </div>
            ) : null}

            <LiveBidPanel
              auctionId={auction.id}
              bidIncrement={Number(auction.bid_increment)}
              isOwner={isSeller}
              biddingOpen={auction.status === 'active' && !ended}
              userId={user?.user_id ?? null}
              initialCurrentBid={Number(auction.current_bid)}
              initialBidCount={Number(auction.bid_count)}
              viewCount={views > 0 ? views : undefined}
              pulseEnding={pulseBid && !isSeller}
              onBidPlaced={() => void loadAuction()}
              highestBidderId={auction.highest_bidder_id}
            />

            {user && !isSeller && !auctionClosed && (
              <div className="flex flex-col gap-2">
                {hasAutobid ? (
                  <button
                    type="button"
                    disabled={autobidLoading}
                    onClick={() => void stopAutobid()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-gray-50 py-3 text-sm font-bold text-gray-600 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {t('auction_stopAutobid')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAutobidError('')
                      setAutobidMax(String(minBid))
                      setShowAutobidModal(true)
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#1B7F7A] bg-[#E6F4F3] py-3 text-sm font-bold text-[#1B7F7A] transition-transform active:scale-95 dark:border-[#1B7F7A] dark:bg-[#134e4a]/50 dark:text-slate-100"
                  >
                    <Robot className="h-5 w-5" weight="bold" />
                    {t('auction_autobid')}
                  </button>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-2 font-bold text-[#1F2937] dark:text-slate-100">{t('auction_description')}</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-slate-300">
                {auction.description || t('common_noDescription')}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 font-bold text-[#1F2937] dark:text-slate-100">{t('auction_seller')}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E6F4F3] text-[#1B7F7A] dark:bg-teal-900/40">
                    <UserCircle className="h-9 w-9" weight="fill" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <p className="break-words text-base font-semibold leading-snug text-gray-900 dark:text-slate-100">
                        {sellerDisplayName}
                      </p>
                      <SellerResponsivenessBadge data={auction.seller_responsiveness} />
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center justify-end gap-1 text-sm text-gray-500">
                      {auction.seller.city ? (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {auction.seller.city}
                        </span>
                      ) : null}
                      {auction.seller.city ? <span>·</span> : null}
                      <span className="inline-flex items-center gap-0.5 text-[#FF8C42]">
                        <Star className="h-3.5 w-3.5" weight="fill" />
                        {auction.seller.rating != null
                          ? Number(auction.seller.rating).toFixed(1)
                          : '—'}
                      </span>
                    </p>
                  </div>
                </div>

                {user && !isSeller && (
                  <button
                    type="button"
                    onClick={() => void openSellerChat()}
                    disabled={msgLoading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1B7F7A] py-3 font-bold text-[#1B7F7A] transition-transform active:scale-95 disabled:opacity-50 dark:border-[#1B7F7A] dark:text-slate-100"
                  >
                    <ChatCircle className="h-5 w-5" weight="bold" />
                    {msgLoading ? t('auction_openingChat') : t('auction_chatSellerBtn')}
                  </button>
                )}

                {!user && (
                  <p className="mt-3 text-center text-sm text-gray-500 dark:text-slate-400">
                    <Link href="/auth/login" className="font-semibold text-[#1B7F7A] dark:text-slate-200">
                      {t('auction_loginChatLead')}
                    </Link>{' '}
                    {t('auction_loginChatTail')}
                  </p>
                )}
              </div>

            {auctionClosed && isWinner && (
              <div className="rounded-2xl bg-gradient-to-br from-[#1B7F7A] to-[#134e4a] p-4 text-center text-white shadow-md">
                <p className="mb-1 flex items-center justify-center gap-2 text-sm font-bold">
                  <Confetti className="h-6 w-6" weight="fill" />
                  {t('auction_youWon')}
                </p>
                <p className="mb-3 text-sm text-white/90">
                  {t('auction_winPrice')}: {Number(auction.current_bid).toLocaleString()}{' '}
                  {t('common_currency')}
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/checkout/' + auction.id)}
                  className="w-full rounded-xl bg-[#FF8C42] py-3.5 font-bold text-white shadow-md transition-transform active:scale-95 hover:bg-[#E87A35]"
                >
                  {t('auction_payNow')}
                </button>
                <button
                  type="button"
                  onClick={() => void openChatWith(auction.seller_id)}
                  disabled={msgLoading}
                  className="mt-3 w-full rounded-xl border-2 border-white/80 bg-white/10 py-3 text-sm font-bold text-white backdrop-blur-sm transition-transform active:scale-95 disabled:opacity-50 hover:bg-white/20"
                >
                  💬 تواصل مع البائع
                </button>
                {ended &&
                auction.highest_bidder_id &&
                user &&
                (sameUserId(user.user_id, auction.seller_id) ||
                  sameUserId(user.user_id, auction.highest_bidder_id)) ? (
                  <button
                    type="button"
                    onClick={() => router.push('/handover/' + auction.id)}
                    className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-700 active:scale-95"
                  >
                    📦 بدء عملية التسليم
                  </button>
                ) : null}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs leading-relaxed text-white/95">
                  <ShieldCheck className="h-4 w-4 shrink-0" weight="fill" aria-hidden />
                  {t('auction_escrowHint')}
                </p>
              </div>
            )}

            {auctionClosed && isWinner && auctionOrder && (
              <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="text-center text-sm font-bold text-[#1F2937] dark:text-slate-100">
                  {t('auction_orderStatusTitle')}
                </p>
                <OrderStatusTracker currentStatus={auctionOrder.status} />
                <button
                  type="button"
                  onClick={() => router.push('/orders/' + auctionOrder.id)}
                  className="w-full rounded-xl border-2 border-[#1B7F7A] bg-[#E6F4F3] py-3 font-bold text-[#1B7F7A] transition-transform active:scale-95 dark:bg-[#134e4a]/40 dark:text-slate-100"
                >
                  {t('auction_viewOrder')}
                </button>
              </div>
            )}

            {auctionClosed &&
              isSeller &&
              auction.highest_bidder_id &&
              auction.highest_bidder && (
                <div className="rounded-2xl border border-[#1B7F7A]/30 bg-[#E6F4F3] p-4 text-center shadow-sm dark:border-slate-600 dark:bg-slate-800">
                  <p className="mb-1 text-sm font-medium text-[#1B7F7A] dark:text-slate-200">
                    {t('auction_soldTitle')}
                  </p>
                  <p className="text-lg font-bold text-[#1F2937] dark:text-slate-100">
                    {auction.highest_bidder.full_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                    {t('auction_salePriceLabel')}: {Number(auction.current_bid).toLocaleString()}{' '}
                    {t('common_currency')}
                  </p>
                  {auction.highest_bidder_id ? (
                    <button
                      type="button"
                      onClick={() => void openChatWith(auction.highest_bidder_id as string)}
                      disabled={msgLoading}
                      className="mt-4 w-full rounded-xl border-2 border-[#1B7F7A] bg-white py-3 text-sm font-bold text-[#1B7F7A] transition-transform active:scale-95 disabled:opacity-50 dark:border-[#1B7F7A] dark:bg-slate-800 dark:text-slate-100"
                    >
                      💬 تواصل مع المشتري
                    </button>
                  ) : null}
                  {ended &&
                  auction.highest_bidder_id &&
                  user &&
                  (sameUserId(user.user_id, auction.seller_id) ||
                    sameUserId(user.user_id, auction.highest_bidder_id)) ? (
                    <button
                      type="button"
                      onClick={() => router.push('/handover/' + auction.id)}
                      className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-700 active:scale-95"
                    >
                      📦 بدء عملية التسليم
                    </button>
                  ) : null}
                </div>
              )}

            {auctionClosed && auctionOrder && isSeller && (
              <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <p className="text-center text-sm font-bold text-[#1F2937] dark:text-slate-100">
                  {t('auction_manageShipping')}
                </p>
                <OrderStatusTracker currentStatus={auctionOrder.status} />
                <button
                  type="button"
                  onClick={() => router.push('/orders/' + auctionOrder.id)}
                  className="w-full rounded-xl bg-[#1B7F7A] py-3 font-bold text-white shadow-md transition-transform active:scale-95 hover:bg-[#156661]"
                >
                  {t('auction_manageOrder')}
                </button>
              </div>
            )}

            {auctionClosed &&
              !isWinner &&
              !isSeller &&
              auction.highest_bidder_id && (
                <div className="rounded-2xl bg-gray-100 p-4 text-center text-sm font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-400">
                  {t('auction_endedSimple')}
                </div>
              )}

            {auctionClosed && !auction.highest_bidder_id && (
              <div className="rounded-2xl bg-gray-100 p-4 text-center text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-400">
                {t('auction_endedNoBids')}
              </div>
            )}

            {reviewExists === false && user && auction.highest_bidder_id && (
              <div className="rounded-2xl border border-[#1B7F7A]/20 bg-[#E6F4F3] p-4 shadow-sm dark:border-slate-600 dark:bg-[#134e4a]/30">
                <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {t('auction_reviewAsk')}
                </p>
                <p className="mb-3 text-xs text-gray-600 dark:text-slate-400">{t('auction_reviewSub')}</p>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="w-full rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white transition-transform active:scale-95 hover:bg-[#156661]"
                >
                  {t('auction_reviewBtn')}
                </button>
              </div>
            )}

            <AuctionQA auctionId={auction.id} isOwner={isSeller} />

            {auction.status === 'active' && (
              <RecommendationCarousel title="مزادات مشابهة" type="similar" auctionId={auction.id} />
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
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto overflow-hidden rounded-t-[2rem] bg-white shadow-xl sm:rounded-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
              <h2 id="report-modal-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {t('auction_reportTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                aria-label={t('auction_close')}
              >
                <X className="h-5 w-5" weight="bold" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('auction_reportReasonLabel')}
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">{t('auction_reportChoose')}</option>
                  <option value="محتوى مخالف">محتوى مخالف</option>
                  <option value="منتج ممنوع">منتج ممنوع</option>
                  <option value="احتيال محتمل">احتيال محتمل</option>
                  <option value="سعر غير واقعي">سعر غير واقعي</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('auction_reportDetailsLabel')}
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder={t('auction_reportDetailsLabel')}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              {reportError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{reportError}</p>
              )}
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={reportSubmitting}
                className="w-full rounded-xl bg-[#FF8C42] py-3 font-bold text-white transition-transform active:scale-95 disabled:opacity-50 hover:bg-[#E87A35]"
              >
                {reportSubmitting ? t('auction_reportSending') : t('auction_reportSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAutobidModal && auction && user && (
        <div
          className="fixed inset-0 z-[52] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="autobid-modal-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-t-[2rem] bg-white shadow-xl sm:rounded-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
              <h2 id="autobid-modal-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {t('auction_autobidModalTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setShowAutobidModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                aria-label={t('auction_close')}
              >
                <X className="h-5 w-5" weight="bold" />
              </button>
            </div>
            <div className="space-y-4 p-4">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                {t('auction_autobidHintPrefix')} {minBid.toLocaleString()} {t('common_currency')}{' '}
                {t('auction_autobidHintSuffix')}
              </p>
              <input
                type="number"
                min={minBid}
                step={auction.bid_increment}
                value={autobidMax}
                onChange={(e) => setAutobidMax(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-[#1B7F7A] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              {autobidError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{autobidError}</p>
              )}
              <button
                type="button"
                onClick={() => void submitAutobid()}
                disabled={autobidLoading}
                className="w-full rounded-xl bg-[#1B7F7A] py-3.5 font-bold text-white transition-transform active:scale-95 disabled:opacity-50 hover:bg-[#156661]"
              >
                {autobidLoading ? t('auction_autobidSaving') : t('auction_autobidActivate')}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
