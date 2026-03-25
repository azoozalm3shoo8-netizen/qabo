'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { QabbooLogo } from '@/components/QabbooLogo'

const RESEND_SECONDS = 60
const OTP_LENGTH = 8

const emptyOtpDigits = () => Array.from({ length: OTP_LENGTH }, () => '')

function ConfettiBurst() {
  const pieces = Array.from({ length: 40 }, (_, i) => i)
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <motion.span
          key={i}
          className="absolute top-[10%] h-3 w-2 rounded-sm shadow-sm"
          style={{
            left: `${(i * 2.7) % 98}%`,
            backgroundColor: i % 3 === 0 ? '#FF8C42' : i % 3 === 1 ? '#1B7F7A' : '#ffffff',
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: typeof window !== 'undefined' ? window.innerHeight * 0.92 : 720,
            opacity: 0,
            rotate: 260 + (i % 9) * 35,
            x: ((i % 5) - 2) * 50,
          }}
          transition={{ duration: 2.2, delay: i * 0.03, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(() => emptyOtpDigits())
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devMode, setDevMode] = useState(false)
  const [resendLeft, setResendLeft] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const otp = otpDigits.join('')

  useEffect(() => {
    if (step !== 'otp' || resendLeft <= 0) return
    const t = window.setInterval(() => {
      setResendLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [step, resendLeft])

  useEffect(() => {
    if (step !== 'otp') return
    const t = window.setTimeout(() => otpRefs.current[0]?.focus(), 200)
    return () => window.clearTimeout(t)
  }, [step])

  useEffect(() => {
    if (step !== 'success') return
    const t = window.setTimeout(() => {
      router.replace('/')
    }, 2000)
    return () => window.clearTimeout(t)
  }, [step, router])

  const handleSendOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/email-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'تعذر إرسال الرمز')
      setOtpDigits(emptyOtpDigits())
      setStep('otp')
      setResendLeft(RESEND_SECONDS)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendLeft > 0 || loading) return
    await handleSendOtp()
  }

  const handleVerify = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/email-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token: otp }),
      })

      if (!res.ok) {
        try {
          await res.json()
        } catch {
          /* الاستجابة ليست JSON */
        }
        setError('حدث خطأ، حاول مرة أخرى')
        return
      }

      let data: {
        success?: boolean
        error?: string
        user?: { user_id: string; email: string; name: string }
      }
      try {
        data = (await res.json()) as typeof data
      } catch {
        setError('حدث خطأ، حاول مرة أخرى')
        return
      }

      if (!data.success || !data.user) {
        setError('حدث خطأ، حاول مرة أخرى')
        return
      }

      localStorage.setItem(
        'qabo_user',
        JSON.stringify({
          user_id: data.user.user_id,
          email: data.user.email,
          name: data.user.name,
        })
      )
      setStep('success')
    } catch {
      setError('حدث خطأ، حاول مرة أخرى')
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
        body: JSON.stringify({ phone: '+966500000000' }),
      })
      const data = (await res.json()) as { error?: string; user_id?: string; phone?: string }
      if (!res.ok) throw new Error(data.error || 'فشل وضع التطوير')
      localStorage.setItem(
        'qabo_user',
        JSON.stringify({
          user_id: data.user_id,
          phone: data.phone ?? '+966500000000',
        })
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
    if (d && index < OTP_LENGTH - 1) {
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
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    const next = emptyOtpDigits()
    for (let i = 0; i < text.length; i++) next[i] = text[i] ?? ''
    setOtpDigits(next)
    const focusIdx = Math.min(text.length, OTP_LENGTH - 1)
    otpRefs.current[focusIdx]?.focus()
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  return (
    <div className="flex min-h-screen flex-col bg-[#156661]" dir="rtl">
      <div className="relative flex min-h-[42vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1B7F7A] to-[#156661] px-4 pb-10 pt-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 top-10 h-48 w-48 rounded-full bg-white/[0.08]" />
          <div className="absolute -left-20 bottom-4 h-64 w-64 rounded-full bg-white/[0.05]" />
        </div>
        <motion.div
          initial={{ y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="relative z-[1]"
        >
          <QabbooLogo variant="login" />
        </motion.div>
        <p className="relative z-[1] mt-4 text-sm text-white/85">كنوزك عندنا...</p>
      </div>

      <motion.div
        initial={{ y: 72, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.06 }}
        className="-mt-10 flex-1 rounded-t-[2rem] bg-white px-5 pb-10 pt-8 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] dark:bg-slate-900"
      >
        {step === 'success' && <ConfettiBurst />}

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
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="أدخل بريدك الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 outline-none transition-colors focus:border-[#1B7F7A] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => void handleSendOtp()}
                disabled={!emailValid || loading}
                className="h-12 w-full rounded-xl bg-[#FF8C42] text-base font-bold text-white transition-transform hover:bg-[#E87A35] active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جاري الإرسال...
                  </span>
                ) : (
                  'إرسال رمز التحقق'
                )}
              </button>

              <div className="mt-6 border-t border-gray-100 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDevMode(!devMode)}
                  className="w-full text-center text-[11px] text-gray-400 hover:text-gray-500"
                >
                  وضع التطوير
                </button>
                {devMode && (
                  <button
                    type="button"
                    onClick={() => void handleDevLogin()}
                    disabled={loading}
                    className="mt-2 h-11 w-full rounded-xl bg-gray-800 text-sm font-medium text-white disabled:opacity-50"
                  >
                    دخول مباشر (تطوير فقط)
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-center text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                تم إرسال رمز التحقق إلى{' '}
                <span className="font-bold text-gray-900 dark:text-white">{email.trim()}</span>
              </p>
              <div className="flex flex-row-reverse justify-center gap-2" dir="ltr">
                {otpDigits.map((ch, i) => (
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
                disabled={otp.length < OTP_LENGTH || loading}
                className="h-12 w-full rounded-xl bg-[#1B7F7A] text-base font-bold text-white transition-transform hover:bg-[#156661] active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جاري التحقق...
                  </span>
                ) : (
                  'تحقق'
                )}
              </button>
              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={resendLeft > 0 || loading}
                  onClick={() => void handleResend()}
                  className="text-[#1B7F7A] font-semibold disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendLeft > 0 ? `إعادة الإرسال (${resendLeft})` : 'إعادة الإرسال'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setOtpDigits(emptyOtpDigits())
                    setError('')
                  }}
                  className="text-gray-500 hover:text-[#1B7F7A]"
                >
                  تغيير البريد
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-10 text-center space-y-4"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E6F4F3] text-4xl">
                ✓
              </div>
              <h2 className="text-xl font-extrabold text-[#1B7F7A]">مرحباً بك في قبو!</h2>
              <p className="text-sm text-gray-600">سيتم تحويلك للرئيسية خلال لحظات...</p>
              <Link href="/" className="inline-block text-sm font-bold text-[#FF8C42]">
                الانتقال الآن
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
