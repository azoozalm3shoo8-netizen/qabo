'use client'

import { Funnel, List, MagnifyingGlass, SquaresFour } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sheet } from '@/components/ui/sheet'
import { useDebounce } from '@/hooks/useDebounce'
import { CATEGORY_CATALOG } from '@/lib/constants'
import { REGION_CITIES } from '@/lib/region-lock'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { auctionCountdownParts } from '@/lib/time'
import { formatSARFromRiyalInteger } from '@/lib/utils/currency'

const HISTORY_KEY = 'qabo_search_history'
const HISTORY_MAX = 5

type AuctionRow = {
  id: string
  title: string
  description: string | null
  category: string
  city: string | null
  images?: unknown
  start_price: number
  current_bid: number
  bid_count: number
  highest_bidder_id: string | null
  status: string
  ends_at: string
  created_at: string
}

function AuctionListingThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#F3F4F6] text-[#1B7F7A]">
        <MagnifyingGlass className="h-10 w-10 opacity-40" weight="duotone" />
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

export default function SearchPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query.trim(), 300)
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sort, setSort] = useState<'newest' | 'cheapest' | 'expensive' | 'ending_soon' | 'popular'>('newest')
  const [results, setResults] = useState<AuctionRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const limit = 20

  useEffect(() => {
    const u = readQaboUserFromStorage()
    setUserId(u?.user_id ?? null)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed)) {
          setSearchHistory(parsed.filter((x): x is string => typeof x === 'string').slice(0, HISTORY_MAX))
        }
      }
    } catch {
      setSearchHistory([])
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('lastSearch', debouncedQuery)
    } catch {
      /* ignore */
    }
  }, [debouncedQuery])

  const pushHistory = useCallback((term: string) => {
    const t = term.trim()
    if (!t) return
    setSearchHistory((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, HISTORY_MAX)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setSearchHistory([])
  }

  const buildParams = useCallback(
    (pageNum: number, qOverride?: string) => {
      const p = new URLSearchParams()
      const qUse = (qOverride ?? debouncedQuery).trim()
      if (qUse) p.set('q', qUse)
      if (category) p.set('category', category)
      if (city) p.set('city', city)
      if (minPrice.trim()) p.set('min_price', minPrice.trim())
      if (maxPrice.trim()) p.set('max_price', maxPrice.trim())
      p.set('status', statusFilter)
      p.set('sort', sort)
      p.set('page', String(pageNum))
      p.set('limit', String(limit))
      return p.toString()
    },
    [debouncedQuery, category, city, minPrice, maxPrice, statusFilter, sort]
  )

  const search = useCallback(
    async (opts?: { reset?: boolean; pageOverride?: number; qOverride?: string }) => {
      const reset = opts?.reset !== false
      const pageNum = opts?.pageOverride ?? (reset ? 1 : page)
      if (reset) setPage(1)
      setLoading(true)
      try {
        const qs = buildParams(reset ? 1 : pageNum, opts?.qOverride)
        const res = await fetch('/api/search?' + qs)
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error || 'تعذر البحث')
        const payload = data as { results: AuctionRow[]; total: number; page: number }
        if (reset) {
          setResults(payload.results)
          setPage(1)
        } else {
          setResults((prev) => [...prev, ...payload.results])
        }
        setTotal(payload.total)
        if (!reset) setPage(pageNum)
      } catch {
        if (reset) setResults([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [buildParams, page]
  )

  const searchRef = useRef(search)
  searchRef.current = search

  useEffect(() => {
    void searchRef.current({ reset: true })
  }, [debouncedQuery, category, city, minPrice, maxPrice, statusFilter, sort])

  const applyFiltersClick = () => {
    const t = query.trim()
    if (t) pushHistory(t)
    setDebouncedQuery(t)
    void searchRef.current({ reset: true, qOverride: t || undefined })
    setShowFilters(false)
  }

  const resetFilters = () => {
    setCategory('')
    setCity('الرياض')
    setMinPrice('')
    setMaxPrice('')
    setStatusFilter('active')
    setSort('newest')
  }

  const loadMore = async () => {
    const nextPage = page + 1
    setLoading(true)
    try {
      const qs = buildParams(nextPage)
      const res = await fetch('/api/search?' + qs)
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || 'تعذر التحميل')
      const payload = data as { results: AuctionRow[]; total: number }
      setResults((prev) => [...prev, ...payload.results])
      setPage(nextPage)
      setTotal(payload.total)
    } catch {
      /* keep state */
    } finally {
      setLoading(false)
    }
  }

  const categoryChips = useMemo(
    () => [{ name: 'الكل', value: '' }, ...CATEGORY_CATALOG.map((c) => ({ name: c.name, value: c.name }))],
    []
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const hasMore = total > page * limit

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-lg"
          aria-label="رجوع"
        >
          →
        </button>
        <h1 className="font-bold text-lg text-gray-900 flex-1 text-center">بحث</h1>
        <span className="w-10" />
      </header>

      <div className="px-4 mt-3 space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
            🔍
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const t = query.trim()
                if (t) pushHistory(t)
                void searchRef.current({ reset: true, qOverride: t })
              }
            }}
            placeholder="ابحث في المزادات..."
            className="w-full pr-10 pl-10 py-3 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#1B7F7A] shadow-inner"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold px-1"
              aria-label="مسح"
            >
              ✕
            </button>
          )}
        </div>

        {!query.trim() && searchHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600">عمليات بحث سابقة</span>
              <button type="button" onClick={clearHistory} className="text-xs text-[#1B7F7A] font-medium">
                مسح التاريخ
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setQuery(h)
                  }}
                  className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-800"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-800 shadow-sm"
            aria-label="فلاتر"
          >
            <Funnel className="h-5 w-5" weight="bold" />
            فلاتر
          </button>
          <button
            type="button"
            onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm"
            aria-label={view === 'grid' ? 'عرض قائمة' : 'عرض شبكة'}
          >
            {view === 'grid' ? <List className="h-5 w-5" weight="bold" /> : <SquaresFour className="h-5 w-5" weight="bold" />}
          </button>
        </div>

        <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="فلاتر البحث">
          <div className="space-y-4" dir="rtl">
            <div>
              <p className="mb-2 text-sm font-bold text-gray-900 dark:text-slate-100">التصنيف</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {categoryChips.map((c) => {
                  const active = category === c.value
                  return (
                    <button
                      key={c.value || 'all'}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={
                        'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ' +
                        (active ? 'bg-[#1B7F7A] text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200')
                      }
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-900 dark:text-slate-100">المدينة</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">كل النتائج</option>
                {REGION_CITIES.map((c) => (
                  <option key={c.name} value={c.name} disabled={!c.active}>
                    {c.name}
                    {!c.active ? ' — قريباً' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-gray-900 dark:text-slate-100">نطاق السعر (ر.س)</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="من"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="إلى"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-900 dark:text-slate-100">حالة المزاد</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="active">نشط</option>
                <option value="scheduled">قادم</option>
                <option value="ended">منتهي</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-900 dark:text-slate-100">الترتيب</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="ending_soon">ينتهي قريباً</option>
                <option value="cheapest">الأقل سعراً</option>
                <option value="expensive">الأعلى سعراً</option>
                <option value="popular">الأكثر مزايدات</option>
                <option value="newest">الأحدث</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => void applyFiltersClick()}
                className="flex-1 rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white transition-transform active:scale-95 hover:bg-[#156661]"
              >
                تطبيق
              </button>
              <button
                type="button"
                onClick={() => {
                  resetFilters()
                }}
                className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-800 dark:bg-slate-800 dark:text-slate-200"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        </Sheet>

        <p className="text-sm text-gray-600 font-medium">
          {loading && results.length === 0 ? 'جاري البحث...' : `تم العثور على ${total} مزاد`}
        </p>

        {loading && results.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 && !loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <EmptyState
              icon={<MagnifyingGlass className="h-10 w-10" weight="duotone" />}
              title="لم نجد ما تبحث عنه"
              description="جرّب كلمات أخرى أو تصفّح الفئات الشائعة."
              action={{ label: 'تصفح الفئات', href: '/categories' }}
            />
          </div>
        ) : (
          <>
            <div className={view === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
              {results.map((a) => {
                const parts = auctionCountdownParts(a.ends_at, a.status)
                const label = parts.ended
                  ? 'انتهى'
                  : `${parts.hours}س ${parts.minutes}د ${parts.seconds}ث`
                const imgs = normalizeAuctionImages(a.images)
                const firstImg = imgs[0] ?? null
                return (
                  <Link
                    key={a.id}
                    href={'/auction/' + a.id}
                    prefetch
                    className={
                      'relative overflow-hidden rounded-xl border border-gray-100/80 bg-white shadow-md transition-shadow hover:shadow-lg ' +
                      (view === 'grid' ? '' : 'flex gap-3 p-3')
                    }
                  >
                    <div className="absolute end-2 top-2 z-10">
                      <FavoriteHeart auctionId={a.id} userId={userId} />
                    </div>
                    <div
                      className={
                        view === 'grid'
                          ? 'relative aspect-square w-full overflow-hidden rounded-t-lg bg-gray-100'
                          : 'relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100'
                      }
                    >
                      <AuctionListingThumb src={firstImg} />
                    </div>
                    <div className={view === 'grid' ? 'p-3' : 'min-w-0 flex-1 pt-1'}>
                      <h3 className="truncate text-sm font-medium leading-snug">{a.title}</h3>
                      <p className="mt-1 font-bold text-[#1B7F7A]">
                        {formatSARFromRiyalInteger(Math.round(Number(a.current_bid)))}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{a.city || 'غير محدد'}</span>
                        <span
                          className={
                            parts.ended ? 'rounded-md bg-red-50 px-2 py-0.5 font-semibold text-red-600' : ''
                          }
                        >
                          {label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{a.bid_count} مزايدة</p>
                    </div>
                  </Link>
                )
              })}
            </div>
            {hasMore && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadMore()}
                className="w-full py-3 mt-3 rounded-2xl bg-white border border-gray-200 text-[#1B7F7A] font-bold text-sm shadow-sm disabled:opacity-50"
              >
                {loading ? 'جاري التحميل...' : 'عرض المزيد'}
              </button>
            )}
          </>
        )}
      </div>

      <BottomNav active="search" />
    </div>
  )
}
