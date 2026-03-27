'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { PERMISSIONS, ROLE_LABELS, type AdminRole } from '@/lib/admin-auth'

type RoleRow = {
  user_id: string
  role: string
  role_label: string
  full_name: string | null
  created_at: string
}

function fmt(d: string) {
  try {
    return format(new Date(d), 'd MMM yyyy', { locale: arSA })
  } catch {
    return d
  }
}

const ROLE_KEYS: AdminRole[] = ['super_admin', 'admin', 'moderator', 'support', 'viewer']

export function AdminRoles({ userId }: { userId: string }) {
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [target, setTarget] = useState('')
  const [roleVal, setRoleVal] = useState<AdminRole>('viewer')
  const [assigning, setAssigning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/roles?user_id=' + encodeURIComponent(userId))
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ممنوع — مدير أعلى فقط')
      setRoles(data.roles ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ')
      setRoles([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const assign = async () => {
    if (!target.trim()) return
    setAssigning(true)
    try {
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, target_user_id: target.trim(), role: roleVal }),
      })
      setTarget('')
      void load()
    } finally {
      setAssigning(false)
    }
  }

  const remove = async (tid: string) => {
    if (!confirm('حذف الدور؟')) return
    if (tid === userId) {
      alert('لا يمكن تعديل دورك الخاص')
      return
    }
    await fetch('/api/admin/roles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, target_user_id: tid }),
    })
    void load()
  }

  const permEntries = Object.entries(PERMISSIONS) as [keyof typeof PERMISSIONS, readonly string[]][]

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 font-bold">تعيين دور</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="User ID"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <select
            value={roleVal}
            onChange={(e) => setRoleVal(e.target.value as AdminRole)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {ROLE_KEYS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={assigning}
            onClick={() => void assign()}
            className="rounded-xl bg-[#1B7F7A] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            تعيين
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-2 font-bold">صلاحيات الأدوار (مرجع)</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {permEntries.map(([perm, allowed]) => (
            <div key={perm} className="rounded-lg bg-gray-50 p-2 text-xs dark:bg-slate-900">
              <p className="font-bold text-gray-800 dark:text-slate-200">{perm}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {ROLE_KEYS.map((rk) => (
                  <span
                    key={rk}
                    className={
                      'rounded px-1.5 py-0.5 ' +
                      (allowed.includes(rk) ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-600')
                    }
                  >
                    {allowed.includes(rk) ? '✓' : '✗'} {ROLE_LABELS[rk]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((r) => (
            <div
              key={r.user_id}
              className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800"
            >
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{r.full_name || '—'}</p>
                <p className="font-mono text-[10px] text-gray-400">{r.user_id}</p>
                <span className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  {r.role_label}
                </span>
                <p className="text-[10px] text-gray-400">{fmt(r.created_at)}</p>
              </div>
              <button
                type="button"
                disabled={r.user_id === userId}
                onClick={() => void remove(r.user_id)}
                className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-40"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
