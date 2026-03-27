'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Log = {
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

function fmt(d: string) {
  try {
    return format(new Date(d), 'd MMM yyyy HH:mm', { locale: arSA })
  } catch {
    return d
  }
}

function actionStyle(action: string) {
  const a = action.toLowerCase()
  if (a.includes('ban') || a.includes('suspend')) return 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30'
  if (a.includes('role')) return 'border-purple-200 bg-purple-50 dark:border-purple-900/40 dark:bg-purple-950/30'
  if (a.includes('delete')) return 'border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/30'
  if (a.includes('ai')) return 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30'
  return 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
}

export function AdminAuditLog({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [actor, setActor] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({
        user_id: userId,
        page: String(page),
        limit: '30',
      })
      if (action.trim()) p.set('action', action.trim())
      if (actor.trim()) p.set('actor', actor.trim())
      if (search.trim()) p.set('search', search.trim())
      if (dateFrom) p.set('date_from', dateFrom)
      if (dateTo) p.set('date_to', dateTo)
      const res = await fetch('/api/admin/audit?' + p.toString())
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs ?? [])
        setTotal(data.total ?? 0)
      }
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [userId, page, action, actor, search, dateFrom, dateTo])

  useEffect(() => {
    void load()
  }, [load])

  const pages = Math.max(1, Math.ceil(total / 30))

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(1)
          }}
          placeholder="فلتر إجراء"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <input
          value={actor}
          onChange={(e) => {
            setActor(e.target.value)
            setPage(1)
          }}
          placeholder="معرّف المشرف"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="بحث نصي"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        logs.map((log) => (
          <div
            key={log.id}
            className={'rounded-xl border p-3 text-sm shadow-sm ' + actionStyle(log.action)}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{log.action}</p>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  {log.actor_email || log.actor_id.slice(0, 10)}
                </p>
                {log.target_id && (
                  <p className="text-xs text-gray-500">
                    {log.target_type}: {log.target_id.slice(0, 12)}
                  </p>
                )}
                {log.ip_address && <p className="text-[10px] text-gray-400">IP {log.ip_address}</p>}
              </div>
              <span className="text-[10px] text-gray-400">{fmt(log.created_at)}</span>
            </div>
            {Object.keys(log.details ?? {}).length > 0 && (
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/5 p-2 text-[10px] dark:bg-white/5">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        ))
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold disabled:opacity-40 dark:bg-slate-700"
          >
            السابق
          </button>
          <span className="py-2 text-sm">
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
    </div>
  )
}
