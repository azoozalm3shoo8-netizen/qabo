export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] dark:bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#1B7F7A] dark:border-slate-600" />
        <p className="text-sm text-gray-400 dark:text-slate-500">جاري التحميل...</p>
      </div>
    </div>
  )
}
