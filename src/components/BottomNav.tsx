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
import { useLocale } from '@/lib/locale-context'

export type BottomNavKey =
  | 'home'
  | 'categories'
  | 'favorites'
  | 'orders'
  | 'messages'
  | 'profile'

export function BottomNav({ active }: { active: BottomNavKey }) {
  const { t, dir } = useLocale()

  const navCls = (key: BottomNavKey) =>
    'flex min-w-0 flex-1 flex-col items-center gap-0.5 text-[10px] sm:text-xs transition-colors ' +
    (active === key
      ? 'font-semibold text-[#1B7F7A] dark:text-slate-100'
      : 'text-gray-500 dark:text-slate-400')

  const iconWrap = (key: BottomNavKey, children: React.ReactNode) => (
    <span
      className={
        'flex items-center justify-center transition-transform duration-200 ' +
        (active === key ? 'scale-110 text-[#1B7F7A] dark:text-slate-100' : 'text-gray-500 dark:text-slate-400')
      }
    >
      {children}
    </span>
  )

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around border-t border-gray-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
      aria-label={t('nav_bottomLabel')}
      dir={dir}
    >
      <Link href="/" className={navCls('home')}>
        {iconWrap('home', <House className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'home' ? 'fill' : 'regular'} />)}
        {t('nav_home')}
      </Link>
      <Link href="/categories" className={navCls('categories')}>
        {iconWrap(
          'categories',
          <FolderSimple className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'categories' ? 'fill' : 'regular'} />
        )}
        {t('nav_categories')}
      </Link>
      <Link
        href="/create"
        className="flex -translate-y-5 flex-shrink-0 flex-col items-center gap-0.5"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF8C42] text-white shadow-lg ring-4 ring-white transition-transform active:scale-95 hover:bg-[#e87a35] dark:ring-slate-900 sm:h-[3.75rem] sm:w-[3.75rem]">
          <Plus className="h-8 w-8" weight="bold" />
        </span>
      </Link>
      <Link href="/favorites" className={navCls('favorites')}>
        {iconWrap(
          'favorites',
          <Heart className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'favorites' ? 'fill' : 'regular'} />
        )}
        {t('nav_favorites')}
      </Link>
      <Link href="/orders" className={navCls('orders')}>
        {iconWrap('orders', <Package className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'orders' ? 'fill' : 'regular'} />)}
        {t('nav_orders')}
      </Link>
      <Link href="/messages" className={navCls('messages')}>
        {iconWrap(
          'messages',
          <ChatCircle className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'messages' ? 'fill' : 'regular'} />
        )}
        {t('nav_messages')}
      </Link>
      <Link href="/profile" className={navCls('profile')}>
        {iconWrap(
          'profile',
          <UserCircle className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'profile' ? 'fill' : 'regular'} />
        )}
        {t('nav_profile')}
      </Link>
    </nav>
  )
}
