import Link from 'next/link'
import type { ReactNode } from 'react'
import { FreePeriodBanner } from '@/components/info/FreePeriodBanner'

const links = [
  { href: '/dashboard', label: 'الرئيسية' },
  { href: '/dashboard/auctions', label: 'مزاداتي' },
  { href: '/dashboard/deals', label: 'صفقاتي' },
  { href: '/dashboard/cards', label: 'بطاقاتي' },
  { href: '/dashboard/seller', label: 'ملف البائع' },
  { href: '/how-it-works', label: 'كيف يعمل؟' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#F3F4F6] dark:bg-slate-950">
      <FreePeriodBanner />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row-reverse">
        <aside className="w-full shrink-0 space-y-2 md:w-52">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#1B7F7A] hover:bg-[#E6F4F3] dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              {l.label}
            </Link>
          ))}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
