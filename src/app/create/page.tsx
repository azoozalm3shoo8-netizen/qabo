'use client'

import { useMemo, useState, useEffect } from 'react'
import { CATEGORY_CATALOG, SAUDI_CITIES } from '@/lib/constants'
import { ImageUploader } from '@/components/ImageUploader'

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

export default function CreatePage() {
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
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      window.location.href = '/auth/login'
      return
    }
    setUser(JSON.parse(stored))
  }, [])

  const goStep3 = () => {
    if (imageUrls.length < 1) {
      setError('يرجى رفع صورة واحدة على الأقل للمنتج')
      return
    }
    setError('')
    setStep(3)
  }

  const handlePublish = async () => {
    if (!user) return
    if (imageUrls.length < 1) {
      setError('يرجى رفع صورة واحدة على الأقل')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-lg border border-gray-100">
          <div className="w-20 h-20 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl text-[#1B7F7A]">✓</span>
          </div>
          <h1 className="text-xl font-bold mb-2 text-[#1B7F7A]">تم نشر مزادك بنجاح!</h1>
          <p className="text-gray-500 mb-6">يمكنك متابعة المزايدات من صفحة حسابي</p>
          <a
            href="/"
            className="block w-full py-3 bg-[#1B7F7A] text-white rounded-xl font-medium transition-transform active:scale-95 hover:bg-[#156661]"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8" dir="rtl">
      <div className="bg-white px-4 py-3 shadow-sm flex items-center gap-3 border-b border-gray-100">
        <a href="/" className="text-xl">
          →
        </a>
        <h1 className="font-bold text-lg">إعلان جديد</h1>
      </div>
      <div className="px-4 py-3">
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={
                'h-1 flex-1 rounded-full ' + (step >= s ? 'bg-[#1B7F7A]' : 'bg-gray-200')
              }
            />
          ))}
        </div>
      </div>
      {error && (
        <div className="mx-4 bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-2">{error}</div>
      )}

      {step === 1 && (
        <div className="px-4 space-y-4">
          <h2 className="font-bold text-gray-900">اختر التصنيف</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c, i) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={
                  'p-4 rounded-xl border-2 text-center transition-colors ' +
                  (category === c
                    ? 'border-[#1B7F7A] bg-[#E6F4F3]'
                    : 'border-gray-200 bg-white')
                }
              >
                <span className="text-2xl block mb-1">{ICONS[i]}</span>
                <span className="text-sm">{c}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!category}
            className="w-full py-3 bg-[#1B7F7A] text-white rounded-xl font-medium disabled:opacity-50 mt-4 transition-transform active:scale-95 hover:bg-[#156661]"
          >
            التالي
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="px-4 space-y-4">
          <h2 className="font-bold text-gray-900">تفاصيل المنتج</h2>
          <ImageUploader initialUrls={imageUrls} onImagesChange={setImageUrls} />
          <div>
            <label className="text-sm text-gray-600 block mb-1">عنوان الإعلان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: ايفون 15 برو ماكس 256GB"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B7F7A]"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصف تفصيلي..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B7F7A] resize-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">الحالة</label>
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
                    'flex-1 py-2 rounded-lg text-sm border-2 ' +
                    (condition === o.v
                      ? 'border-[#1B7F7A] bg-[#E6F4F3] text-[#1B7F7A]'
                      : 'border-gray-200')
                  }
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">المدينة</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B7F7A] bg-white"
            >
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
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={goStep3}
              disabled={!title}
              className="flex-1 py-3 bg-[#1B7F7A] text-white rounded-xl font-medium disabled:opacity-50 transition-transform active:scale-95 hover:bg-[#156661]"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="px-4 space-y-4">
          <h2 className="font-bold text-gray-900">التسعير والمدة</h2>
          <div>
            <label className="text-sm text-gray-600 block mb-1">سعر البداية (ر.س)</label>
            <input
              type="number"
              value={startPrice}
              onChange={(e) => setStartPrice(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B7F7A]"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              سعر الشراء الفوري (اختياري)
            </label>
            <input
              type="number"
              value={buyNow}
              onChange={(e) => setBuyNow(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B7F7A]"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              الحد الأدنى للمزايدة (ر.س)
            </label>
            <input
              type="number"
              value={increment}
              onChange={(e) => setIncrement(e.target.value)}
              placeholder="100"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1B7F7A]"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">مدة المزاد</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={
                    'py-2 rounded-lg text-sm border-2 ' +
                    (duration === d.value
                      ? 'border-[#1B7F7A] bg-[#E6F4F3] text-[#1B7F7A]'
                      : 'border-gray-200')
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
              className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={!startPrice || loading}
              className="flex-1 py-3 bg-[#FF8C42] text-white rounded-xl font-medium disabled:opacity-50 transition-transform active:scale-95 hover:bg-[#E87A35]"
            >
              {loading ? 'جاري النشر...' : 'نشر المزاد'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
