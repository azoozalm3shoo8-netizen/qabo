'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type UserRow = {
  id: string
  full_name: string | null
  phone: string | null
  suspended: boolean
  created_at: string
  admin_role: string | null
  is_banned_active: boolean
}

function fmt(d: string) {
  try {
    return format(new Date(d), 'd MMM yyyy HH:mm', { locale: arSA })
  } catch {
    return d
  }
}

export function AdminUsers({ userId }: { userId: string }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [loading, setLoading] = useState(false)
  const [patching, setPatching] = useState<string | null>(null)
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banLoading, setBanLoading] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState<string | null>(null)
  const [nTitle, setNTitle] = useState('')
  const [nBody, setNBody] = useState('')
  const [roleValue, setRoleValue] = useState('viewer')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ user_id: userId, page: String(page), limit: '20', status })
      if (search) p.set('search', search)
      if (dateFrom) p.set('date_from', dateFrom)
      const res = await fetch('/api/admin/users?' + p.toString())
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users ?? [])
        setTotal(data.total ?? 0)
      }
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [userId, page, search, status, dateFrom])

  useEffect(() => {
    void load()
  }, [load])

  const suspendUser = async (targetId: string, suspend: boolean) => {
    setPatching(targetId)
    try {
      await fetch('/api/admin/users/' + targetId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, suspended: suspend }),
      })
      void load()
    } finally {
      setPatching(null)
    }
  }

  const banUser = async () => {
    if (!banTarget || !banReason.trim()) return
    setBanLoading(true)
    try {
      await fetch('/api/admin/users/' + banTarget.id + '/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, reason: banReason }),
      })
      setBanTarget(null)
      setBanReason('')
      void load()
    } finally {
      setBanLoading(false)
    }
  }

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch('/api/admin/users/' + id + '?user_id=' + encodeURIComponent(userId))
      const data = await res.json()
      if (res.ok) setDetail(data)
    } finally {
      setDetailLoading(false)
    }
  }

  const sendNotify = async (target: string) => {
    if (!nTitle.trim() || !nBody.trim()) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        target_user_id: target,
        title: nTitle,
        message: nBody,
      }),
    })
    setNotifyOpen(null)
    setNTitle('')
    setNBody('')
  }

  const assignRole = async (target: string) => {
    await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, target_user_id: target, role: roleValue }),
    })
    void load()
    if (detailId === target) void openDetail(target)
  }

  const pages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="all">الكل</option>
          <option value="active">نشط</option>
          <option value="suspended">معلّق</option>
          <option value="banned">محظور</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <p className="text-xs text-gray-500">إجمالي: {total}</p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white dark:bg-slate-800" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">لا مستخدمين</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  onClick={() => void openDetail(u.id)}
                  className="min-w-0 flex-1 text-right"
                >
                  <p className="font-bold text-gray-900 dark:text-white">{u.full_name || '—'}</p>
                  <p className="text-xs text-gray-500">{u.phone || '—'}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.admin_role && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {u.admin_role}
                      </span>
                    )}
                    {u.suspended && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">
                        معلّق
                      </span>
                    )}
                    {u.is_banned_active && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        محظور
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">{fmt(u.created_at)}</p>
                </button>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => suspendUser(u.id, !u.suspended)}
                    disabled={patching === u.id}
                    className="rounded-lg bg-yellow-100 px-3 py-1 text-[11px] font-bold text-yellow-800 disabled:opacity-50"
                  >
                    {u.suspended ? 'إلغاء تعليق' : 'تعليق'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBanTarget({ id: u.id, name: u.full_name || u.id })}
                    className="rounded-lg bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700"
                  >
                    حظر
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyOpen(u.id)}
                    className="rounded-lg bg-[#1B7F7A]/15 px-3 py-1 text-[11px] font-bold text-[#1B7F7A]"
                  >
                    إشعار
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 dark:border-slate-700">
                <select
                  value={roleValue}
                  onChange={(e) => setRoleValue(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="viewer">مشاهد</option>
                  <option value="support">دعم</option>
                  <option value="moderator">مشرف</option>
                  <option value="admin">مدير</option>
                  <option value="super_admin">مدير أعلى</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('تعيين الدور ' + roleValue + ' لهذا المستخدم؟')) void assignRole(u.id)
                  }}
                  className="rounded-lg bg-[#1B7F7A] px-3 py-1 text-[11px] font-bold text-white"
                >
                  تعيين دور
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold disabled:opacity-40 dark:bg-slate-700"
          >
            السابق
          </button>
          <span className="text-sm text-gray-600">
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold disabled:opacity-40 dark:bg-slate-700"
          >
            التالي
          </button>
        </div>
      )}

      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white">حظر</h3>
            <p className="text-sm text-gray-500">{banTarget.name}</p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              placeholder="سبب الحظر"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setBanTarget(null)
                  setBanReason('')
                }}
                className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-bold dark:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={banLoading || !banReason.trim()}
                onClick={() => void banUser()}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {notifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-800">
            <h3 className="font-bold">إرسال إشعار</h3>
            <input
              value={nTitle}
              onChange={(e) => setNTitle(e.target.value)}
              placeholder="عنوان"
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
            />
            <textarea
              value={nBody}
              onChange={(e) => setNBody(e.target.value)}
              placeholder="نص"
              rows={3}
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setNotifyOpen(null)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-bold">
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void sendNotify(notifyOpen)}
                className="flex-1 rounded-xl bg-[#1B7F7A] py-2 text-sm font-bold text-white"
              >
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}

      {detailId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">تفاصيل المستخدم</h3>
              <button type="button" onClick={() => setDetailId(null)} className="text-sm font-bold text-gray-500">
                إغلاق
              </button>
            </div>
            {detailLoading ? (
              <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-700" />
            ) : detail ? (
              <pre className="max-h-[60vh] overflow-auto rounded-xl bg-gray-50 p-3 text-[10px] dark:bg-slate-900">
                {JSON.stringify(detail, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-red-600">تعذر التحميل</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
