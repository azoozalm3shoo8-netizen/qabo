'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BellRinging,
  Buildings,
  ChartBar,
  CurrencyCircleDollar,
  Flag,
  GearSix,
  Robot,
  Scroll,
  ShieldCheck,
  Users,
} from '@phosphor-icons/react'
import { isAdminUserId } from '@/lib/admin-ids'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { AdminAI } from '@/app/admin/components/AdminAI'
import { AdminAuctions } from '@/app/admin/components/AdminAuctions'
import { AdminAuditLog } from '@/app/admin/components/AdminAuditLog'
import { AdminDashboard } from '@/app/admin/components/AdminDashboard'
import { AdminFinance } from '@/app/admin/components/AdminFinance'
import { AdminNotifications } from '@/app/admin/components/AdminNotifications'
import { AdminReports } from '@/app/admin/components/AdminReports'
import { AdminRoles } from '@/app/admin/components/AdminRoles'
import { AdminSettings } from '@/app/admin/components/AdminSettings'
import { AdminUsers } from '@/app/admin/components/AdminUsers'

export type AdminTabKey =
  | 'dashboard'
  | 'users'
  | 'auctions'
  | 'reports'
  | 'finance'
  | 'roles'
  | 'audit'
  | 'ai'
  | 'notifications'
  | 'settings'

const TAB_KEYS = new Set<string>([
  'dashboard',
  'users',
  'auctions',
  'reports',
  'finance',
  'roles',
  'audit',
  'ai',
  'notifications',
  'settings',
])

function AdminPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)

  const tabFromUrl = searchParams.get('tab') || 'dashboard'
  const activeTab: AdminTabKey = TAB_KEYS.has(tabFromUrl) ? (tabFromUrl as AdminTabKey) : 'dashboard'

  const setTab = useCallback(
    (t: AdminTabKey) => {
      const p = new URLSearchParams(searchParams.toString())
      p.set('tab', t)
      router.replace('/admin?' + p.toString())
    },
    [router, searchParams]
  )

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) {
      router.replace('/')
      return
    }
    if (!isAdminUserId(u.user_id)) {
      router.replace('/')
      return
    }
    setUserId(u.user_id)
  }, [router])

  const tabs = useMemo(
    () =>
      [
        { key: 'dashboard' as const, label: 'الرئيسية', Icon: ChartBar },
        { key: 'users' as const, label: 'المستخدمين', Icon: Users },
        { key: 'auctions' as const, label: 'المزادات', Icon: Buildings },
        { key: 'reports' as const, label: 'البلاغات', Icon: Flag },
        { key: 'finance' as const, label: 'المالية', Icon: CurrencyCircleDollar },
        { key: 'roles' as const, label: 'الأدوار', Icon: ShieldCheck },
        { key: 'audit' as const, label: 'التدقيق', Icon: Scroll },
        { key: 'ai' as const, label: 'الذكاء الاصطناعي', Icon: Robot },
        { key: 'notifications' as const, label: 'الإشعارات', Icon: BellRinging },
        { key: 'settings' as const, label: 'الإعدادات', Icon: GearSix },
      ] as const,
    []
  )

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] dark:bg-slate-900" dir="rtl">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1B7F7A] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-12 dark:bg-slate-900" dir="rtl">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg dark:bg-slate-700"
          aria-label="رجوع"
        >
          ←
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white">لوحة التحكم — قبو</h1>
        <div className="h-10 w-10" />
      </header>

      <div className="sticky top-[57px] z-20 overflow-x-auto border-b border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex min-w-max gap-1 px-2 py-2">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition-all sm:text-sm ' +
                (activeTab === key
                  ? 'bg-[#1B7F7A] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600')
              }
            >
              <Icon className="h-4 w-4 shrink-0" weight={activeTab === key ? 'fill' : 'regular'} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {activeTab === 'dashboard' && <AdminDashboard userId={userId} onGoTab={(t) => setTab(t as AdminTabKey)} />}
        {activeTab === 'users' && <AdminUsers userId={userId} />}
        {activeTab === 'auctions' && <AdminAuctions userId={userId} />}
        {activeTab === 'reports' && <AdminReports userId={userId} />}
        {activeTab === 'finance' && <AdminFinance userId={userId} />}
        {activeTab === 'roles' && <AdminRoles userId={userId} />}
        {activeTab === 'audit' && <AdminAuditLog userId={userId} />}
        {activeTab === 'ai' && <AdminAI userId={userId} />}
        {activeTab === 'notifications' && <AdminNotifications userId={userId} />}
        {activeTab === 'settings' && <AdminSettings userId={userId} />}
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] dark:bg-slate-900" dir="rtl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1B7F7A] border-t-transparent" />
        </div>
      }
    >
      <AdminPageInner />
    </Suspense>
  )
}
