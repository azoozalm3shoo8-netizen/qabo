'use client'

import Link from 'next/link'
import { House, MagnifyingGlass } from '@phosphor-icons/react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6] px-6 text-center dark:bg-slate-900">
      <div className="mb-6 text-8xl">🏛️</div>
      <h1 className="mb-2 text-3xl font-bold text-[#1F2937] dark:text-slate-100">404</h1>
      <p className="mb-1 text-lg font-medium text-gray-600 dark:text-slate-300">الصفحة غير موجودة</p>
      <p className="mb-8 text-sm text-gray-400 dark:text-slate-500">يبدو أن هذا المزاد انتهى أو الرابط غير صحيح</p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl bg-[#1B7F7A] px-6 py-3 font-bold text-white transition hover:bg-[#156661] active:scale-95"
        >
          <House className="h-5 w-5" weight="bold" />
          الرئيسية
        </Link>
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-xl border-2 border-[#1B7F7A] px-6 py-3 font-bold text-[#1B7F7A] transition hover:bg-[#E6F4F3] active:scale-95 dark:text-slate-100"
        >
          <MagnifyingGlass className="h-5 w-5" weight="bold" />
          البحث
        </Link>
      </div>
    </div>
  )
}
