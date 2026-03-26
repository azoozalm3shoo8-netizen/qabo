'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-6 text-center dark:bg-slate-900">
      <div className="mb-6 text-7xl">⚠️</div>
      <h1 className="mb-2 text-2xl font-bold text-[#1F2937] dark:text-slate-100">حدث خطأ غير متوقع</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">لا تقلق، جرّب مرة ثانية</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#1B7F7A] px-6 py-3 font-bold text-white transition hover:bg-[#156661] active:scale-95"
        >
          إعادة المحاولة
        </button>
        <a
          href="/"
          className="rounded-xl border-2 border-gray-300 px-6 py-3 font-bold text-gray-600 transition hover:bg-gray-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          الرئيسية
        </a>
      </div>
    </div>
  )
}
