'use client'

import { Camera, Star } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuctionCard, type AuctionCardAuction } from '@/components/auction/AuctionCard'
import { BottomNav } from '@/components/BottomNav'
import { BadgeDisplay, type UserBadge } from '@/components/gamification/BadgeDisplay'
import { XPBar } from '@/components/gamification/XPBar'
import { ReviewsList } from '@/components/ReviewsList'
import { EmptyState } from '@/components/ui/EmptyState'
import { readQaboUserFromStorage, type QaboUserLocal } from '@/lib/qabo-user'
import { formatSAR } from '@/lib/utils/currency'

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  rating: number
  total_reviews: number
  auctions_count: number
  wins_count: number
  is_verified: boolean
  xp_points?: number
  level?: string
  created_at: string
  wallet_balance?: number
}

type TabKey = 'auctions' | 'purchases' | 'reviews' | 'wallet'

type OrderRow = {
  id: string
  status: string
  buyer_id: string
  auction?: { title?: string } | null
}

function mapProfile(raw: Record<string, unknown>, user: QaboUserLocal): UserProfile {
  const created =
    typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString()
  return {
    id: String(raw.id ?? user.user_id),
    name: String(raw.full_name ?? user.name ?? 'مستخدم').trim() || 'مستخدم',
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? user.phone ?? ''),
    avatar_url: raw.avatar_url != null ? String(raw.avatar_url) : undefined,
    rating: raw.rating != null ? Number(raw.rating) : 0,
    total_reviews: raw.total_reviews != null ? Number(raw.total_reviews) : 0,
    auctions_count: 0,
    wins_count: raw.total_purchases != null ? Number(raw.total_purchases) : 0,
    is_verified: Boolean(raw.is_verified),
    wallet_balance: raw.wallet_balance != null ? Number(raw.wallet_balance) : 0,
    created_at: created,
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<QaboUserLocal | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tab, setTab] = useState<TabKey>('auctions')
  const [xp, setXp] = useState(0)
  const [myAuctions, setMyAuctions] = useState<AuctionCardAuction[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    try {
      const [pr, auc, ord, lb] = await Promise.all([
        fetch('/api/profile?user_id=' + encodeURIComponent(uid)).then((r) => r.json()),
        fetch('/api/auctions?seller_id=' + encodeURIComponent(uid)).then((r) => r.json()),
        fetch('/api/orders?user_id=' + encodeURIComponent(uid)).then((r) => r.json()),
        fetch('/api/leaderboard?user_id=' + encodeURIComponent(uid)).then((r) => r.json()),
      ])
      const p = mapProfile(pr && !pr.error ? pr : { id: uid }, { user_id: uid, phone: '' })
      const auctions = Array.isArray(auc) ? auc : []
      p.auctions_count = auctions.length
      setProfile(p)
      setMyAuctions(
        auctions.map((a: Record<string, unknown>) => ({
          id: String(a.id),
          title: String(a.title ?? ''),
          current_bid: Number(a.current_bid ?? 0),
          bid_count: Number(a.bid_count ?? 0),
          ends_at: String(a.ends_at ?? new Date().toISOString()),
          status: String(a.status ?? 'active'),
          images: a.images,
          city: a.city != null ? String(a.city) : null,
        }))
      )
      setOrders(Array.isArray(ord) ? ord : [])
      if (lb?.viewer_bidder?.xp != null) setXp(Number(lb.viewer_bidder.xp))
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent('/profile')
      return
    }
    setUser(u)
    void load(u.user_id)
  }, [load])

  const badges: UserBadge[] = useMemo(() => {
    const b: UserBadge[] = []
    if (!profile) return b
    if (profile.is_verified) b.push({ id: 'verified', name: '', icon: '', description: '', earned_at: 'موثّق' })
    if (profile.wins_count >= 1) b.push({ id: 'first_win', name: '', icon: '', description: '', earned_at: 'مكتسب' })
    if (profile.total_reviews >= 5 && profile.rating >= 4.5) {
      b.push({ id: 'trusted_seller', name: '', icon: '', description: '', earned_at: 'مكتسب' })
    }
    return b
  }, [profile])

  const purchases = useMemo(
    () => orders.filter((o) => o.buyer_id === user?.user_id),
    [orders, user?.user_id]
  )

  if (loading || !profile || !user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 dark:bg-slate-900" dir="rtl">
        <div className="h-40 animate-pulse rounded-b-3xl bg-[#1B7F7A]/30" />
        <div className="-mt-16 space-y-3 px-4">
          <div className="h-28 animate-pulse rounded-2xl bg-white shadow dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  const shortEmoji = profile.avatar_url && profile.avatar_url.length <= 4
  const avatarHttp =
    !shortEmoji && profile.avatar_url?.startsWith('http') ? profile.avatar_url : null
  const displayName = profile.name

  const tabBtn = (k: TabKey, label: string) => (
    <button
      type="button"
      onClick={() => setTab(k)}
      className={
        'min-h-[44px] shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F7A] ' +
        (tab === k ? 'bg-[#1B7F7A] text-white' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200')
      }
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-slate-900" dir="rtl">
      <div className="rounded-b-3xl bg-gradient-to-br from-[#1B7F7A] to-[#156661] px-4 pt-8 pb-20 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">حسابي</h1>
          <div className="flex gap-2">
            <Link
              href="/profile/edit"
              className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white"
            >
              تعديل
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('qabo_user')
                window.location.href = '/auth/login'
              }}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white"
            >
              خروج
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[#E6F4F3] bg-white shadow-lg">
              {shortEmoji ? (
                <span className="text-4xl">{profile.avatar_url}</span>
              ) : avatarHttp ? (
                <Image
                  src={avatarHttp}
                  alt={`صورة ${displayName}`}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl text-[#1B7F7A]">👤</span>
              )}
            </div>
            <Link
              href="/profile/edit"
              className="absolute bottom-0 end-0 flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#FF8C42] text-white shadow-md"
              aria-label="تغيير الصورة"
            >
              <Camera className="h-4 w-4" weight="bold" />
            </Link>
          </div>
          <h2 className="mt-3 text-xl font-bold text-white">{displayName}</h2>
          <div className="mt-2 flex items-center justify-center gap-1 text-amber-200">
            <Star className="h-5 w-5" weight="fill" />
            <span className="font-bold">{profile.rating.toFixed(1)}</span>
            <span className="text-sm text-white/80">({profile.total_reviews} تقييم)</span>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {profile.is_verified ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">✓ موثق</span>
            ) : null}
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">⭐ بائع نشط</span>
            {profile.level ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">{profile.level}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="-mt-12 space-y-4 px-4">
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-md dark:border-slate-700 dark:bg-slate-800">
          <div>
            <p className="text-lg font-bold text-[#1B7F7A] dark:text-teal-300">{profile.auctions_count}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">مزادات</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1B7F7A] dark:text-teal-300">{profile.wins_count}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">فوز</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1B7F7A] dark:text-teal-300">{profile.rating.toFixed(1)}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">تقييم</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#1B7F7A] dark:text-teal-300">
              {new Date(profile.created_at).getFullYear()}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">عضو منذ</p>
          </div>
        </div>

        <XPBar xp={xp} />

        <div>
          <h3 className="mb-2 text-sm font-bold text-gray-900 dark:text-slate-100">الشارات</h3>
          <BadgeDisplay badges={badges} />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {tabBtn('auctions', 'مزاداتي')}
          {tabBtn('purchases', 'مشترياتي')}
          {tabBtn('reviews', 'تقييماتي')}
          {tabBtn('wallet', 'المحفظة')}
        </div>

        {tab === 'auctions' ? (
          myAuctions.length === 0 ? (
            <EmptyState
              icon={<span className="text-4xl">📦</span>}
              title="لم تنشئ أي مزاد بعد"
              description="ابدأ ببيع أول قطعة على قبو."
              action={{ label: 'أنشئ مزادك الأول', href: '/create' }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myAuctions.map((a) => (
                <AuctionCard key={a.id} auction={a} userId={user.user_id} />
              ))}
            </div>
          )
        ) : null}

        {tab === 'purchases' ? (
          purchases.length === 0 ? (
            <EmptyState
              icon={<span className="text-4xl">🏆</span>}
              title="لم تفز بأي مزاد بعد"
              description="تصفح المزادات النشطة وزايد."
              action={{ label: 'تصفح المزادات', href: '/' }}
            />
          ) : (
            <ul className="space-y-2">
              {purchases.map((o) => (
                <li key={o.id}>
                  <Link
                    href={'/orders/' + o.id}
                    className="block rounded-xl border border-gray-100 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <p className="font-bold">{o.auction?.title ?? 'صفقة'}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{o.status}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === 'reviews' ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <ReviewsList userId={user.user_id} />
          </div>
        ) : null}

        {tab === 'wallet' ? (
          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-gray-600 dark:text-slate-400">الرصيد المتاح</p>
            <p className="text-2xl font-extrabold text-[#1B7F7A] dark:text-teal-300">
              {formatSAR(profile.wallet_balance ?? 0, false)}
            </p>
            <Link
              href="/wallet"
              className="inline-block min-h-[44px] rounded-xl bg-[#FF8C42] px-4 py-3 text-sm font-bold text-white"
            >
              فتح المحفظة الكاملة
            </Link>
          </div>
        ) : null}
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
