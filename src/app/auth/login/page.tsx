'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devMode, setDevMode] = useState(false)

  const fullPhone = '+966' + phone.replace(/^0/, '')

  const handleSendOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')
      setStep('otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code: otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')
      localStorage.setItem(
        'qabo_user',
        JSON.stringify({ user_id: data.user_id, phone: data.phone })
      )
      window.location.href = '/'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleDevLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')
      localStorage.setItem(
        'qabo_user',
        JSON.stringify({ user_id: data.user_id, phone: data.phone })
      )
      window.location.href = '/'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white p-4"
      dir="rtl"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-500 mb-2">قبو</h1>
          <p className="text-gray-500 text-sm">منصة المزادات الذكية</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}
        {step === 'phone' ? (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">رقم الجوال</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-gray-100 rounded-lg text-sm shrink-0">
                966+
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="5xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="flex-1 min-w-0 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                maxLength={9}
                autoComplete="tel-national"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={phone.length < 9 || loading}
              className="w-full py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? 'جاري الارسال...' : 'ارسال رمز التحقق'}
            </button>
            <div className="border-t border-gray-100 pt-3 mt-3">
              <button
                type="button"
                onClick={() => setDevMode(!devMode)}
                className="text-xs text-gray-400 w-full text-center"
              >
                وضع التطوير
              </button>
              {devMode && (
                <button
                  type="button"
                  onClick={() => void handleDevLogin()}
                  disabled={phone.length < 9 || loading}
                  className="w-full py-3 mt-2 bg-gray-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                >
                  دخول مباشر (تطوير فقط)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">رمز التحقق</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-[0.35em] focus:ring-2 focus:ring-amber-500 outline-none"
              maxLength={6}
              autoComplete="one-time-code"
            />
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={otp.length < 6 || loading}
              className="w-full py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'تحقق'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setOtp('')
                setError('')
              }}
              className="w-full text-sm text-gray-500 hover:text-amber-500"
            >
              تغيير الرقم
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
