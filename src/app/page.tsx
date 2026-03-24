'use client'

import {
  ArrowLeft,
  Barbell,
  Book,
  Buildings,
  Car,
  Clock,
  DeviceMobile,
  DotsThree,
  Gavel,
  GridFour,
  MagnifyingGlass,
  MapPin,
  TShirt,
  UserCircle,
} from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { EmptyState } from '@/components/EmptyState'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { PullToRefresh } from '@/components/PullToRefresh'
import { PushPermissionBanner } from '@/components/PushPermissionBanner'
import { HomeGridSkeleton } from '@/components/Skeleton'
import { SplashScreen } from '@/components/SplashScreen'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { auctionCountdownParts } from '@/lib/time'

const CATEGORY_ICONS: Record<string, ReactNode> = {
  الكل: <GridFour className="h-4 w-4 shrink-0" weight="bold" />,
  إلكترونيات: <DeviceMobile className="h-4 w-4 shrink-0" weight="bold" />,
  سيارات: <Car className="h-4 w-4 shrink-0" weight="bold" />,
  عقارات: <Buildings className="h-4 w-4 shrink-0" weight="bold" />,
  أزياء: <TShirt className="h-4 w-4 shrink-0" weight="bold" />,
  ساعات: <Clock className="h-4 w-4 shrink-0" weight="bold" />,
  أثاث: <DotsThree className="h-4 w-4 shrink-0" weight="bold" />,
  رياضة: <Barbell className="h-4 w-4 shrink-0" weight="bold" />,
  كتب: <Book className="h-4 w-4 shrink-0" weight="bold" />,
  أخرى: <DotsThree className="h-4 w-4 shrink-0" weight="bold" />,
}

function AuctionListingThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#F3F4F6] text-gray-400">
        <MagnifyingGlass className="h-10 w-10 opacity-40" />
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt=""
      fill
      className="object-cover"
      sizes="(max-width: 640px) 50vw, 33vw"
      onError={() => setFailed(true)}
    />
  )
}

export default function HomePage() {
  const router = useRouter()
  const [auctions, setAuctions] = useState<
    {
      id: string
      title: string
      images?: unknown
      city?: string | null
      current_bid: number
      bid_count: number
      ends_at: string
      status: string
    }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('الكل')
  const [user, setUser] = useState<{ user_id: string; phone: string } | null>(null)
  const [tick, setTick] = useState(0)

  const categories = useMemo(
    () => ['الكل', 'إلكترونيات', 'سيارات', 'عقارات', 'أزياء', 'ساعات', 'أثاث', 'رياضة', 'كتب', 'أخرى'],
    []
  )

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (category !== 'الكل') p.set('category', category)
    const qs = p.toString()
    return '/api/auctions' + (qs ? '?' + qs : '')
  }, [category])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl())
      const data = await res.json()
      if (Array.isArray(data)) setAuctions(data)
      else setAuctions([])
    } catch {
      setAuctions([])
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored) as { user_id: string; phone: string })
      } catch {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    const h = setTimeout(() => void load(), 280)
    return () => clearTimeout(h)
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  void tick

  return (
    <PullToRefresh onRefresh={load}>
      <SplashScreen />
      <div className="min-h-screen bg-gray-50 pb-20 dark:bg-slate-900" dir="rtl">
        <div className="rounded-b-2xl bg-white px-4 pb-2 pt-4 shadow-sm dark:bg-slate-800">
          <AppHeader
            showBrand
            rightSlot={
              user ? (
                <Link
                  href="/profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6F4F3] text-[#1B7F7A] shadow-sm transition-transform active:scale-95"
                  aria-label="الملف الشخصي"
                >
                  <UserCircle className="h-6 w-6" weight="fill" />
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="rounded-full bg-[#E6F4F3] px-4 py-1.5 text-sm font-semibold text-[#1B7F7A] transition-transform active:scale-95"
                >
                  دخول
                </Link>
              )
            }
          />
          {user && <PushPermissionBanner />}
          <div className="mb-3 flex flex-col gap-2">
            <div className="relative">
              <span
                className="pointer-events-none absolute right-3 top-1/2 z-[1] -translate-y-1/2 text-[#1B7F7A]"
                aria-hidden
              >
                <MagnifyingGlass className="h-5 w-5" weight="bold" />
              </span>
              <Link
                href="/search"
                className="flex h-12 w-full items-center rounded-2xl border-2 border-gray-100 bg-white pr-11 pl-4 text-sm text-[#156661] shadow-sm transition-colors focus-within:border-[#1B7F7A] hover:border-[#1B7F7A]/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                ابحث في المزادات...
              </Link>
            </div>
          </div>
          <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  'flex shrink-0 snap-center items-center gap-2 rounded-full px-5 py-2 text-sm whitespace-nowrap transition-transform ' +
                  (category === c
                    ? 'scale-[1.02] bg-[#1B7F7A] font-semibold text-white shadow-md'
                    : 'border border-gray-200 bg-white text-[#1F2937] hover:border-[#1B7F7A]/30 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100')
                }
              >
                {CATEGORY_ICONS[c] ?? <DotsThree className="h-4 w-4" />}
                {c}
              </button>
            ))}
          </div>
        </div>

        {!user && (
          <div className="mt-4 px-4">
            <h3 className="mb-2 text-sm font-bold text-gray-700 dark:text-slate-200">كيف يعمل قبو؟</h3>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
              <div className="w-28 flex-shrink-0 snap-center rounded-xl border border-[#E6F4F3] bg-white p-3 text-center dark:border-teal-900/40 dark:bg-slate-800">
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F4F3] text-lg dark:bg-teal-900/50">
                  1
                </span>
                <span className="text-2xl mb-1 block">📝</span>
                <span className="text-xs font-medium text-[#1F2937] dark:text-slate-200">سجّل حسابك</span>
              </div>
              <div className="w-28 flex-shrink-0 snap-center rounded-xl border border-[#E6F4F3] bg-white p-3 text-center dark:border-teal-900/40 dark:bg-slate-800">
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F4F3] text-lg dark:bg-teal-900/50">
                  2
                </span>
                <span className="text-2xl mb-1 block">🏷️</span>
                <span className="text-xs font-medium text-[#1F2937] dark:text-slate-200">زايد على ما تحب</span>
              </div>
              <div className="w-28 flex-shrink-0 snap-center rounded-xl border border-[#E6F4F3] bg-white p-3 text-center dark:border-teal-900/40 dark:bg-slate-800">
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F4F3] text-lg dark:bg-teal-900/50">
                  3
                </span>
                <span className="text-2xl mb-1 block">🏆</span>
                <span className="text-xs font-medium text-gray-700 dark:text-slate-200">اربح وادفع</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 px-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-slate-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              مزادات حية
            </h2>
            <Link
              href="/auction"
              className="flex items-center gap-1 text-sm font-medium text-[#1B7F7A]"
            >
              عرض الكل
              <ArrowLeft className="h-4 w-4" weight="bold" />
            </Link>
          </div>
          {loading ? (
            <HomeGridSkeleton />
          ) : auctions.length === 0 ? (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <EmptyState
                icon={<MagnifyingGlass className="h-14 w-14" weight="duotone" />}
                title="لا توجد مزادات مطابقة"
                subtitle="جرّب تغيير التصنيف أو استخدم البحث المتقدم"
                actionLabel="بحث متقدم"
                onAction={() => router.push('/search')}
                actionClassName="bg-gradient-to-r from-[#1B7F7A] to-[#22A39F] shadow-lg hover:opacity-95"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {auctions.slice(0, 6).map((a) => {
                  const parts = auctionCountdownParts(a.ends_at, a.status)
                  const label = parts.ended
                    ? 'انتهى'
                    : `${parts.hours}س ${parts.minutes}د ${parts.seconds}ث`
                  const underOneHour = !parts.ended && parts.hours < 1
                  const imgs = normalizeAuctionImages(a.images)
                  const firstImg = imgs[0] ?? null
                  return (
                    <Link
                      key={a.id}
                      href={'/auction/' + a.id}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="absolute top-2 left-2 z-10 rounded-full bg-white p-1 shadow-md ring-1 ring-white/80">
                        <FavoriteHeart auctionId={a.id} userId={user?.user_id ?? null} />
                      </div>
                      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-gray-100">
                        <AuctionListingThumb src={firstImg} />
                      </div>
                      <div className="p-3">
                        <h3 className="truncate text-sm font-medium leading-snug text-gray-900 dark:text-slate-100">
                          {a.title}
                        </h3>
                        <p className="mt-1 text-base font-bold text-[#1B7F7A]">
                          {Number(a.current_bid).toLocaleString()} ر.س
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1B7F7A]" weight="bold" />
                            {a.city || 'غير محدد'}
                          </span>
                          <span
                            className={
                              parts.ended
                                ? 'rounded-md bg-red-50 px-2 py-0.5 font-semibold text-red-600'
                                : underOneHour
                                  ? 'flex items-center gap-1 font-semibold text-red-600'
                                  : ''
                            }
                          >
                            {underOneHour && !parts.ended && (
                              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-red-500" />
                            )}
                            {label}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                          <Gavel className="h-3.5 w-3.5 text-[#1B7F7A]" weight="bold" />
                          {a.bid_count} مزايدة
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
              {auctions.length > 6 && (
                <Link
                  href="/auction"
                  className="mt-3 block rounded-xl border border-gray-100 bg-white py-3 text-center text-sm font-medium text-[#1B7F7A] shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  عرض المزيد ({auctions.length - 6}+)
                </Link>
              )}
            </>
          )}
        </div>

        <BottomNav active="home" />
      </div>
    </PullToRefresh>
  )
}
