'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type Tool = 'moderate' | 'image' | 'toxicity' | 'autoscan' | 'daily' | 'classify'

export function AdminAI({ userId }: { userId: string }) {
  const [active, setActive] = useState<Tool | null>(null)
  const [keys, setKeys] = useState<Record<string, boolean> | null>(null)
  const [textMod, setTextMod] = useState('')
  const [modRes, setModRes] = useState<unknown>(null)
  const [imgUrl, setImgUrl] = useState('')
  const [imgRes, setImgRes] = useState<unknown>(null)
  const [toxText, setToxText] = useState('')
  const [toxRes, setToxRes] = useState<unknown>(null)
  const [classUrl, setClassUrl] = useState('')
  const [classRes, setClassRes] = useState<unknown>(null)
  const [scanRes, setScanRes] = useState<unknown[]>([])
  const [scanning, setScanning] = useState(false)
  const [dailyRes, setDailyRes] = useState('')
  const [loading, setLoading] = useState(false)

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings?user_id=' + encodeURIComponent(userId))
      const data = await res.json()
      setKeys(data.ai_keys ?? null)
    } catch {
      setKeys(null)
    }
  }, [userId])

  useEffect(() => {
    void loadKeys()
    try {
      const raw = sessionStorage.getItem('qabo_admin_autoscan')
      if (raw) {
        setScanRes(JSON.parse(raw) as unknown[])
        sessionStorage.removeItem('qabo_admin_autoscan')
        setActive('autoscan')
      }
    } catch {
      /* */
    }
  }, [loadKeys])

  const tools: { id: Tool; title: string; desc: string }[] = [
    { id: 'moderate', title: 'فحص النص', desc: 'OpenAI Moderation أو قائمة محلية' },
    { id: 'image', title: 'فحص الصور', desc: 'Hugging Face NSFW' },
    { id: 'toxicity', title: 'تحليل السمية', desc: 'Google Perspective' },
    { id: 'autoscan', title: 'فحص تلقائي', desc: 'آخر 50 مزاد نشط' },
    { id: 'daily', title: 'تقرير يومي', desc: 'Gemini + إحصائيات' },
    { id: 'classify', title: 'تصنيف صورة', desc: 'Cloudflare AI أو محلي' },
  ]

  const runModerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai/moderate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, text: textMod }),
      })
      setModRes(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const runImage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai/check-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, image_url: imgUrl }),
      })
      setImgRes(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const runToxicity = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai/analyze-toxicity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, text: toxText }),
      })
      setToxRes(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const runScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/api/admin/ai/auto-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      setScanRes((data.results ?? []) as unknown[])
    } finally {
      setScanning(false)
    }
  }

  const runDaily = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai/daily-report?user_id=' + encodeURIComponent(userId))
      const data = await res.json()
      setDailyRes(data.ai_summary || JSON.stringify(data.stats))
    } finally {
      setLoading(false)
    }
  }

  const runClassify = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai/classify-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, image_url: classUrl }),
      })
      setClassRes(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const toxBar = (v: number) => {
    const pct = Math.min(100, Math.round(v * 100))
    const color = v < 0.3 ? 'bg-green-500' : v < 0.7 ? 'bg-yellow-500' : 'bg-red-500'
    return (
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
        <div className={'h-full ' + color} style={{ width: pct + '%' }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {keys && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 font-bold">حالة مفاتيح API</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(keys).map(([k, ok]) => (
              <span
                key={k}
                className={
                  'rounded-full px-2 py-1 ' +
                  (ok ? 'bg-green-100 text-green-800 dark:bg-green-900/40' : 'bg-amber-100 text-amber-900 dark:bg-amber-900/30')
                }
              >
                {ok ? '✅' : '⚠️'} {k}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={
              'rounded-2xl border p-4 text-right transition-all ' +
              (active === t.id
                ? 'border-[#1B7F7A] bg-[#E6F4F3] dark:border-[#2dd4bf] dark:bg-slate-800'
                : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800')
            }
          >
            <p className="font-bold text-gray-900 dark:text-white">{t.title}</p>
            <p className="mt-1 text-xs text-gray-500">{t.desc}</p>
            <span className="mt-2 inline-block text-xs font-bold text-[#1B7F7A]">تشغيل ←</span>
          </button>
        ))}
      </div>

      {active === 'moderate' && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <textarea
            value={textMod}
            onChange={(e) => setTextMod(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder="النص..."
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void runModerate()}
            className="mt-2 rounded-xl bg-[#1B7F7A] px-4 py-2 text-sm font-bold text-white"
          >
            فحص
          </button>
          {modRes != null && (
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-gray-50 p-2 text-xs dark:bg-slate-900">
              {JSON.stringify(modRes, null, 2)}
            </pre>
          )}
        </section>
      )}

      {active === 'image' && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <input
            value={imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            placeholder="رابط الصورة"
            className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void runImage()}
            className="mt-2 rounded-xl bg-[#FF8C42] px-4 py-2 text-sm font-bold text-white"
          >
            فحص
          </button>
          {imgRes != null && (
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-gray-50 p-2 text-xs dark:bg-slate-900">
              {JSON.stringify(imgRes, null, 2)}
            </pre>
          )}
        </section>
      )}

      {active === 'toxicity' && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <textarea
            value={toxText}
            onChange={(e) => setToxText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void runToxicity()}
            className="mt-2 rounded-xl bg-[#1B7F7A] px-4 py-2 text-sm font-bold text-white"
          >
            تحليل
          </button>
          {toxRes != null && (
            <div className="mt-3 space-y-2">
              {typeof toxRes === 'object' &&
                toxRes !== null &&
                'attributes' in toxRes &&
                typeof (toxRes as { attributes: Record<string, number> }).attributes === 'object' &&
                Object.entries((toxRes as { attributes: Record<string, number> }).attributes).map(([k, v]) => (
                  <div key={k}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{k}</span>
                      <span>{(v * 100).toFixed(0)}%</span>
                    </div>
                    {toxBar(v)}
                  </div>
                ))}
              <pre className="max-h-40 overflow-auto rounded-lg bg-gray-50 p-2 text-[10px] dark:bg-slate-900">
                {JSON.stringify(toxRes, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}

      {active === 'autoscan' && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            disabled={scanning}
            onClick={() => void runScan()}
            className="rounded-xl bg-[#FF8C42] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {scanning ? 'جاري الفحص...' : 'فحص تلقائي لكل المزادات النشطة'}
          </button>
          <div className="mt-4 space-y-2">
            {scanRes.map((row, i) => {
              const r = row as { auction_id: string; title: string; status: string; details?: string }
              return (
                <div
                  key={r.auction_id + i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 p-3 text-sm dark:border-slate-700"
                >
                  <div>
                    <p className="font-bold">{r.title}</p>
                    <p className="text-xs text-gray-500">
                      {r.status === 'clean' ? '✅ نظيف' : r.status === 'suspicious' ? '⚠️ مشتبه' : '🚫 مخالف'}
                    </p>
                    {r.details && <p className="text-[10px] text-gray-400">{r.details}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={'/auction/' + r.auction_id}
                      className="rounded-lg bg-[#1B7F7A]/15 px-2 py-1 text-xs font-bold text-[#1B7F7A]"
                    >
                      عرض
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {active === 'daily' && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runDaily()}
            className="rounded-xl bg-[#1B7F7A] px-4 py-2 text-sm font-bold text-white"
          >
            توليد تقرير اليوم
          </button>
          {dailyRes && <p className="mt-3 text-sm leading-relaxed text-gray-800 dark:text-slate-200">{dailyRes}</p>}
        </section>
      )}

      {active === 'classify' && (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <input
            value={classUrl}
            onChange={(e) => setClassUrl(e.target.value)}
            placeholder="رابط الصورة"
            className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void runClassify()}
            className="mt-2 rounded-xl bg-[#1B7F7A] px-4 py-2 text-sm font-bold text-white"
          >
            تصنيف
          </button>
          {classRes != null && (
            <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-gray-50 p-2 text-xs dark:bg-slate-900">
              {JSON.stringify(classRes, null, 2)}
            </pre>
          )}
        </section>
      )}
    </div>
  )
}
