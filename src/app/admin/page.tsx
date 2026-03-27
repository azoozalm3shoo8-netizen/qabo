'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAdminUserId } from '@/lib/admin-ids'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Stats = {
  total_auctions: number
  active_auctions: number
  ended_auctions: number
  total_users: number
  total_orders: number
  total_revenue: number
  recent_auctions: Array<{
    id: string
    title: string
    status: string
    current_bid: number
    created_at: string
    seller_name: string
  }>
  recent_reports: Array<{
    id: string
    reason: string
    status: string
    created_at: string
    reporter_name: string
    auction_title: string | null
  }>
}

type UserRow = {
  id: string
  full_name: string | null
  phone: string | null
  suspended: boolean
  created_at: string
  admin_role: string | null
  is_banned_active: boolean
}

type AuditRow = {
  id: string
  actor_id: string
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

type RoleRow = {
  user_id: string
  role: string
  role_label: string
  full_name: string | null
  created_at: string
}

type Tab = 'dashboard' | 'users' | 'auctions' | 'roles' | 'audit' | 'settings'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'الرئيسية', icon: '📊' },
  { key: 'users', label: 'المستخدمين', icon: '👥' },
  { key: 'auctions', label: 'المزادات', icon: '🏛️' },
  { key: 'roles', label: 'الأدوار', icon: '🛡️' },
  { key: 'audit', label: 'سجل التدقيق', icon: '📋' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
]

export default function AdminPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Users state
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersStatus, setUsersStatus] = useState('all')
  const [usersLoading, setUsersLoading] = useState(false)

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Roles state
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)

  // Ban dialog
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banLoading, setBanLoading] = useState(false)

  // Role assign dialog
  const [roleTarget, setRoleTarget] = useState('')
  const [roleValue, setRoleValue] = useState('viewer')
  const [roleAssignLoading, setRoleAssignLoading] = useState(false)

  const [patching, setPatching] = useState<string | null>(null)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) { router.replace('/'); return }
    if (!isAdminUserId(u.user_id)) { router.replace('/'); return }
    setUserId(u.user_id)
  }, [router])

  // Dashboard stats
  const loadStats = useCallback(async (uid: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats?user_id=' + encodeURIComponent(uid))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر التحميل')
      setStats(data as Stats)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }, [])

  // Users
  const loadUsers = useCallback(async (uid: string, page = 1, search = '', status = 'all') => {
    setUsersLoading(true)
    try {
      const p = new URLSearchParams({ user_id: uid, page: String(page), limit: '20', status })
      if (search) p.set('search', search)
      const res = await fetch('/api/admin/users?' + p.toString())
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users ?? [])
      setUsersTotal(data.total ?? 0)
    } catch { setUsers([]) }
    finally { setUsersLoading(false) }
  }, [])

  // Audit
  const loadAudit = useCallback(async (uid: string) => {
    setAuditLoading(true)
    try {
      const res = await fetch('/api/admin/audit?user_id=' + encodeURIComponent(uid))
      const data = await res.json()
      if (res.ok) setAuditLogs(data.logs ?? [])
    } catch { /* */ }
    finally { setAuditLoading(false) }
  }, [])

  // Roles
  const loadRoles = useCallback(async (uid: string) => {
    setRolesLoading(true)
    try {
      const res = await fetch('/api/admin/roles?user_id=' + encodeURIComponent(uid))
      const data = await res.json()
      if (res.ok) setRoles(data.roles ?? [])
    } catch { /* */ }
    finally { setRolesLoading(false) }
  }, [])

  useEffect(() => {
    if (!userId) return
    if (activeTab === 'dashboard') void loadStats(userId)
    if (activeTab === 'users') void loadUsers(userId, usersPage, usersSearch, usersStatus)
    if (activeTab === 'audit') void loadAudit(userId)
    if (activeTab === 'roles') void loadRoles(userId)
  }, [userId, activeTab, usersPage, usersSearch, usersStatus, loadStats, loadUsers, loadAudit, loadRoles])

  // Actions
  const suspendUser = async (targetId: string, suspend: boolean) => {
    if (!userId) return
    setPatching(targetId)
    try {
      await fetch('/api/admin/users/' + targetId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, suspended: suspend }),
      })
      void loadUsers(userId, usersPage, usersSearch, usersStatus)
    } catch { /* */ }
    finally { setPatching(null) }
  }

  const banUser = async () => {
    if (!userId || !banTarget || !banReason.trim()) return
    setBanLoading(true)
    try {
      await fetch('/api/admin/users/' + banTarget.id + '/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, reason: banReason }),
      })
      setBanTarget(null)
      setBanReason('')
      void loadUsers(userId, usersPage, usersSearch, usersStatus)
    } catch { /* */ }
    finally { setBanLoading(false) }
  }

  const assignRole = async () => {
    if (!userId || !roleTarget.trim()) return
    setRoleAssignLoading(true)
    try {
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, target_user_id: roleTarget, role: roleValue }),
      })
      setRoleTarget('')
      void loadRoles(userId)
    } catch { /* */ }
    finally { setRoleAssignLoading(false) }
  }

  const deleteRole = async (targetId: string) => {
    if (!userId) return
    try {
      await fetch('/api/admin/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, target_user_id: targetId }),
      })
      void loadRoles(userId)
    } catch { /* */ }
  }

  const markReportReviewed = async (reportId: string) => {
    if (!userId) return
    setPatching(reportId)
    try {
      await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, status: 'reviewed', user_id: userId }),
      })
      void loadStats(userId)
    } catch { /* */ }
    finally { setPatching(null) }
  }

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'd MMM yyyy HH:mm', { locale: arSA }) } catch { return d }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-lg" aria-label="رجوع">←</Link>
        <h1 className="font-bold text-lg text-gray-900 dark:text-white flex-1 text-center">🛡️ لوحة التحكم</h1>
        <div className="w-10" />
      </header>

      {/* Tabs */}
      <div className="sticky top-[57px] z-20 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max px-2 py-2 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ' +
                (activeTab === tab.key
                  ? 'bg-[#1B7F7A] text-white shadow-md'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600')
              }
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">

        {/* ===== DASHBOARD ===== */}
        {activeTab === 'dashboard' && (
          <>
            {loading && (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-2xl animate-pulse border border-gray-100 dark:border-slate-700" />)}
              </div>
            )}
            {!loading && error && <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm border border-red-100">{error}</div>}
            {!loading && stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'إجمالي المزادات', value: stats.total_auctions, icon: '📊', color: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'مزادات نشطة', value: stats.active_auctions, icon: '🟢', color: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'مزادات منتهية', value: stats.ended_auctions, icon: '🔴', color: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'المستخدمين', value: stats.total_users, icon: '👥', color: 'bg-purple-50 dark:bg-purple-900/20' },
                    { label: 'الطلبات', value: stats.total_orders, icon: '📦', color: 'bg-orange-50 dark:bg-orange-900/20' },
                    { label: 'الإيرادات', value: (stats.total_revenue || 0).toLocaleString() + ' ر.س', icon: '💰', color: 'bg-emerald-50 dark:bg-emerald-900/20' },
ى
cat > src/app/admin/page.tsx << 'ENDOFFILE'
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAdminUserId } from '@/lib/admin-ids'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Stats = {
  total_auctions: number
  active_auctions: number
  ended_auctions: number
  total_users: number
  total_orders: number
  total_revenue: number
  recent_auctions: Array<{
    id: string
    title: string
    status: string
    current_bid: number
    created_at: string
    seller_name: string
  }>
  recent_reports: Array<{
    id: string
    reason: string
    status: string
    created_at: string
    reporter_name: string
    auction_title: string | null
  }>
}

type UserRow = {
  id: string
  full_name: string | null
  phone: string | null
  suspended: boolean
  created_at: string
  admin_role: string | null
  is_banned_active: boolean
}

type AuditRow = {
  id: string
  actor_id: string
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

type RoleRow = {
  user_id: string
  role: string
  role_label: string
  full_name: string | null
  created_at: string
}

type Tab = 'dashboard' | 'users' | 'auctions' | 'roles' | 'audit' | 'settings'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'الرئيسية', icon: '📊' },
  { key: 'users', label: 'المستخدمين', icon: '👥' },
  { key: 'auctions', label: 'المزادات', icon: '🏛️' },
  { key: 'roles', label: 'الأدوار', icon: '🛡️' },
  { key: 'audit', label: 'سجل التدقيق', icon: '📋' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
]

export default function AdminPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Users state
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersStatus, setUsersStatus] = useState('all')
  const [usersLoading, setUsersLoading] = useState(false)

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Roles state
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)

  // Ban dialog
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banLoading, setBanLoading] = useState(false)

  // Role assign dialog
  const [roleTarget, setRoleTarget] = useState('')
  const [roleValue, setRoleValue] = useState('viewer')
  const [roleAssignLoading, setRoleAssignLoading] = useState(false)

  const [patching, setPatching] = useState<string | null>(null)

  useEffect(() => {
    const u = readQaboUserFromStorage()
    if (!u) { router.replace('/'); return }
    if (!isAdminUserId(u.user_id)) { router.replace('/'); return }
    setUserId(u.user_id)
  }, [router])

  // Dashboard stats
  const loadStats = useCallback(async (uid: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats?user_id=' + encodeURIComponent(uid))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'تعذر التحميل')
      setStats(data as Stats)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }, [])

  // Users
  const loadUsers = useCallback(async (uid: string, page = 1, search = '', status = 'all') => {
    setUsersLoading(true)
    try {
      const p = new URLSearchParams({ user_id: uid, page: String(page), limit: '20', status })
      if (search) p.set('search', search)
      const res = await fetch('/api/admin/users?' + p.toString())
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users ?? [])
      setUsersTotal(data.total ?? 0)
    } catch { setUsers([]) }
    finally { setUsersLoading(false) }
  }, [])

  // Audit
  const loadAudit = useCallback(async (uid: string) => {
    setAuditLoading(true)
    try {
      const res = await fetch('/api/admin/audit?user_id=' + encodeURIComponent(uid))
      const data = await res.json()
      if (res.ok) setAuditLogs(data.logs ?? [])
    } catch { /* */ }
    finally { setAuditLoading(false) }
  }, [])

  // Roles
  const loadRoles = useCallback(async (uid: string) => {
    setRolesLoading(true)
    try {
      const res = await fetch('/api/admin/roles?user_id=' + encodeURIComponent(uid))
      const data = await res.json()
      if (res.ok) setRoles(data.roles ?? [])
    } catch { /* */ }
    finally { setRolesLoading(false) }
  }, [])

  useEffect(() => {
    if (!userId) return
    if (activeTab === 'dashboard') void loadStats(userId)
    if (activeTab === 'users') void loadUsers(userId, usersPage, usersSearch, usersStatus)
    if (activeTab === 'audit') void loadAudit(userId)
    if (activeTab === 'roles') void loadRoles(userId)
  }, [userId, activeTab, usersPage, usersSearch, usersStatus, loadStats, loadUsers, loadAudit, loadRoles])

  // Actions
  const suspendUser = async (targetId: string, suspend: boolean) => {
    if (!userId) return
    setPatching(targetId)
    try {
      await fetch('/api/admin/users/' + targetId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, suspended: suspend }),
      })
      void loadUsers(userId, usersPage, usersSearch, usersStatus)
    } catch { /* */ }
    finally { setPatching(null) }
  }

  const banUser = async () => {
    if (!userId || !banTarget || !banReason.trim()) return
    setBanLoading(true)
    try {
      await fetch('/api/admin/users/' + banTarget.id + '/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, reason: banReason }),
      })
      setBanTarget(null)
      setBanReason('')
      void loadUsers(userId, usersPage, usersSearch, usersStatus)
    } catch { /* */ }
    finally { setBanLoading(false) }
  }

  const assignRole = async () => {
    if (!userId || !roleTarget.trim()) return
    setRoleAssignLoading(true)
    try {
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, target_user_id: roleTarget, role: roleValue }),
      })
      setRoleTarget('')
      void loadRoles(userId)
    } catch { /* */ }
    finally { setRoleAssignLoading(false) }
  }

  const deleteRole = async (targetId: string) => {
    if (!userId) return
    try {
      await fetch('/api/admin/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, target_user_id: targetId }),
      })
      void loadRoles(userId)
    } catch { /* */ }
  }

  const markReportReviewed = async (reportId: string) => {
    if (!userId) return
    setPatching(reportId)
    try {
      await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, status: 'reviewed', user_id: userId }),
      })
      void loadStats(userId)
    } catch { /* */ }
    finally { setPatching(null) }
  }

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'd MMM yyyy HH:mm', { locale: arSA }) } catch { return d }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-lg" aria-label="رجوع">←</Link>
        <h1 className="font-bold text-lg text-gray-900 dark:text-white flex-1 text-center">🛡️ لوحة التحكم</h1>
        <div className="w-10" />
      </header>

      {/* Tabs */}
      <div className="sticky top-[57px] z-20 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max px-2 py-2 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ' +
                (activeTab === tab.key
                  ? 'bg-[#1B7F7A] text-white shadow-md'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600')
              }
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">

        {/* ===== DASHBOARD ===== */}
        {activeTab === 'dashboard' && (
          <>
            {loading && (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-2xl animate-pulse border border-gray-100 dark:border-slate-700" />)}
              </div>
            )}
            {!loading && error && <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm border border-red-100">{error}</div>}
            {!loading && stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: 'إجمالي المزادات', value: stats.total_auctions, icon: '📊', color: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'مزادات نشطة', value: stats.active_auctions, icon: '🟢', color: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'مزادات منتهية', value: stats.ended_auctions, icon: '🔴', color: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'المستخدمين', value: stats.total_users, icon: '👥', color: 'bg-purple-50 dark:bg-purple-900/20' },
                    { label: 'الطلبات', value: stats.total_orders, icon: '📦', color: 'bg-orange-50 dark:bg-orange-900/20' },
                    { label: 'الإيرادات', value: (stats.total_revenue || 0).toLocaleString() + ' ر.س', icon: '💰', color: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  ].map(s => (
                    <div key={s.label} className={'rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm ' + s.color}>
                      <span className="text-2xl">{s.icon}</span>
                      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                <section>
                  <h2 className="font-bold text-gray-900 dark:text-white mb-2">آخر المزادات</h2>
                  <div className="space-y-2">
                    {stats.recent_auctions.length === 0
                      ? <p className="text-sm text-gray-500">لا توجد مزادات</p>
                      : stats.recent_auctions.slice(0, 10).map(a => (
                        <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 text-sm shadow-sm">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{a.title}</p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600 dark:text-slate-400">
                            <span className={'px-2 py-0.5 rounded-full ' + (a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>{a.status}</span>
                            <span>{a.seller_name}</span>
                            <span className="font-bold text-[#1B7F7A]">{Number(a.current_bid).toLocaleString()} ر.س</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{fmtDate(a.created_at)}</p>
                        </div>
                      ))}
                  </div>
                </section>

                <section>
                  <h2 className="font-bold text-gray-900 dark:text-white mb-2">آخر البلاغات</h2>
                  <div className="space-y-2">
                    {stats.recent_reports.length === 0
                      ? <p className="text-sm text-gray-500">لا توجد بلاغات</p>
                      : stats.recent_reports.map(r => (
                        <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 text-sm shadow-sm">
                          <p className="font-semibold text-gray-900 dark:text-white">{r.reason}</p>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">من: {r.reporter_name}</p>
                          {r.auction_title && <p className="text-xs text-gray-500 mt-0.5">مزاد: {r.auction_title}</p>}
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + (r.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-[#FF8C42]/15 text-[#C2410C]')}>{r.status}</span>
                            <button type="button" disabled={patching === r.id || r.status === 'reviewed'} onClick={() => void markReportReviewed(r.id)} className="text-xs font-bold text-[#1B7F7A] disabled:opacity-40">
                              {patching === r.id ? '...' : 'تعيين كمراجَع'}
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{fmtDate(r.created_at)}</p>
                        </div>
                      ))}
                  </div>
                </section>
              </div>
            )}
          </>
        )}

        {/* ===== USERS ===== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="بحث بالاسم أو الهاتف..."
                value={usersSearch}
                onChange={e => { setUsersSearch(e.target.value); setUsersPage(1) }}
                className="flex-1 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B7F7A]"
              />
              <select
                value={usersStatus}
                onChange={e => { setUsersStatus(e.target.value); setUsersPage(1) }}
                className="rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm dark:text-white"
              >
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="suspended">معلّق</option>
                <option value="banned">محظور</option>
              </select>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400">إجمالي: {usersTotal} مستخدم</p>

            {usersLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">لا يوجد مستخدمين</p>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{u.full_name || '—'}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{u.phone || '—'}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.admin_role && <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold">{u.admin_role}</span>}
                          {u.suspended && <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold">معلّق</span>}
                          {u.is_banned_active && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">محظور</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{fmtDate(u.created_at)}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => suspendUser(u.id, !u.suspended)}
                          disabled={patching === u.id}
                          className={'px-3 py-1 rounded-lg text-[11px] font-bold ' + (u.suspended ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200')}
                        >
                          {u.suspended ? 'إلغاء التعليق' : 'تعليق'}
                        </button>
                        <button
                          onClick={() => setBanTarget({ id: u.id, name: u.full_name || u.id })}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          حظر
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {usersTotal > 20 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => setUsersPage(p => Math.max(1, p - 1))} disabled={usersPage <= 1} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold disabled:opacity-40">السابق</button>
                <span className="text-sm text-gray-600 dark:text-slate-400">صفحة {usersPage} من {Math.ceil(usersTotal / 20)}</span>
                <button onClick={() => setUsersPage(p => p + 1)} disabled={usersPage >= Math.ceil(usersTotal / 20)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-bold disabled:opacity-40">التالي</button>
              </div>
            )}
          </div>
        )}

        {/* ===== AUCTIONS ===== */}
        {activeTab === 'auctions' && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_auctions}</p>
                    <p className="text-[10px] text-gray-500">إجمالي</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700">
                    <p className="text-2xl font-bold text-green-700">{stats.active_auctions}</p>
                    <p className="text-[10px] text-gray-500">نشط</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700">
                    <p className="text-2xl font-bold text-red-700">{stats.ended_auctions}</p>
                    <p className="text-[10px] text-gray-500">منتهي</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {stats.recent_auctions.map(a => (
                    <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 dark:text-white truncate">{a.title}</p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs">
                            <span className={'px-2 py-0.5 rounded-full ' + (a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>{a.status}</span>
                            <span className="text-gray-500">{a.seller_name}</span>
                            <span className="font-bold text-[#1B7F7A]">{Number(a.current_bid).toLocaleString()} ر.س</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{fmtDate(a.created_at)}</p>
                        </div>
                        <Link href={'/auction/' + a.id} className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#1B7F7A]/10 text-[#1B7F7A] hover:bg-[#1B7F7A]/20">عرض</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ===== ROLES ===== */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">تعيين دور جديد</h3>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="معرّف المستخدم (User ID)"
                  value={roleTarget}
                  onChange={e => setRoleTarget(e.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-4 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B7F7A]"
                />
                <select
                  value={roleValue}
                  onChange={e => setRoleValue(e.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-4 py-2.5 text-sm dark:text-white"
                >
                  <option value="viewer">مشاهد</option>
                  <option value="support">دعم فني</option>
                  <option value="moderator">مشرف</option>
                  <option value="admin">مدير</option>
                  <option value="super_admin">مدير أعلى</option>
                </select>
                <button
                  onClick={() => void assignRole()}
                  disabled={roleAssignLoading || !roleTarget.trim()}
                  className="rounded-xl bg-[#1B7F7A] text-white px-4 py-2.5 text-sm font-bold hover:bg-[#156661] disabled:opacity-50 transition-colors"
                >
                  {roleAssignLoading ? 'جاري...' : 'تعيين الدور'}
                </button>
              </div>
            </div>

            {rolesLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : roles.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">لا توجد أدوار إدارية</p>
            ) : (
              <div className="space-y-2">
                {roles.map(r => (
                  <div key={r.user_id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{r.full_name || '—'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{r.user_id}</p>
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold">{r.role_label}</span>
                      </div>
                      <button onClick={() => void deleteRole(r.user_id)} className="px-3 py-1 rounded-lg text-[11px] font-bold bg-red-100 text-red-700 hover:bg-red-200">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== AUDIT ===== */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            {auditLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">لا توجد سجلات تدقيق</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 shadow-sm text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">{log.action}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">بواسطة: {log.actor_email || log.actor_id.slice(0, 8)}</p>
                      {log.target_id && <p className="text-xs text-gray-400">الهدف: {log.target_type} / {log.target_id.slice(0, 8)}</p>}
                      {log.ip_address && <p className="text-[10px] text-gray-400">IP: {log.ip_address}</p>}
                    </div>
                    <p className="text-[10px] text-gray-400 whitespace-nowrap">{fmtDate(log.created_at)}</p>
                  </div>
                  {Object.keys(log.details).length > 0 && (
                    <pre className="mt-2 text-[10px] bg-gray-50 dark:bg-slate-900 rounded-lg p-2 overflow-x-auto text-gray-600 dark:text-slate-400">{JSON.stringify(log.details, null, 2)}</pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== SETTINGS ===== */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">⚙️ إعدادات النظام</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">قريباً — إعدادات عمولة المنصة، حدود المزادات، إعدادات الإشعارات، ربط تيليجرام.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">🤖 تيليجرام</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">أضف TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID في متغيرات البيئة لتفعيل تنبيهات تيليجرام الفورية.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">📊 تصدير البيانات</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">قريباً — تصدير المستخدمين والمزادات والتقارير كملفات CSV.</p>
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">حظر المستخدم</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">{banTarget.name}</p>
            <textarea
              placeholder="سبب الحظر (إلزامي)..."
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
              rows={3}
            />
            <div className="flex gap-2">
              <button onClick={() => { setBanTarget(null); setBanReason('') }} className="flex-1 rounded-xl bg-gray-100 dark:bg-slate-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300">إلغاء</button>
              <button onClick={() => void banUser()} disabled={banLoading || !banReason.trim()} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {banLoading ? 'جاري...' : 'تأكيد الحظر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
