'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { QabbooLogo } from '@/components/QabbooLogo'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devMode, setDevMode] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const fullPhone = '+966' + phone.replace(/^0/, '')
  const otp = otpDigits.join('')

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
      setOtpDigits(['', '', '', '', '', ''])
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

  const setOtpDigit = (index: number, value: string) => {
    const d = value.replace(/\D/g, '').slice(-1)
    setOtpDigits((prev) => {
      const next = [...prev]
      next[index] = d
      return next
    })
    if (d && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace') return
    if (otpDigits[index]) {
      e.preventDefault()
      setOtpDigits((prev) => {
        const next = [...prev]
        next[index] = ''
        return next
      })
    } else if (index > 0) {
      e.preventDefault()
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = ['', '', '', '', '', ''] as string[]
    for (let i = 0; i < text.length; i++) next[i] = text[i] ?? ''
    setOtpDigits(next)
    const focusIdx = Math.min(text.length, 5)
    otpRefs.current[focusIdx]?.focus()
  }

  useEffect(() => {
    if (step !== 'otp') return
    const t = window.setTimeout(() => otpRefs.current[0]?.focus(), 200)
    return () => window.clearTimeout(t)
  }, [step])

  const otpChars = otpDigits

  return (
    <div className="flex min-h-screen flex-col bg-[#156661]" dir="rtl">
      <div className="relative flex min-h-[40vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1B7F7A] to-[#156661] px-4 pb-8 pt-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 top-10 h-48 w-48 rounded-full bg-white/[0.08]" />
          <div className="absolute -left-20 bottom-4 h-64 w-64 rounded-full bg-white/[0.05]" />
          <div className="absolute left-1/3 top-1/4 h-24 w-24 rounded-full bg-white/[0.06]" />
        </div>
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="relative z-[1]"
        >
          <QabbooLogo variant="login" />
        </motion.div>
        <p className="relative z-[1] mt-4 text-sm text-white/80">كنوزك عندنا...</p>
      </div>

      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.08 }}
        className="-mt-8 flex-1 rounded-t-[2rem] bg-white px-5 pb-10 pt-8 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] dark:bg-slate-900"
      >
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                رقم الجوال
              </label>
              <div className="flex gap-2">
                <span className="flex h-12 shrink-0 items-center rounded-lg bg-[#E6F4F3] px-3 text-sm font-semibold text-[#1B7F7A]">
                  966+
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="5xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="h-12 min-w-0 flex-1 rounded-xl border-2 border-gray-200 px-4 outline-none transition-colors focus:border-[#1B7F7A] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  maxLength={9}
                  autoComplete="tel-national"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSendOtp()}
                disabled={phone.length < 9 || loading}
                className="h-12 w-full rounded-xl bg-[#FF8C42] text-base font-bold text-white transition-transform hover:bg-[#E87A35] active:scale-95 disabled:opacity-50"
              >
                {loading ? 'جاري الارسال...' : 'ارسال رمز التحقق'}
              </button>
              <div className="mt-6 border-t border-gray-100 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDevMode(!devMode)}
                  className="w-full text-center text-[11px] text-gray-300 hover:text-gray-400"
                >
                  وضع التطوير
                </button>
                {devMode && (
                  <button
                    type="button"
                    onClick={() => void handleDevLogin()}
                    disabled={phone.length < 9 || loading}
                    className="mt-2 h-11 w-full rounded-xl bg-gray-800 text-sm font-medium text-white disabled:opacity-50"
                  >
                    دخول مباشر (تطوير فقط)
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                رمز التحقق
              </label>
              <div className="flex flex-row-reverse justify-center gap-2" dir="ltr">
                {otpChars.map((ch, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={ch}
                    onChange={(e) => setOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className="h-14 w-12 rounded-xl border-2 border-gray-200 text-center text-2xl font-bold outline-none transition-colors focus:border-[#1B7F7A] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleVerify()}
                disabled={otp.length < 6 || loading}
                className="h-12 w-full rounded-xl bg-[#1B7F7A] text-base font-bold text-white transition-transform hover:bg-[#156661] active:scale-95 disabled:opacity-50"
              >
                {loading ? 'جاري التحقق...' : 'تحقق'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone')
                  setOtpDigits(['', '', '', '', '', ''])
                  setError('')
                }}
                className="w-full text-sm text-gray-500 hover:text-[#1B7F7A]"
              >
                تغيير الرقم
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
