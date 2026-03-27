'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

type Log = {
  id: string
  action: string
  created_at: string
  details: Record<string, unknown>
}

function fmt(d: string) {
  try {
    return format(new Date(d), 'd MMM HH:mm', { locale: arSA })
  } catch {
    return d
  }
}

export function AdminNotifications({ userId }: { userId: string }) {
  const [target, setTarget] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [bTitle, setBTitle] = useState('')
  const [bBody, setBBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<Log[]>([])

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch(
        '/api/admin/audit?user_id=' +
          encodeURIComponent(userId) +
          '&search=notification&limit=50&page=1'
      )
      const data = await res.json()
      const list = (data.logs ?? []) as Log[]
      setLogs(list.filter((l) => String(l.action).includes('notification')))
    } catch {
      setLogs([])
    }
  }, [userId])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const sendOne = async () => {
    if (!target.trim() || !title.trim() || !body.trim()) return
    setLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          target_user_id: target.trim(),
          title,
          message: body,
        }),
      })
      setTarget('')
      setTitle('')
      setBody('')
      void loadLogs()
    } finally {
      setLoading(false)
    }
  }

  const broadcast = async () => {
    if (!bTitle.trim() || !bBody.trim()) return
    if (!confirm('إرسال إشعار لجميع المستخدمين؟')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: bTitle, body: bBody }),
      })
      const data = await res.json()
      if (!res.ok) alert(data.error || 'فشل')
      else {
        setBTitle('')
        setBBody('')
        void loadLogs()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 font-bold">إشعار لمستخدم</h3>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="User ID"
          className="mb-2 w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان"
          className="mb-2 w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="نص"
          rows={3}
          className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void sendOne()}
          className="mt-3 rounded-xl bg-[#1B7F7A] px-4 py-2 text-sm font-bold text-white"
        >
          إرسال
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 font-bold">إشعار جماعي</h3>
        <input
          value={bTitle}
          onChange={(e) => setBTitle(e.target.value)}
          placeholder="عنوان"
          className="mb-2 w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
        />
        <textarea
          value={bBody}
          onChange={(e) => setBBody(e.target.value)}
          placeholder="نص"
          rows={3}
          className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void broadcast()}
          className="mt-3 rounded-xl bg-[#FF8C42] px-4 py-2 text-sm font-bold text-white"
        >
          إرسال للجميع
        </button>
      </div>

      <div>
        <h3 className="mb-2 font-bold">سجل إرسال (من التدقيق)</h3>
        <div className="space-y-2">
          {logs.slice(0, 50).map((l) => (
            <div key={l.id} className="rounded-xl border border-gray-100 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
              <p className="font-bold">{l.action}</p>
              <p className="text-gray-500">{fmt(l.created_at)}</p>
              <pre className="mt-1 max-h-24 overflow-auto text-[10px]">{JSON.stringify(l.details, null, 2)}</pre>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-gray-500">لا سجلات</p>}
        </div>
      </div>
    </div>
  )
}
