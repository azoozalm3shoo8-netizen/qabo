'use client'

import { useState } from 'react'
import { Video360Upload } from '@/components/Video360Upload'
import { Video360Viewer } from '@/components/Video360Viewer'
import type { Video360Result } from '@/lib/video360-types'

export default function Video360DemoPage() {
  const [result, setResult] = useState<Video360Result | null>(null)

  return (
    <div className="min-h-screen bg-[#F3F4F6] px-4 py-8 pb-16 dark:bg-slate-900" dir="rtl">
      <h1 className="mb-2 text-center text-xl font-bold text-[#1F2937] dark:text-slate-100">
        اختبار ميزة العرض 360° وكشف العيوب
      </h1>
      <p className="mb-8 text-center text-sm text-gray-500 dark:text-slate-400">
        للرفع الكامل يُفضّل تسجيل الدخول. يمكنك معاينة الواجهة والبيانات بعد اكتمال المعالجة.
      </p>

      <section className="mx-auto mb-10 max-w-lg">
        <h2 className="mb-2 font-bold text-[#1B7F7A]">1) رفع فيديو</h2>
        <Video360Upload onComplete={(r) => setResult(r)} />
      </section>

      {result && result.frame_urls.length >= 2 && (
        <section className="mx-auto mb-10 max-w-3xl">
          <h2 className="mb-3 font-bold text-[#1B7F7A]">2) العارض التفاعلي</h2>
          <Video360Viewer
            frameUrls={result.frame_urls}
            annotatedUrls={result.annotated_urls}
            hotspots={result.hotspots}
            defects={result.defects}
            overallCondition={result.overall_condition}
            conditionScore={result.condition_score}
            summaryAr={result.summary}
          />
        </section>
      )}

      {result && (
        <section className="mx-auto max-w-3xl">
          <h2 className="mb-2 font-bold text-[#1B7F7A]">3) JSON خام</h2>
          <pre className="max-h-96 overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-[10px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  )
}
