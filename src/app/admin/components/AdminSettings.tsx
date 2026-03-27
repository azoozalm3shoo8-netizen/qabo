'use client'

import { useCallback, useEffect, useState } from 'react'

export function AdminSettings({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [aiKeys, setAiKeys] = useState<Record<string, boolean> | null>(null)
  const [loading, setLoading] = useState(true)
  const [commission, setCommission] = useState('5')
  const [minPrice, setMinPrice] = useState('10')
  const [maxDays, setMaxDays] = useState('30')
  const [maintenance, setMaintenance] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings?user_id=' + encodeURIComponent(userId))
      const data = await res.json()
      setSettings(data.settings ?? {})
      setAiKeys(data.ai_keys ?? null)
      const s = data.settings ?? {}
      const cr = s.commission_rate ?? s.commission_percent
      if (cr != null) setCommission(String(cr))
      const mn = s.min_starting_price ?? s.auction_min_price
      if (mn != null) setMinPrice(String(mn))
      const md = s.max_auction_days
      if (md != null) setMaxDays(String(md))
      if (typeof s.maintenance_mode === 'boolean') setMaintenance(s.maintenance_mode)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const saveBatch = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          settings: {
            commission_rate: Number(commission) || 0,
            min_starting_price: Number(minPrice) || 0,
            max_auction_days: Number(maxDays) || 0,
            maintenance_mode: maintenance,
          },
        }),
      })
      void load()
    } finally {
      setSaving(false)
    }
  }

  const testTelegram = async () => {
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, test_telegram: true }),
    })
    alert('تم طلب الاختبار (تحقق من البيئة)')
  }

  const exportCsv = (type: string) => {
    window.open(`/api/admin/export?user_id=${encodeURIComponent(userId)}&type=${type}`, '_blank')
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white dark:bg-slate-800" />
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-3 font-bold">عموم المنصة</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-gray-500">عمولة %</span>
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="text-sm">
            <span className="text-gray-500">حد أدنى سعر بداية</span>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="text-sm">
            <span className="text-gray-500">أقصى مدة مزاد (أيام)</span>
            <input
              type="number"
              value={maxDays}
              onChange={(e) => setMaxDays(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} />
          وضع الصيانة (تعليق المنصة)
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveBatch()}
          className="mt-4 rounded-xl bg-[#1B7F7A] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          حفظ الإعدادات
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-2 font-bold">تيليجرام</h3>
        <p className="text-xs text-gray-500">يُفضّل ضبط TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID في متغيرات الاستضافة.</p>
        <button
          type="button"
          onClick={() => void testTelegram()}
          className="mt-3 rounded-xl bg-[#FF8C42] px-4 py-2 text-sm font-bold text-white"
        >
          اختبار الاتصال
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-2 font-bold">تصدير CSV</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportCsv('users')}
            className="rounded-lg border px-3 py-2 text-sm font-bold dark:border-slate-600"
          >
            مستخدمين
          </button>
          <button
            type="button"
            onClick={() => exportCsv('auctions')}
            className="rounded-lg border px-3 py-2 text-sm font-bold dark:border-slate-600"
          >
            مزادات
          </button>
          <button
            type="button"
            onClick={() => exportCsv('orders')}
            className="rounded-lg border px-3 py-2 text-sm font-bold dark:border-slate-600"
          >
            معاملات
          </button>
        </div>
      </div>

      {aiKeys && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-2 font-bold">مفاتيح AI (بيئة الخادم)</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(aiKeys).map(([k, ok]) => (
              <span key={k} className={ok ? 'text-green-600' : 'text-amber-600'}>
                {ok ? '✅' : '⚠️'} {k}
              </span>
            ))}
          </div>
        </div>
      )}

      <details className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <summary className="cursor-pointer font-bold">JSON الخام</summary>
        <pre className="mt-2 max-h-48 overflow-auto text-[10px]">{JSON.stringify(settings, null, 2)}</pre>
      </details>
    </div>
  )
}
