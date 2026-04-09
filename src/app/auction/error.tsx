'use client'

export default function AuctionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4" dir="rtl">
      <div className="text-6xl" aria-hidden>
        😕
      </div>
      <h2 className="text-xl font-bold">حدث خطأ غير متوقع</h2>
      <p className="text-center text-gray-600 dark:text-slate-400">{error?.message || 'يرجى المحاولة مرة أخرى'}</p>
      <button type="button" onClick={reset} className="rounded-xl bg-[#1B7F7A] px-6 py-2 font-bold text-white">
        حاول مرة أخرى
      </button>
      <a href="/" className="text-sm font-semibold text-[#1B7F7A]">
        العودة للرئيسية
      </a>
    </div>
  )
}
