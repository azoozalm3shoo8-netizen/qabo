'use client'

import { CreditCard, Trash } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'

type CardRow = {
  id: string
  brand: string
  last_four: string
  holder_name: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

export function SavedCardsList({ userId }: { userId: string }) {
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/payment/cards?user_id=${encodeURIComponent(userId)}`)
    const d = await r.json()
    setCards(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const setDefault = async (id: string) => {
    await fetch(`/api/payment/cards/${id}/default`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    void load()
  }

  const del = async (id: string) => {
    await fetch(`/api/payment/cards?id=${id}&user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' })
    void load()
  }

  if (loading) return <p className="text-sm text-gray-600">جاري تحميل البطاقات…</p>

  return (
    <div dir="rtl" className="space-y-3">
      {cards.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-[#1B7F7A]" weight="duotone" />
            <div>
              <p className="font-semibold capitalize">{c.brand}</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                •••• {c.last_four} — {c.holder_name}
              </p>
              <p className="text-xs text-gray-500">
                {c.exp_month}/{c.exp_year}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.is_default ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-200">
                الافتراضية
              </span>
            ) : (
              <button
                type="button"
                className="text-xs text-[#1B7F7A] underline"
                onClick={() => void setDefault(c.id)}
              >
                تعيين كافتراضية
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-red-600"
              onClick={() => void del(c.id)}
            >
              <Trash className="h-4 w-4" /> حذف
            </button>
          </div>
        </div>
      ))}
      {cards.length === 0 ? <p className="text-sm text-gray-600">لا توجد بطاقات محفوظة.</p> : null}
    </div>
  )
}
