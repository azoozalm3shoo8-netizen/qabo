'use client'

import { useMemo, useState } from 'react'
import { CategoryChecklist } from '@/components/CategoryChecklist'
import { ChecklistDisplay } from '@/components/ChecklistDisplay'
import { DefectBadge } from '@/components/DefectBadge'
import { ImageEnhancer } from '@/components/ImageEnhancer'
import { Video360Upload } from '@/components/Video360Upload'
import type { Video360Result } from '@/lib/video360-types'

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'electronics', label: 'إلكترونيات' },
  { id: 'cars', label: 'سيارات' },
  { id: 'real_estate', label: 'عقارات' },
  { id: 'fashion', label: 'أزياء' },
  { id: 'watches', label: 'ساعات' },
  { id: 'furniture', label: 'أثاث' },
  { id: 'general', label: 'عام' },
]

export default function Video360DemoPage() {
  const [result, setResult] = useState<Video360Result | null>(null)
  const [categoryId, setCategoryId] = useState('electronics')
  const demoAuctionId = useMemo(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return '00000000-0000-4000-8000-000000000001'
  }, [])

  return (
    <div className="min-h-screen bg-[#F3F4F6] px-4 py-8 pb-16 dark:bg-slate-900" dir="rtl">
      <h1 className="mb-2 text-center text-xl font-bold text-[#1F2937] dark:text-slate-100">
        عرض منتجات Qabo — تحسين صور، 360°، قوائم فحص
      </h1>
      <p className="mb-10 text-center text-sm text-gray-500 dark:text-slate-400">
        صفحة تجريبية للميزات. للرفع الكامل يُفضّل تسجيل الدخول وتشغيل SQL في Supabase (features-v2-schema.sql).
      </p>

      <section className="mx-auto mb-12 max-w-3xl">
        <h2 className="mb-1 border-b border-[#1B7F7A]/30 pb-2 text-lg font-bold text-[#1B7F7A]">1) تحسين الصور</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-slate-400">
          رفع عدة صور، تطبيق التحسين وإزالة الخلفية اختيارياً، ثم المقارنة قبل/بعد.
        </p>
        <ImageEnhancer />
      </section>

      <section className="mx-auto mb-12 max-w-lg">
        <h2 className="mb-1 border-b border-[#1B7F7A]/30 pb-2 text-lg font-bold text-[#1B7F7A]">2) فيديو 360°</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-slate-400">
          رفع فيديو دوران؛ عند وجود عيوب يظهر تأكيد البائع ثم العارض. خيارات تحسين الإطارات وإزالة الخلفية أسفل منطقة
          الرفع.
        </p>
        <Video360Upload auctionId={demoAuctionId} onComplete={(r) => setResult(r)} />
      </section>

      <section className="mx-auto mb-12 max-w-3xl">
        <h2 className="mb-1 border-b border-[#1B7F7A]/30 pb-2 text-lg font-bold text-[#1B7F7A]">3) قائمة الفحص حسب الفئة</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-slate-400">
          اختر الفئة واملأ الأسئلة. يُستخدم معرّف إعلان تجريبي ثابت لهذه الصفحة للحفظ.
        </p>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">الفئة</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <CategoryChecklist key={categoryId} categoryId={categoryId} auctionId={demoAuctionId} />
      </section>

      <section className="mx-auto mb-12 max-w-3xl">
        <h2 className="mb-1 border-b border-[#1B7F7A]/30 pb-2 text-lg font-bold text-[#1B7F7A]">
          4) معاينة كما يراها المشتري
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-slate-400">
          شارة العيوب (بعد إكمال مهمة 360° وربطها بنفس auction_id التجريبي) وعرض قائمة الفحص المحفوظة.
        </p>
        <div className="space-y-6">
          <DefectBadge auctionId={demoAuctionId} />
          <ChecklistDisplay auctionId={demoAuctionId} />
        </div>
      </section>

      {result && (
        <section className="mx-auto max-w-3xl">
          <h2 className="mb-2 font-bold text-[#1B7F7A]">JSON خام (مرجع)</h2>
          <pre className="max-h-96 overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-[10px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  )
}
