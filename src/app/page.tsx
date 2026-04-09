'use client'

import { ArrowLeft, Funnel, Gavel, MagnifyingGlass, MapPin } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { memo, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuctionListingHotBadge } from '@/components/auction/AuctionListingHotBadge'
import { RecommendationCarousel } from '@/components/auction/RecommendationCarousel'
import { BuyerProtectionBanner } from '@/components/home/BuyerProtectionBanner'
import { CategoryBar } from '@/components/home/CategoryBar'
import { EndingSoonSection } from '@/components/home/EndingSoonSection'
import { HotAuctionsSection } from '@/components/home/HotAuctionsSection'
import { NewlyAddedSection } from '@/components/home/NewlyAddedSection'
import { AppHeader } from '@/components/AppHeader'
import { BottomNav } from '@/components/BottomNav'
import { EmptyState } from '@/components/EmptyState'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { PullToRefresh } from '@/components/PullToRefresh'
import { PushPermissionBanner } from '@/components/PushPermissionBanner'
import { HomeGridSkeleton } from '@/components/Skeleton'
import { SplashScreen } from '@/components/SplashScreen'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { CATEGORY_OPTIONS } from '@/lib/category-labels'
import { useLocale } from '@/lib/locale-context'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { ACTIVE_CITY } from '@/lib/region-lock'
import { formatSARFromRiyalInteger } from '@/lib/utils/currency'
import { auctionCountdownParts } from '@/lib/time'
import type { TranslationKey } from '@/lib/translations'

function AuctionListingThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#F3F4F6] text-gray-400 dark:bg-slate-700">
        <MagnifyingGlass className="h-8 w-8 opacity-40" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function countdownLabel(
  locale: string,
  t: (k: TranslationKey) => string,
  endsAt: string,
  status: string
) {
  const parts = auctionCountdownParts(endsAt, status)
  if (parts.ended) return t('common_ended')
  if (locale === 'ar') return `${parts.hours}س ${parts.minutes}د ${parts.seconds}ث`
  return `${parts.hours}h ${parts.minutes}m ${parts.seconds}s`
}

type HomeAuctionRow = {
  id: string
  title: string
  images?: unknown
  city?: string | null
  current_bid: number
  bid_count: number
  ends_at: string
  status: string
}

type HomeHeaderUser = { user_id: string; phone?: string; email?: string; name?: string } | null

const HomeAuctionCard = memo(function HomeAuctionCard({
  a,
  user,
  locale,
  t,
}: {
  a: HomeAuctionRow
  user: HomeHeaderUser
  locale: string
  t: (k: TranslationKey) => string
}) {
  const parts = auctionCountdownParts(a.ends_at, a.status)
  const label = countdownLabel(locale, t, a.ends_at, a.status)
  const underOneHour = !parts.ended && parts.hours < 1
  const imgs = normalizeAuctionImages(a.images)
  const firstImg = imgs[0] ?? null
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <Link
        href={'/auction/' + a.id}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="absolute left-2 top-2 z-10 rounded-full bg-white/95 p-1 shadow-md ring-1 ring-white/80 dark:bg-slate-900/90">
          <FavoriteHeart auctionId={a.id} userId={user?.user_id ?? null} />
        </div>
        <AuctionListingHotBadge auctionId={a.id} />
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-slate-700">
          <AuctionListingThumb src={firstImg} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
          {underOneHour && !parts.ended && (
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-red-500/95 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#1F2937] dark:text-slate-100">
            {a.title}
          </h3>
          <p className="mt-2 text-xl font-extrabold tabular-nums text-[#1B7F7A] dark:text-slate-100">
            {formatSARFromRiyalInteger(Math.round(Number(a.current_bid)))}
          </p>
          <div className="mt-2 flex flex-1 flex-col justify-end gap-2">
            <div className="flex items-center justify-between gap-1 text-xs text-gray-500 dark:text-slate-400">
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1B7F7A]" weight="bold" />
                <span className="truncate">{a.city || t('common_undefinedCity')}</span>
              </span>
              <span
                className={
                  parts.ended
                    ? 'shrink-0 rounded-md bg-red-50 px-2 py-0.5 font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-300'
                    : underOneHour
                      ? 'shrink-0 font-semibold text-red-600 dark:text-red-400'
                      : 'shrink-0 font-medium text-gray-600 dark:text-slate-300'
                }
              >
                {label}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                <Gavel className="h-3.5 w-3.5 text-[#1B7F7A]" weight="bold" />
                {a.bid_count} {t('home_bidCount')}
              </p>
              <span
                className={
                  'rounded-full bg-[#FF8C42] px-3 py-1 text-[10px] font-bold text-white shadow-sm ' +
                  (underOneHour && !parts.ended ? 'animate-pulse' : '')
                }
              >
                {t('home_bidNow')}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
})

export default function HomePage() {
  const router = useRouter()
  const { t, dir, locale } = useLocale()
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
  const [user, setUser] = useState<{
    user_id: string
    phone?: string
    email?: string
    name?: string
  } | null>(null)
  const [tick, setTick] = useState(0)
  const buildUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (category !== 'الكل') p.set('category', category)
    p.set('city', ACTIVE_CITY)
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
    const u = readQaboUserFromStorage()
    setUser(u ? { user_id: u.user_id, phone: u.phone ?? '', email: u.email, name: u.name } : null)
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

  const popularCats = CATEGORY_OPTIONS.filter((c) => c.api !== 'الكل').slice(0, 6)

  return (
    <PullToRefresh onRefresh={load}>
      <SplashScreen />
      <div
        className="min-h-screen bg-[#F3F4F6] pb-24 dark:bg-slate-900"
        dir={dir}
      >
        <div className="rounded-b-[2rem] bg-gradient-to-b from-[#1B7F7A] via-[#156661] to-[#134e4a] px-4 pb-10 pt-2 text-white shadow-lg">
          <AppHeader showBrand variant="hero" />
          {user && <PushPermissionBanner />}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mt-2 text-center"
          >
            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{t('home_heroTitle')}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/85">{t('home_heroSubtitle')}</p>
            <div className="mt-4 flex flex-row-reverse items-center justify-center gap-3">
              <Image
                src="/logo-qabboo.png"
                alt=""
                width={120}
                height={40}
                className="h-14 w-auto object-contain drop-shadow-md"
              />
              <span className="text-2xl font-extrabold text-white">قبو</span>
            </div>
            <Link
              href="/auction"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-[#FF8C42] px-8 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95"
            >
              {t('home_ctaBrowse')}
            </Link>
          </motion.div>
        </div>

        <div className="relative z-10 -mt-6 px-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="relative mb-4">
              <span
                className="pointer-events-none absolute right-3 top-1/2 z-[1] -translate-y-1/2 text-[#1B7F7A] dark:text-slate-200"
                aria-hidden
              >
                <MagnifyingGlass className="h-6 w-6" weight="bold" />
              </span>
              <Link
                href="/search"
                className="flex h-14 w-full items-center rounded-2xl border-2 border-gray-100 bg-[#F3F4F6] pr-12 pl-4 text-sm font-medium text-[#1F2937] shadow-inner transition-colors hover:border-[#1B7F7A]/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                {t('home_searchPlaceholder')}
              </Link>
              <Link
                href="/search"
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-white text-[#1B7F7A] shadow-md dark:bg-slate-800 dark:text-slate-100"
                aria-label={t('common_filter')}
              >
                <Funnel className="h-5 w-5" weight="bold" />
              </Link>
            </div>

            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              {t('home_popularCategories')}
            </p>
            <CategoryBar selected={category} onSelect={setCategory} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-6 px-0">
          <BuyerProtectionBanner />
          <EndingSoonSection />
          <HotAuctionsSection />
          <NewlyAddedSection />
        </div>

        {!user && (
          <div className="mt-6 px-4">
            <h3 className="mb-2 text-sm font-bold text-[#1F2937] dark:text-slate-200">{t('home_howTitle')}</h3>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {[
                { n: '1', emoji: '📝', label: t('home_howStep1') },
                { n: '2', emoji: '🏷️', label: t('home_howStep2') },
                { n: '3', emoji: '🏆', label: t('home_howStep3') },
              ].map((s) => (
                <div
                  key={s.n}
                  className="w-28 flex-shrink-0 snap-center rounded-xl border border-[#E6F4F3] bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800"
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F4F3] text-lg dark:bg-[#134e4a]">
                    {s.n}
                  </span>
                  <span className="mb-1 block text-2xl">{s.emoji}</span>
                  <span className="text-xs font-medium text-[#1F2937] dark:text-slate-200">{s.label}</span>
                </div>
          ))}
        </div>
      </div>
        )}

        <div className="mt-6 px-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#1F2937] dark:text-slate-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              {t('home_liveAuctions')}
            </h2>
            <Link href="/auction" className="flex items-center gap-1 text-sm font-semibold text-[#1B7F7A] dark:text-slate-200">
              {t('common_viewAll')}
              <ArrowLeft className="h-4 w-4" weight="bold" />
            </Link>
          </div>
          {loading ? (
            <HomeGridSkeleton />
          ) : auctions.length === 0 ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <EmptyState
                icon={
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#E6F4F3] to-[#1B7F7A]/25 text-5xl dark:from-slate-700 dark:to-[#134e4a]/50">
                    <span aria-hidden>🏛️</span>
                  </div>
                }
                title={t('home_noAuctions')}
                subtitle={t('home_noAuctionsHint')}
                actionLabel={t('home_addAuctionCta')}
                onAction={() => router.push('/create')}
                actionClassName="bg-gradient-to-r from-[#1B7F7A] to-[#156661] shadow-lg hover:opacity-95"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {auctions.slice(0, 6).map((a) => (
                  <HomeAuctionCard key={a.id} a={a} user={user} locale={locale} t={t} />
                ))}
              </div>
              {auctions.length > 6 && (
                <Link
                  href="/auction"
                  className="mt-4 block rounded-2xl border border-gray-200 bg-white py-3 text-center text-sm font-semibold text-[#1B7F7A] shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {t('home_showMore')} ({auctions.length - 6}+)
                </Link>
              )}
            </>
          )}
        </div>

        {user?.user_id ? (
          <RecommendationCarousel title="مقترح لك" type="personal" userId={user.user_id} />
        ) : null}
        <RecommendationCarousel title="رائج الآن 🔥" type="trending" />

        <div className="mt-8 px-4">
          <h2 className="mb-3 text-lg font-bold text-[#1F2937] dark:text-slate-100">{t('home_popularCategories')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {popularCats.map(({ api, key }) => (
              <Link
                key={api}
                href={'/categories/' + encodeURIComponent(api)}
                className="relative flex h-24 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B7F7A] to-[#134e4a] p-3 text-white shadow-md transition-transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%23ffffff%22 opacity=%22.06%22/%3E%3C/svg%3E')] opacity-90" />
                <span className="relative z-[1] text-sm font-bold">{t(key)}</span>
              </Link>
            ))}
          </div>
      </div>

        <footer className="mt-10 border-t border-gray-200 bg-white px-4 py-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center text-sm text-gray-600 dark:text-slate-400">
            <div className="flex flex-row-reverse items-center gap-2">
              <Image
                src="/logo-qabboo.png"
                alt=""
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
              />
              <span className="text-lg font-bold text-[#1F2937] dark:text-slate-100">قبو</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 font-semibold text-[#1B7F7A] dark:text-slate-200">
              <Link href="/terms">{t('footer_terms')}</Link>
              <Link href="/privacy">{t('footer_privacy')}</Link>
              <a href="mailto:support@qabboo.com">{t('common_contactUs')}</a>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {locale === 'ar'
                ? `جميع الحقوق محفوظة © 2026 ${t('common_appName')}`
                : `© 2026 ${t('common_appName')} — ${t('footer_rights')}`}
            </p>
          </div>
        </footer>

        <BottomNav active="home" />
      </div>
    </PullToRefresh>
  )
}
