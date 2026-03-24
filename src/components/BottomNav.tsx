'use client'

import Link from 'next/link'
import {
  ChatCircle,
  FolderSimple,
  Heart,
  House,
  Package,
  Plus,
  UserCircle,
} from '@phosphor-icons/react'

export type BottomNavKey =
  | 'home'
  | 'categories'
  | 'favorites'
  | 'orders'
  | 'messages'
  | 'profile'

export function BottomNav({ active }: { active: BottomNavKey }) {
  const navCls = (key: BottomNavKey) =>
    'flex min-w-0 flex-1 flex-col items-center gap-0.5 text-[10px] sm:text-xs transition-colors ' +
    (active === key ? 'font-semibold text-[#1B7F7A]' : 'text-gray-400')

  const iconWrap = (key: BottomNavKey, children: React.ReactNode) => (
    <span
      className={
        'flex items-center justify-center transition-transform duration-200 ' +
        (active === key ? 'scale-110 text-[#1B7F7A]' : 'text-gray-400')
      }
    >
      {children}
    </span>
  )

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around border-t border-gray-100 bg-white/95 px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
      aria-label="التنقل السفلي"
      dir="rtl"
    >
      <Link href="/" className={navCls('home')}>
        {iconWrap('home', <House className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'home' ? 'fill' : 'regular'} />)}
        الرئيسية
      </Link>
      <Link href="/categories" className={navCls('categories')}>
        {iconWrap(
          'categories',
          <FolderSimple className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'categories' ? 'fill' : 'regular'} />
        )}
        التصنيفات
      </Link>
      <Link href="/create" className="-mt-4 flex flex-shrink-0 flex-col items-center gap-0.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF8C42] text-xl font-bold text-white shadow-lg transition-transform active:scale-95 hover:bg-[#E87A35] sm:h-12 sm:w-12 sm:text-2xl">
          <Plus className="h-7 w-7" weight="bold" />
        </span>
      </Link>
      <Link href="/favorites" className={navCls('favorites')}>
        {iconWrap(
          'favorites',
          <Heart className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'favorites' ? 'fill' : 'regular'} />
        )}
        المفضلة
      </Link>
      <Link href="/orders" className={navCls('orders')}>
        {iconWrap('orders', <Package className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'orders' ? 'fill' : 'regular'} />)}
        طلباتي
      </Link>
      <Link href="/messages" className={navCls('messages')}>
        {iconWrap(
          'messages',
          <ChatCircle className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'messages' ? 'fill' : 'regular'} />
        )}
        الرسائل
      </Link>
      <Link href="/profile" className={navCls('profile')}>
        {iconWrap(
          'profile',
          <UserCircle className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'profile' ? 'fill' : 'regular'} />
        )}
        حسابي
      </Link>
    </nav>
  )
}
