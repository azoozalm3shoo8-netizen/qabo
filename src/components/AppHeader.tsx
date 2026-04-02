'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell, GlobeSimple, ShieldStar, UserCircle } from '@phosphor-icons/react'
import { FreePeriodBanner } from '@/components/info/FreePeriodBanner'
import { QabbooLogo } from '@/components/QabbooLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { isAdminUserId } from '@/lib/admin-ids'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { useLocale } from '@/lib/locale-context'

export function AppHeader({
  title,
  showBrand,
  rightSlot,
  variant = 'default',
}: {
  title?: string
  showBrand?: boolean
  rightSlot?: React.ReactNode
  variant?: 'default' | 'hero'
}) {
  const { t, locale, setLocale, dir } = useLocale()
  const [pollUnread, setPollUnread] = useState(0)
  const [headerUserId, setHeaderUserId] = useState<string | null>(null)
  const [hasUser, setHasUser] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [shakeBell, setShakeBell] = useState(false)
  const { realtimeUnread, resetUnread } = useRealtimeNotifications(headerUserId)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    setHeaderUserId(u?.user_id ?? null)
    setHasUser(Boolean(u?.user_id))
    setIsAdmin(isAdminUserId(u?.user_id ?? null))
  }, [])

  useEffect(() => {
    if (!headerUserId) return
    const load = () => {
      fetch('/api/notifications?user_id=' + encodeURIComponent(headerUserId))
        .then((r) => r.json())
        .then((d: { unread_count?: number }) => {
          if (typeof d.unread_count === 'number') {
            setPollUnread(d.unread_count)
            resetUnread()
          }
        })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [headerUserId, resetUnread])

  const totalUnread = pollUnread + realtimeUnread

  useEffect(() => {
    if (totalUnread <= 0) return
    setShakeBell(true)
    const id = window.setTimeout(() => setShakeBell(false), 600)
    return () => window.clearTimeout(id)
  }, [totalUnread])

  const toggleLocale = () => setLocale(locale === 'ar' ? 'en' : 'ar')

  const hero = variant === 'hero'
  const iconBtn =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 ' +
    (hero
      ? 'bg-white/15 text-white hover:bg-white/25'
      : 'bg-gray-100 text-[#1B7F7A] dark:bg-slate-700 dark:text-slate-100')

  return (
    <>
    <header
      className={
        'sticky top-0 z-50 -mx-4 -mt-2 mb-3 px-4 pb-3 pt-2 backdrop-blur-md ' +
        (hero
          ? 'border-b border-white/15 bg-[#1B7F7A]/25'
          : 'border-b border-gray-100/80 bg-white/80 dark:border-slate-700/80 dark:bg-slate-900/75')
      }
      dir={dir}
    >
      <div className="flex items-center justify-between gap-2">
        {showBrand ? (
          <div className={hero ? 'drop-shadow-md' : ''}>
            <QabbooLogo variant={hero ? 'hero' : 'header'} />
          </div>
        ) : title ? (
          <h1
            className={
              'truncate text-lg font-bold ' +
              (hero ? 'text-white' : 'text-[#1F2937] dark:text-slate-100')
            }
          >
            {title}
          </h1>
        ) : (
          <span />
        )}
        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
          {rightSlot ??
            (hasUser ? (
              <>
                <Link
                  href="/profile"
                  className={
                    'flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-transform active:scale-95 ' +
                    (hero
                      ? 'bg-white/15 text-white hover:bg-white/25'
                      : 'bg-[#E6F4F3] text-[#1B7F7A] dark:bg-[#134e4a] dark:text-slate-100')
                  }
                  aria-label={t('header_profile')}
                >
                  <UserCircle className="h-6 w-6" weight="fill" />
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className={
                      hero
                        ? 'flex h-9 w-9 items-center justify-center rounded-full bg-[#FF8C42]/80 text-white hover:bg-[#FF8C42] transition-transform hover:scale-105 active:scale-95'
                        : 'flex h-9 w-9 items-center justify-center rounded-full bg-[#FF8C42]/15 text-[#FF8C42] hover:bg-[#FF8C42]/25 dark:bg-[#FF8C42]/20 transition-transform hover:scale-105 active:scale-95'
                    }
                    aria-label="لوحة التحكم"
                  >
                    <ShieldStar className="h-5 w-5" weight="fill" />
                  </Link>
                ) : null}
              </>
            ) : (
              <Link
                href="/auth/login"
                className={
                  'rounded-full px-5 py-2 text-sm font-bold transition-transform hover:scale-105 active:scale-95 ' +
                  (hero
                    ? 'bg-[#FF8C42] text-white hover:bg-[#e87a35]'
                    : 'bg-[#1B7F7A] text-white dark:bg-[#FF8C42] dark:text-white')
                }
              >
                {t('header_login')}
              </Link>
            ))}
          <button type="button" onClick={toggleLocale} className={iconBtn} aria-label={t('header_switchLang')}>
            <GlobeSimple className="h-5 w-5" weight="bold" />
          </button>
          <ThemeToggle tone={hero ? 'light' : 'solid'} />
          <Link
            href="/notifications"
            className={
              'relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ' +
              (hero
                ? 'bg-white/15 text-white hover:bg-white/25 '
                : 'bg-gray-100 text-[#1B7F7A] hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 ') +
              (shakeBell && totalUnread > 0 ? 'animate-bell-shake' : '')
            }
            aria-label={t('header_notifications')}
          >
            <Bell className="h-5 w-5" weight={totalUnread > 0 ? 'fill' : 'regular'} />
            {totalUnread > 0 && (
              <span className="absolute -left-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
    <FreePeriodBanner />
    </>
  )
}
