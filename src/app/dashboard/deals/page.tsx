import Link from 'next/link'

export default function DashboardDealsPage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F4F3] text-2xl dark:bg-[#134e4a]/50">
        🤝
      </div>
      <h1 className="text-xl font-bold text-[#1F2937] dark:text-slate-100">صفقاتي</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
        واجهة الصفقات الموحّدة قيد التطوير. يمكنك متابعة الطلبات من «طلباتي» أو الدفع من صفحة المزاد بعد الفوز.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/orders"
          className="inline-block rounded-xl border-2 border-[#1B7F7A] px-5 py-2.5 text-sm font-bold text-[#1B7F7A] hover:bg-[#E6F4F3] dark:hover:bg-[#134e4a]/30"
        >
          طلباتي
        </Link>
        <Link href="/" className="inline-block rounded-xl bg-[#1B7F7A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#156661]">
          تصفح المزادات
        </Link>
      </div>
    </div>
  )
}
