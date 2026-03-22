'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { ReviewsList } from '@/components/ReviewsList'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      window.location.href = '/auth/login'
      return
    }
    const u = JSON.parse(stored)
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
        <div className="h-40 bg-amber-200 animate-pulse rounded-b-3xl" />
        <div className="px-4 -mt-16 space-y-3">
          <div className="h-28 bg-white rounded-2xl shadow animate-pulse" />
          <div className="h-40 bg-white rounded-2xl shadow animate-pulse" />
        </div>
      </div>
    )
  }

  const p = profile || {}
  const avatar = p.avatar_url && String(p.avatar_url).length <= 4 ? p.avatar_url : '👤'

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="bg-amber-500 pt-8 pb-16 px-4 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white font-bold text-lg">حسابي</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="text-white text-sm bg-white/20 px-3 py-1.5 rounded-lg font-medium"
            >
              تعديل
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-white text-sm bg-white/20 px-3 py-1.5 rounded-lg"
            >
              خروج
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl shadow-lg border-2 border-amber-100">
            {avatar}
          </div>
          <div className="text-white min-w-0">
            <h2 className="text-xl font-bold truncate">
              {(p.full_name && String(p.full_name).trim()) || 'مستخدم جديد'}
            </h2>
            <p className="text-amber-100 text-sm">{user?.phone || ''}</p>
            <p className="text-amber-100 text-sm">{p.city ? '📍 ' + p.city : ''}</p>
          </div>
        </div>
      </div>
      <div className="px-4 -mt-10">
        <div className="bg-white rounded-2xl shadow-md p-4 grid grid-cols-4 gap-2 text-center border border-gray-100">
          <div>
            <p className="text-xl font-bold text-amber-600">
              {p.rating != null ? Number(p.rating).toFixed(1) : '—'}
            </p>
            <p className="text-xs text-gray-500">
              التقييم{p.total_reviews != null ? ` (${p.total_reviews})` : ''}
            </p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-600">{p.total_sales ?? 0}</p>
            <p className="text-xs text-gray-500">مبيعات</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-600">{p.total_purchases ?? 0}</p>
            <p className="text-xs text-gray-500">مشتريات</p>
          </div>
          <Link
            href="/wallet"
            className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-h-0 py-0.5"
          >
            <p className="text-xl font-bold text-green-600">
              {(p.wallet_balance ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">المحفظة ←</p>
          </Link>
        </div>
      </div>
      <div className="mt-4 px-4">
        <h3 className="font-bold text-gray-900 text-sm mb-2">آراء المشترين</h3>
        <ReviewsList userId={user?.user_id ?? ''} />
      </div>
      <div className="mt-4 px-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="grid grid-cols-2 gap-3 p-3">
            <Link
              href="/create"
              className="flex items-center gap-3 bg-amber-50 rounded-xl p-3 border border-amber-100"
            >
              <span className="text-2xl">➕</span>
              <span className="font-medium text-sm">إعلان جديد</span>
            </Link>
            <Link
              href="/orders"
              className="flex items-center gap-3 bg-green-50 rounded-xl p-3 border border-green-100"
            >
              <span className="text-2xl">📦</span>
              <span className="font-medium text-sm">مزاداتي</span>
            </Link>
            <Link
              href="/favorites"
              className="flex items-center gap-3 bg-red-50 rounded-xl p-3 border border-red-100"
            >
              <span className="text-2xl">❤️</span>
              <span className="font-medium text-sm">المفضلة</span>
            </Link>
            <Link
              href="/messages"
              className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 border border-blue-100"
            >
              <span className="text-2xl">💬</span>
              <span className="font-medium text-sm">الرسائل</span>
            </Link>
            <Link
              href="/wallet"
              className="col-span-2 flex items-center justify-center gap-2 bg-emerald-50 rounded-xl p-3 border border-emerald-100"
            >
              <span className="text-2xl">💰</span>
              <span className="font-medium text-sm">المحفظة والمعاملات</span>
            </Link>
          </div>
        </div>
      </div>
      <BottomNav active="profile" />
    </div>
  )
}
