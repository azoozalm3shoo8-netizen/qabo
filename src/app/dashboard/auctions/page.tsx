import Link from 'next/link'

export default function DashboardAuctionsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[#1B7F7A]">مزاداتي</h1>
      <p className="text-sm text-gray-600 dark:text-slate-400">التبويبات والبطاقات تُحمَّل من API عند ربط user_id.</p>
      <Link href="/create" className="text-[#1B7F7A] underline">
        إنشاء مزاد
      </Link>
    </div>
  )
}
