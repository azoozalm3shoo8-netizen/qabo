'use client'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-6 text-center dark:bg-slate-900">
        <div className="mb-6 text-7xl">💥</div>
        <h1 className="mb-2 text-2xl font-bold text-[#1F2937] dark:text-slate-100">خطأ عام في التطبيق</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-slate-400">نعتذر عن هذا الخطأ</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#1B7F7A] px-6 py-3 font-bold text-white transition hover:bg-[#156661]"
        >
          إعادة المحاولة
        </button>
      </body>
    </html>
  )
}
