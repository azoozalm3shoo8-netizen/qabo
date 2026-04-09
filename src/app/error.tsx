'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4" dir="rtl">
      <div className="text-6xl" aria-hidden>
        😕
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">حدث خطأ غير متوقع</h2>
      <p className="max-w-md text-center text-gray-600 dark:text-slate-400">
        {error?.message || 'يرجى المحاولة مرة أخرى'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#1B7F7A] px-6 py-2 font-bold text-white dark:bg-teal-600"
        >
          حاول مرة أخرى
        </button>
        <a
          href="/"
          className="rounded-xl border-2 border-gray-200 px-6 py-2 font-bold text-gray-800 dark:border-slate-600 dark:text-slate-200"
        >
          العودة للرئيسية
        </a>
      </div>
    </div>
  )
}
