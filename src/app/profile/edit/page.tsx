'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SAUDI_CITIES } from '@/lib/constants'

const AVATARS = ['👤', '🙂', '😎', '🧑‍💼', '👩‍💼', '🦁', '🦊', '🐼']

export default function ProfileEditPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ user_id: string; phone: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('👤')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      window.location.href = '/auth/login'
      return
    }
    const u = JSON.parse(stored)
    setUser(u)
    fetch('/api/profile?user_id=' + u.user_id)
      .then((r) => r.json())
      .then((p) => {
        setFullName(p.full_name || '')
        setCity(p.city || '')
        setBio(p.bio || '')
        const av = p.avatar_url
        if (av && AVATARS.includes(av)) setAvatar(av)
        else if (av?.length && av.length <= 4) setAvatar(av)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          full_name: fullName,
          city,
          bio,
          avatar_url: avatar,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ')
      router.push('/profile')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8" dir="rtl">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/profile" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          →
        </Link>
        <h1 className="font-bold text-lg">تعديل الملف الشخصي</h1>
      </div>

      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">الصورة الرمزية</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={
                  'w-12 h-12 rounded-xl text-2xl flex items-center justify-center border-2 ' +
                  (avatar === a ? 'border-amber-500 bg-amber-50' : 'border-gray-100 bg-gray-50')
                }
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="">اختر المدينة</option>
            {SAUDI_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">نبذة عنك</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            placeholder="اكتب نبذة قصيرة..."
          />
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !fullName.trim()}
          className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  )
}
