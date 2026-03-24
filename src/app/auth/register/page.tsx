'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SAUDI_CITIES } from '@/lib/constants'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devMode, setDevMode] = useState(false)

  const fullPhone = '+966' + phone.replace(/^0/, '')

  const sendOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال')
      setStep('otp')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code: otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'رمز خاطئ')
      setUserId(data.user_id as string)
      localStorage.setItem(
        'qabo_user',
        JSON.stringify({ user_id: data.user_id, phone: data.phone || fullPhone })
      )
      setStep('profile')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const devRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل')
      setUserId(data.user_id)
      localStorage.setItem(
        'qabo_user',
        JSON.stringify({ user_id: data.user_id, phone: data.phone || fullPhone })
      )
      setStep('profile')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  const completeProfile = async () => {
    if (!fullName.trim() || !city) {
      setError('أكمل الاسم والمدينة')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          full_name: fullName.trim(),
          city,
          phone: fullPhone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الملف')
      router.push('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#E6F4F3] to-white p-4"
      dir="rtl"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[#1B7F7A] mb-2">قبو</h1>
          <p className="text-gray-500 text-sm">إنشاء حساب جديد</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4">{error}</div>
        )}

        {step === 'phone' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">رقم الجوال</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-gray-100 rounded-xl text-sm">966+</span>
              <input
                type="tel"
                placeholder="5xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B7F7A] outline-none"
                maxLength={9}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                className="accent-[#1B7F7A]"
              />
              وضع التطوير (بدون OTP)
            </label>
            <button
              type="button"
              onClick={() => (devMode ? void devRegister() : void sendOtp())}
              disabled={phone.length < 9 || loading}
              className="w-full py-3 bg-[#1B7F7A] text-white rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? 'جاري...' : devMode ? 'متابعة' : 'إرسال رمز التحقق'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">رمز التحقق</label>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-widest focus:ring-2 focus:ring-[#1B7F7A] outline-none"
              maxLength={6}
            />
            <button
              type="button"
              onClick={() => void verifyOtp()}
              disabled={otp.length < 4 || loading}
              className="w-full py-3 bg-[#1B7F7A] text-white rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'تأكيد'}
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-sm text-gray-500"
            >
              تغيير الرقم
            </button>
          </div>
        )}

        {step === 'profile' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">أكمل بياناتك</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B7F7A] outline-none"
                placeholder="الاسم كما يظهر للآخرين"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1B7F7A] outline-none"
              >
                <option value="">اختر المدينة</option>
                {SAUDI_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void completeProfile()}
              disabled={loading}
              className="w-full py-3 bg-[#1B7F7A] text-white rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'إنهاء التسجيل'}
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          لديك حساب؟{' '}
          <Link href="/auth/login" className="text-[#1B7F7A] font-medium hover:underline">
            سجل دخول
          </Link>
        </p>
      </div>
    </div>
  )
}
