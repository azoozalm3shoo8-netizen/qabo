'use client'

import Link from 'next/link'
import { FolderSimple, Gavel, Heart, House, Plus, UserCircle } from '@phosphor-icons/react'
import { useLocale } from '@/lib/locale-context'

export type BottomNavKey = 'home' | 'categories' | 'myauctions' | 'favorites' | 'profile'

export function BottomNav({ active }: { active: BottomNavKey }) {
  const { t, dir } = useLocale()

  const navCls = (key: BottomNavKey) =>
    'flex min-w-0 flex-col items-center gap-0.5 pb-1.5 text-[10px] sm:text-xs transition-colors ' +
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
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 items-end border-t border-gray-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
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
      <div className="relative flex min-h-[48px] justify-center">
        <Link
          href="/create"
          className="absolute bottom-full left-1/2 z-10 mb-1 flex h-14 w-14 -translate-x-1/2 -translate-y-5 items-center justify-center rounded-full bg-[#FF8C42] text-white shadow-lg ring-4 ring-white transition-transform hover:scale-105 active:scale-95 dark:ring-slate-900"
          aria-label={t('create_title')}
        >
          <Plus className="h-8 w-8" weight="bold" />
        </Link>
      </div>
      <Link href="/my-auctions" className={navCls('myauctions')}>
        {iconWrap(
          'myauctions',
          <Gavel className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'myauctions' ? 'fill' : 'regular'} />
        )}
        مزاداتي
      </Link>
      <Link href="/favorites" className={navCls('favorites')}>
        {iconWrap(
          'favorites',
          <Heart className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'favorites' ? 'fill' : 'regular'} />
        )}
        {t('nav_favorites')}
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
