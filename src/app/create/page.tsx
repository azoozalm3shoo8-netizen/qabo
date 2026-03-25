'use client'

import { Sparkle } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { ImageUploader } from '@/components/ImageUploader'
import { suggestCategoryFromTitle } from '@/lib/ai-classifier'
import { estimatePrice } from '@/lib/ai-pricing'
import { CATEGORY_CATALOG, SAUDI_CITIES } from '@/lib/constants'
import { useLocale } from '@/lib/locale-context'
import { readQaboUserFromStorage, type QaboUserLocal } from '@/lib/qabo-user'

const CATEGORIES = CATEGORY_CATALOG.map((c) => c.name)
const ICONS = CATEGORY_CATALOG.map((c) => c.icon)
const CITIES = SAUDI_CITIES
const DURATIONS = [
  { label: '1 ساعة', value: 1 },
  { label: '3 ساعات', value: 3 },
  { label: '6 ساعات', value: 6 },
  { label: '12 ساعة', value: 12 },
  { label: '24 ساعة', value: 24 },
  { label: '48 ساعة', value: 48 },
  { label: '3 أيام', value: 72 },
]

const fieldClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[#1F2937] outline-none focus:ring-2 focus:ring-[#1B7F7A] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

export default function CreatePage() {
  const { t } = useLocale()
  const pendingAuctionId = useMemo(() => crypto.randomUUID(), [])
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState('new')
  const [city, setCity] = useState('')
  const [startPrice, setStartPrice] = useState('')
  const [buyNow, setBuyNow] = useState('')
  const [duration, setDuration] = useState(24)
  const [increment, setIncrement] = useState('100')
  const [published, setPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<QaboUserLocal | null>(null)
  const [imagesUploading, setImagesUploading] = useState(false)
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
      window.location.href = '/auth/login'
      return
    }
    setUser(u)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (title.trim().length < 3) {
        setSuggestedCategory(null)
        return
      }
      setSuggestedCategory(suggestCategoryFromTitle(title))
    }, 400)
    return () => window.clearTimeout(id)
  }, [title])

  const priceHint = useMemo(() => {
    if (!category || title.trim().length < 3) return null
    return estimatePrice(category, title)
  }, [category, title])

  const goStep3 = () => {
    if (imagesUploading) {
      setError('يرجى انتظار اكتمال رفع الصور')
      return
    }
    if (imageUrls.length < 1) {
      setError('يرجى رفع صورة واحدة على الأقل للمنتج')
      return
    }
    if (imageUrls.some((u) => u.startsWith('blob:'))) {
      setError('لا يزال هناك صور قيد المعالجة')
      return
    }
    setError('')
    setStep(3)
  }

  const handlePublish = async () => {
    if (!user) return
    if (imagesUploading) {
      setError('يرجى انتظار اكتمال رفع الصور قبل النشر')
      return
    }
    if (imageUrls.length < 1) {
      setError('يرجى رفع صورة واحدة على الأقل')
      return
    }
    if (imageUrls.some((u) => u.startsWith('blob:'))) {
      setError('يجب أن تُرفع جميع الصور إلى التخزين قبل النشر')
      return
    }
    setLoading(true)
    setError('')
    try {
      let bnp: number | null = null
      if (buyNow.trim()) {
        const n = Number(buyNow)
        if (Number.isFinite(n) && n > 0) bnp = n
      }
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          seller_id: user.user_id,
          id: pendingAuctionId,
          title,
          description,
          category,
          condition,
          city,
          start_price: Number(startPrice),
          buy_now_price: bnp,
          bid_increment: Number(increment) || 100,
          duration_hours: duration,
          images: imageUrls,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'failed')
      setPublished(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (published) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-slate-900"
        dir="rtl"
      >
        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#10B981]/10 dark:bg-[#134e4a]/50">
            <span className="text-4xl text-[#1B7F7A] dark:text-slate-100">✓</span>
          </div>
          <h1 className="mb-2 text-xl font-bold text-[#1B7F7A] dark:text-slate-100">تم نشر مزادك بنجاح!</h1>
          <p className="mb-6 text-gray-500 dark:text-slate-400">يمكنك متابعة المزايدات من صفحة حسابي</p>
          <a
            href="/"
            className="block w-full rounded-xl bg-[#1B7F7A] py-3 font-medium text-white transition-transform hover:bg-[#156661] active:scale-95"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8 dark:bg-slate-900" dir="rtl">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <a href="/" className="text-xl text-[#1F2937] dark:text-slate-100">
          →
        </a>
        <h1 className="text-lg font-bold text-[#1F2937] dark:text-slate-100">إعلان جديد</h1>
      </div>
      <div className="px-4 py-3">
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={
                'h-1 flex-1 rounded-full ' +
                (step >= s ? 'bg-[#1B7F7A]' : 'bg-gray-200 dark:bg-slate-600')
              }
            />
          ))}
        </div>
      </div>
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 px-4">
          <h2 className="font-bold text-gray-900 dark:text-slate-100">اختر التصنيف</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c, i) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  'rounded-xl border-2 p-4 text-center transition-colors ' +
                  (category === c
                    ? 'border-[#1B7F7A] bg-[#E6F4F3] dark:bg-[#134e4a]/50'
                    : 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800')
                }
              >
                <span className="mb-1 block text-2xl">{ICONS[i]}</span>
                <span className="text-sm text-[#1F2937] dark:text-slate-200">{c}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!category}
            className="mt-4 w-full rounded-xl bg-[#1B7F7A] py-3 font-medium text-white transition-transform hover:bg-[#156661] active:scale-95 disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 px-4">
          <h2 className="font-bold text-gray-900 dark:text-slate-100">تفاصيل المنتج</h2>
          <ImageUploader
            initialUrls={imageUrls}
            onImagesChange={setImageUrls}
            onBusyChange={setImagesUploading}
          />
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-slate-400">عنوان الإعلان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title.trim().length >= 3) {
                  setSuggestedCategory(suggestCategoryFromTitle(title))
                }
              }}
              placeholder="مثال: ايفون 15 برو ماكس 256GB"
              className={fieldClass}
            />
            {suggestedCategory && suggestedCategory !== category ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#1B7F7A]/25 bg-[#E6F4F3]/70 p-3 dark:border-slate-600 dark:bg-[#134e4a]/35"
              >
                <p className="text-sm text-[#1F2937] dark:text-slate-100">
                  {t('create_aiSuggest').replace('{category}', suggestedCategory)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategory(suggestedCategory)
                    setSuggestedCategory(null)
                  }}
                  className="rounded-full bg-[#1B7F7A] px-4 py-1.5 text-xs font-bold text-white"
                >
                  {t('create_aiYes')}
                </button>
              </motion.div>
            ) : null}
          </div>
          {priceHint ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-xl border border-[#1B7F7A]/20 bg-[#E6F4F3]/50 p-3 dark:border-slate-600 dark:bg-[#134e4a]/30"
            >
              <Sparkle className="h-5 w-5 shrink-0 text-[#1B7F7A] dark:text-slate-200" weight="fill" />
              <p className="text-sm font-medium text-[#1F2937] dark:text-slate-100">
                {t('create_priceSmart')}: {priceHint.min.toLocaleString()} —{' '}
                {priceHint.max.toLocaleString()} {t('common_currency')}
              </p>
            </motion.div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-slate-400">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصف تفصيلي..."
              rows={4}
              className={fieldClass + ' resize-none'}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-slate-400">الحالة</label>
            <div className="flex gap-3">
              {[
                { v: 'new', l: 'جديد' },
                { v: 'used', l: 'مستعمل' },
                { v: 'refurbished', l: 'مجدد' },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setCondition(o.v)}
                  className={
                    'flex-1 rounded-lg border-2 py-2 text-sm ' +
                    (condition === o.v
                      ? 'border-[#1B7F7A] bg-[#E6F4F3] text-[#1B7F7A] dark:bg-[#134e4a]/40 dark:text-slate-100'
                      : 'border-gray-200 dark:border-slate-600 dark:text-slate-200')
                  }
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-slate-400">المدينة</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass}>
              <option value="">اختر المدينة</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-medium text-[#1F2937] dark:border-slate-600 dark:text-slate-200"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={goStep3}
              disabled={!title}
              className="flex-1 rounded-xl bg-[#1B7F7A] py-3 font-medium text-white transition-transform hover:bg-[#156661] active:scale-95 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 px-4">
          <h2 className="font-bold text-gray-900 dark:text-slate-100">التسعير والمدة</h2>
          {priceHint ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-xl border border-[#1B7F7A]/20 bg-[#E6F4F3]/50 p-3 dark:border-slate-600 dark:bg-[#134e4a]/30"
            >
              <Sparkle className="h-5 w-5 shrink-0 text-[#1B7F7A] dark:text-slate-200" weight="fill" />
              <p className="text-sm font-medium text-[#1F2937] dark:text-slate-100">
                {t('create_priceSmart')}: {priceHint.min.toLocaleString()} —{' '}
                {priceHint.max.toLocaleString()} {t('common_currency')}
              </p>
            </motion.div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-slate-400">سعر البداية (ر.س)</label>
            <input
              type="number"
              value={startPrice}
              onChange={(e) => setStartPrice(e.target.value)}
              placeholder="0"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-slate-400">
              سعر الشراء الفوري (اختياري)
            </label>
            <input
              type="number"
              value={buyNow}
              onChange={(e) => setBuyNow(e.target.value)}
              placeholder="0"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-slate-400">
              الحد الأدنى للمزايدة (ر.س)
            </label>
            <input
              type="number"
              value={increment}
              onChange={(e) => setIncrement(e.target.value)}
              placeholder="100"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-slate-400">مدة المزاد</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={
                    'rounded-lg border-2 py-2 text-sm ' +
                    (duration === d.value
                      ? 'border-[#1B7F7A] bg-[#E6F4F3] text-[#1B7F7A] dark:bg-[#134e4a]/40 dark:text-slate-100'
                      : 'border-gray-200 dark:border-slate-600 dark:text-slate-200')
                  }
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-medium text-[#1F2937] dark:border-slate-600 dark:text-slate-200"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={!startPrice || loading || imagesUploading}
              className="flex-1 rounded-xl bg-[#FF8C42] py-3 font-medium text-white transition-transform hover:bg-[#E87A35] active:scale-95 disabled:opacity-50"
            >
              {loading ? 'جاري النشر...' : imagesUploading ? 'انتظر رفع الصور...' : 'نشر المزاد'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
