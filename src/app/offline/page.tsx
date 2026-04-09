'use client'

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      dir="rtl"
    >
      <div className="text-6xl" aria-hidden>
        📡
      </div>
      <h1 className="text-2xl font-bold text-foreground">أنت غير متصل</h1>
      <p className="text-muted-foreground">تحقق من اتصالك بالإنترنت وحاول مرة أخرى</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 rounded-xl bg-primary px-6 py-3 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        حاول مرة أخرى
      </button>
    </div>
  )
}
