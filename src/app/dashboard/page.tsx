import Link from 'next/link'

export default function DashboardHomePage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F4F3] text-2xl text-[#1B7F7A] dark:bg-[#134e4a]/50">
        🏠
      </div>
      <h1 className="text-xl font-bold text-[#1F2937] dark:text-slate-100">لوحة قبو</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
        اختر قسماً من القائمة الجانبية للمتابعة.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-[#1B7F7A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#156661]"
      >
        العودة للرئيسية
      </Link>
    </div>
  )
}
