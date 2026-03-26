'use client'

import Link from 'next/link'
import { Gavel, House, MagnifyingGlass, Plus, UserCircle } from '@phosphor-icons/react'
import { useLocale } from '@/lib/locale-context'

export type BottomNavKey = 'home' | 'search' | 'create' | 'myauctions' | 'profile'

export function BottomNav({ active }: { active: BottomNavKey }) {
  const { dir } = useLocale()

  const navCls = (key: BottomNavKey) =>
    'flex min-w-0 flex-col items-center gap-0.5 pb-1.5 text-[10px] sm:text-xs transition-colors ' +
    (active === key
      ? 'font-semibold text-[#1B7F7A] dark:text-slate-100'
      : 'text-gray-500 dark:text-slate-400')

  const iconCls = (key: BottomNavKey) =>
    'flex items-center justify-center transition-transform duration-200 ' +
    (active === key ? 'scale-110 text-[#1B7F7A] dark:text-slate-100' : 'text-gray-500 dark:text-slate-400')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-end border-t border-gray-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
      dir={dir}
    >
      <Link href="/" className={navCls('home')}>
        <span className={iconCls('home')}>
          <House className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'home' ? 'fill' : 'regular'} />
        </span>
        الرئيسية
      </Link>

      <Link href="/search" className={navCls('search')}>
        <span className={iconCls('search')}>
          <MagnifyingGlass className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'search' ? 'fill' : 'regular'} />
        </span>
        البحث
      </Link>

      <div className="flex min-h-[48px] justify-center">
        <Link
          href="/create"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF8C42] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="إضافة إعلان"
        >
          <Plus className="h-7 w-7" weight="bold" />
        </Link>
      </div>

      <Link href="/my-auctions" className={navCls('myauctions')}>
        <span className={iconCls('myauctions')}>
          <Gavel className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'myauctions' ? 'fill' : 'regular'} />
        </span>
        مزاداتي
      </Link>

      <Link href="/profile" className={navCls('profile')}>
        <span className={iconCls('profile')}>
          <UserCircle className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'profile' ? 'fill' : 'regular'} />
        </span>
        حسابي
      </Link>
    </nav>
  )
}
