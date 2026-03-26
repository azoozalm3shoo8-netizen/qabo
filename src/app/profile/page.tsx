'use client'

import {
  CaretLeft,
  ChatCircle,
  Heart,
  MapPin,
  Package,
  Plus,
  UserCircle,
  Wallet,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { readQaboUserFromStorage, type QaboUserLocal } from '@/lib/qabo-user'
import { ReviewsList } from '@/components/ReviewsList'

export default function ProfilePage() {
  const [user, setUser] = useState<QaboUserLocal | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login'
      return
    }
    setUser(u)
    fetch('/api/profile?user_id=' + encodeURIComponent(u.user_id))
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) {
          setProfile({
            id: u.user_id,
            full_name: null,
            phone: u.phone ?? null,
            city: null,
            wallet_balance: 0,
            total_sales: 0,
            total_purchases: 0,
            rating: null,
            total_reviews: 0,
          })
          return
        }
        setProfile(data)
      })
      .catch(() =>
        setProfile({
          id: u.user_id,
          full_name: null,
          phone: u.phone ?? null,
          city: null,
          wallet_balance: 0,
          total_sales: 0,
          total_purchases: 0,
          rating: null,
          total_reviews: 0,
        })
      )
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('qabo_user')
    window.location.href = '/auth/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
        <div className="h-40 animate-pulse rounded-b-3xl bg-[#1B7F7A]/30" />
        <div className="-mt-16 space-y-3 px-4">
          <div className="h-28 animate-pulse rounded-2xl bg-white shadow" />
          <div className="h-40 animate-pulse rounded-2xl bg-white shadow" />
        </div>
      </div>
    )
  }

  const p = profile || {}
  const shortEmojiAvatar = p.avatar_url && String(p.avatar_url).length <= 4
  const avatarUrl =
    !shortEmojiAvatar && p.avatar_url && String(p.avatar_url).startsWith('http')
      ? String(p.avatar_url)
      : null

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="rounded-b-3xl bg-gradient-to-br from-[#1B7F7A] to-[#156661] px-4 pt-8 pb-16 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">حسابي</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
            >
              تعديل
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur-sm"
            >
              خروج
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[#E6F4F3] bg-white shadow-lg">
            {shortEmojiAvatar ? (
              <span className="text-3xl">{String(p.avatar_url)}</span>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-12 w-12 text-[#1B7F7A]" weight="fill" />
            )}
          </div>
          <div className="min-w-0 text-white">
            <h2 className="truncate text-xl font-bold">
              {(p.full_name && String(p.full_name).trim()) || 'مستخدم جديد'}
            </h2>
            <p className="text-sm text-white/70">{user?.phone || ''}</p>
            {p.city ? (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-white/70">
                <MapPin className="h-4 w-4 shrink-0" weight="bold" />
                {p.city}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="-mt-10 px-4">
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-[#1B7F7A]/10 bg-white p-4 text-center shadow-md">
          <div>
            <p className="text-xl font-bold text-[#1B7F7A]">
              {p.rating != null ? Number(p.rating).toFixed(1) : '—'}
            </p>
            <p className="text-xs text-gray-500">
              التقييم{p.total_reviews != null ? ` (${p.total_reviews})` : ''}
            </p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#1B7F7A]">{p.total_sales ?? 0}</p>
            <p className="text-xs text-gray-500">مبيعات</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#1B7F7A]">{p.total_purchases ?? 0}</p>
            <p className="text-xs text-gray-500">مشتريات</p>
          </div>
          <Link
            href="/wallet"
            className="block min-h-0 rounded-lg py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F7A]"
          >
            <p className="text-xl font-bold text-[#10B981]">
              {(p.wallet_balance ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">المحفظة ←</p>
          </Link>
        </div>
      </div>
      <div className="mt-4 px-4">
        <h3 className="mb-2 text-sm font-bold text-gray-900">آراء المشترين</h3>
        <ReviewsList userId={user?.user_id ?? ''} />
      </div>
      <div className="mt-4 px-4">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="grid grid-cols-2 gap-3 p-3">
            <Link
              href="/create"
              className="flex items-center gap-3 rounded-xl border border-[#1B7F7A]/20 bg-[#E6F4F3] p-3 transition-transform hover:scale-[1.02]"
            >
              <Plus className="h-7 w-7 shrink-0 text-[#1B7F7A]" weight="bold" />
              <span className="text-sm font-medium">إعلان جديد</span>
            </Link>
            <Link
              href="/my-auctions"
              className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-3 transition-transform hover:scale-[1.02]"
            >
              <Package className="h-7 w-7 shrink-0 text-green-700" weight="fill" />
              <span className="text-sm font-medium">مزاداتي</span>
            </Link>
            <Link
              href="/favorites"
              className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3 transition-transform hover:scale-[1.02]"
            >
              <Heart className="h-7 w-7 shrink-0 text-red-500" weight="fill" />
              <span className="text-sm font-medium">المفضلة</span>
            </Link>
            <Link
              href="/messages"
              className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 transition-transform hover:scale-[1.02]"
            >
              <ChatCircle className="h-7 w-7 shrink-0 text-blue-600" weight="fill" />
              <span className="text-sm font-medium">الرسائل</span>
            </Link>
            <Link
              href="/wallet"
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 transition-transform hover:scale-[1.02]"
            >
              <Wallet className="h-7 w-7 shrink-0 text-emerald-700" weight="fill" />
              <span className="text-sm font-medium">المحفظة والمعاملات</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="mb-4 mt-4 px-4">
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <Link
            href="/terms"
            className="flex items-center justify-between text-sm text-gray-700 hover:text-[#1B7F7A]"
          >
            <span>الشروط والأحكام</span>
            <CaretLeft className="h-4 w-4 text-gray-400" weight="bold" />
          </Link>
          <div className="border-t border-gray-100" />
          <Link
            href="/privacy"
            className="flex items-center justify-between text-sm text-gray-700 hover:text-[#1B7F7A]"
          >
            <span>سياسة الخصوصية</span>
            <CaretLeft className="h-4 w-4 text-gray-400" weight="bold" />
          </Link>
        </div>
      </div>
      <BottomNav active="profile" />
    </div>
  )
}
