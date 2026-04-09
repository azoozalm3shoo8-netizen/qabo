'use client'

import { Check } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import {
  DEFAULT_AUCTION_DRAFT,
  DRAFT_STORAGE_KEY,
  type AuctionDraftFormData,
} from '@/components/create/auction-draft-types'
import { StepDetails } from '@/components/create/StepDetails'
import { StepPhotos } from '@/components/create/StepPhotos'
import { StepPricing } from '@/components/create/StepPricing'
import { StepReview } from '@/components/create/StepReview'
import { readQaboUserFromStorage, type QaboUserLocal } from '@/lib/qabo-user'

const STEPS = [
  { i: 0, label: 'الصور', icon: '📸' },
  { i: 1, label: 'التفاصيل', icon: '📝' },
  { i: 2, label: 'التسعير', icon: '💰' },
  { i: 3, label: 'مراجعة', icon: '✅' },
] as const

function loadDraft(): AuctionDraftFormData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<AuctionDraftFormData>
    return { ...DEFAULT_AUCTION_DRAFT, ...p, imageUrls: p.imageUrls ?? [], imagePaths: p.imagePaths ?? [] }
  } catch {
    return null
  }
}

export function CreateAuctionWizard({ user }: { user: QaboUserLocal }) {
  const clientAuctionId = useMemo(() => crypto.randomUUID(), [])
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<AuctionDraftFormData>(DEFAULT_AUCTION_DRAFT)
  const [draftPrompted, setDraftPrompted] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [detailErrors, setDetailErrors] = useState<
    Partial<Record<'title' | 'category' | 'condition' | 'description', string>>
  >({})
  const [pricingErrors, setPricingErrors] = useState<
    Partial<Record<'startPrice' | 'duration' | 'delivery' | 'buyNow' | 'city', string>>
  >({})

  const formRef = useRef(formData)
  formRef.current = formData

  useEffect(() => {
    if (draftPrompted) return
    setDraftPrompted(true)
    const d = loadDraft()
    if (d && window.confirm('لديك مسودة محفوظة — هل تريد المتابعة؟')) {
      setFormData(d)
    }
  }, [draftPrompted])

  useEffect(() => {
    const t = window.setInterval(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formRef.current))
      } catch {
        /* ignore */
      }
    }, 5000)
    return () => window.clearInterval(t)
  }, [])

  const validatePhotos = useCallback(() => {
    if (formData.imageUrls.length < 1) {
      setPhotoError('أضف صورة واحدة على الأقل')
      return false
    }
    setPhotoError('')
    return true
  }, [formData.imageUrls.length])

  const validateDetails = useCallback(() => {
    const e: typeof detailErrors = {}
    if (formData.title.trim().length < 10) e.title = 'العنوان مطلوب (10 أحرف على الأقل)'
    if (!formData.category.trim()) e.category = 'اختر الفئة'
    if (!formData.condition) e.condition = 'اختر الحالة'
    if (formData.description.trim().length < 30) e.description = 'الوصف مطلوب (30 حرفاً على الأقل)'
    setDetailErrors(e)
    return Object.keys(e).length === 0
  }, [formData])

  const validatePricing = useCallback(() => {
    const e: typeof pricingErrors = {}
    const start = Number(formData.startPriceRiyal)
    if (!Number.isFinite(start) || start <= 0) e.startPrice = 'سعر البداية مطلوب وأكبر من صفر'
    if (![24, 72, 120, 168].includes(formData.durationHours)) e.duration = 'اختر مدة المزاد'
    if (!formData.deliveryShipping && !formData.deliveryHandoff) {
      e.delivery = 'اختر طريقة تسليم واحدة على الأقل'
    }
    if (!formData.city.trim()) e.city = 'اختر المدينة'
    const bn = formData.buyNowRiyal.trim()
    if (bn) {
      const v = Number(bn)
      if (!Number.isFinite(v) || v <= start) e.buyNow = 'سعر اشتري الآن يجب أن يكون أكبر من سعر البداية'
    }
    setPricingErrors(e)
    return Object.keys(e).length === 0
  }, [formData])

  const goNext = () => {
    if (currentStep === 0 && !validatePhotos()) return
    if (currentStep === 1 && !validateDetails()) return
    if (currentStep === 2 && !validatePricing()) return
    setCurrentStep((s) => Math.min(3, s + 1))
  }

  const goPrev = () => setCurrentStep((s) => Math.max(0, s - 1))

  return (
    <div className="min-h-screen bg-[var(--background)] pb-36" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-center text-lg font-bold text-foreground">إنشاء مزاد</h1>
        <div className="mt-4 flex items-center justify-between gap-1">
          {STEPS.map((s) => {
            const done = currentStep > s.i
            const active = currentStep === s.i
            return (
              <div key={s.i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ' +
                    (active
                      ? 'bg-[#1B7F7A] text-white'
                      : done
                        ? 'bg-[var(--success)] text-white'
                        : 'bg-muted text-muted-foreground')
                  }
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <Check className="h-5 w-5" weight="bold" aria-hidden /> : s.icon}
                </div>
                <span className="hidden text-center text-[10px] font-medium text-muted-foreground sm:block">
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        {currentStep === 0 ? (
          <StepPhotos formData={formData} setFormData={setFormData} userId={user.user_id} error={photoError} />
        ) : null}
        {currentStep === 1 ? (
          <StepDetails formData={formData} setFormData={setFormData} errors={detailErrors} />
        ) : null}
        {currentStep === 2 ? (
          <StepPricing formData={formData} setFormData={setFormData} errors={pricingErrors} />
        ) : null}
        {currentStep === 3 ? (
          <StepReview formData={formData} userId={user.user_id} clientAuctionId={clientAuctionId} />
        ) : null}
      </main>

      {currentStep < 3 ? (
        <div className="fixed bottom-[72px] left-0 right-0 z-30 flex gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur safe-pb">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentStep === 0}
            className="min-h-[48px] flex-1 rounded-xl border-2 border-border py-3 text-sm font-bold text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            السابق
          </button>
          <button
            type="button"
            onClick={goNext}
            className="min-h-[48px] flex-[2] rounded-xl bg-[#1B7F7A] py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            التالي
          </button>
        </div>
      ) : null}

      <BottomNav active="create" />
    </div>
  )
}

export function CreateAuctionGate() {
  const [user, setUser] = useState<QaboUserLocal | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent('/create')
      return
    }
    setUser(u)
    setReady(true)
  }, [])

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1B7F7A] border-t-transparent" />
      </div>
    )
  }

  return <CreateAuctionWizard user={user} />
}
