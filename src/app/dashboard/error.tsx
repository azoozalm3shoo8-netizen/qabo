'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div dir="rtl" className="flex flex-col items-center gap-4 p-8">
      <p className="text-red-600">حدث خطأ في لوحة التحكم.</p>
      <button type="button" className="rounded-lg bg-[#1B7F7A] px-4 py-2 text-white" onClick={() => reset()}>
        إعادة المحاولة
      </button>
    </div>
  )
}
