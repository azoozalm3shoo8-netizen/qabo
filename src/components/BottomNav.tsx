'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, House, MagnifyingGlass, Plus, UserCircle } from '@phosphor-icons/react'
import { useLocale } from '@/lib/locale-context'
import { useNotificationUI } from '@/components/notifications/NotificationUIProvider'

export type BottomNavKey = 'home' | 'search' | 'create' | 'notifications' | 'profile'

export function BottomNav({ active }: { active: BottomNavKey }) {
  const { dir } = useLocale()
  const pathname = usePathname()
  const { openNotifications, unreadCount } = useNotificationUI()
  const notifActive = active === 'notifications' || pathname === '/notifications'

  const navCls = (key: BottomNavKey) =>
    'flex min-w-0 flex-col items-center gap-0.5 pb-1.5 text-[10px] sm:text-xs transition-colors min-h-[48px] justify-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F7A] focus-visible:ring-offset-2 rounded-lg ' +
    (active === key || (key === 'notifications' && notifActive)
      ? 'font-semibold text-[#1B7F7A] dark:text-slate-100'
      : 'text-gray-500 dark:text-slate-400')

  const iconCls = (key: BottomNavKey) =>
    'relative flex items-center justify-center transition-transform duration-200 ' +
    (active === key || (key === 'notifications' && notifActive)
      ? 'scale-110 text-[#1B7F7A] dark:text-slate-100'
      : 'text-gray-500 dark:text-slate-400')

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-40 grid grid-cols-5 items-end border-t border-gray-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95"
      dir={dir}
    >
      <Link href="/" className={navCls('home')} aria-current={active === 'home' ? 'page' : undefined}>
        <span className={iconCls('home')}>
          <House className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'home' ? 'fill' : 'regular'} />
        </span>
        الرئيسية
      </Link>

      <Link href="/search" className={navCls('search')} aria-current={active === 'search' ? 'page' : undefined}>
        <span className={iconCls('search')}>
          <MagnifyingGlass className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'search' ? 'fill' : 'regular'} />
        </span>
        البحث
      </Link>

      <div className="flex min-h-[52px] justify-center">
        <Link
          href="/create"
          className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-[#FF8C42] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C42] focus-visible:ring-offset-2"
          aria-label="إنشاء مزاد"
          aria-current={active === 'create' ? 'page' : undefined}
        >
          <Plus className="h-7 w-7" weight="bold" />
        </Link>
      </div>

      <button
        type="button"
        onClick={() => openNotifications()}
        className={navCls('notifications')}
        aria-label="الإشعارات"
      >
        <span className={'relative ' + iconCls('notifications')}>
          <Bell className="h-6 w-6 sm:h-7 sm:w-7" weight={unreadCount > 0 ? 'fill' : 'regular'} />
          {unreadCount > 0 ? (
            <span className="absolute -start-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </span>
        الإشعارات
      </button>

      <Link href="/profile" className={navCls('profile')} aria-current={active === 'profile' ? 'page' : undefined}>
        <span className={iconCls('profile')}>
          <UserCircle className="h-6 w-6 sm:h-7 sm:w-7" weight={active === 'profile' ? 'fill' : 'regular'} />
        </span>
        حسابي
      </Link>
    </nav>
  )
}
