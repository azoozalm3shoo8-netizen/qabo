'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { CATEGORY_CATALOG } from '@/lib/constants'

export default function CategoriesPage() {
  const [auctions, setAuctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auctions')
      .then((r) => r.json())
      .then((data) => {
        setAuctions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of CATEGORY_CATALOG) m[c.name] = 0
    for (const a of auctions) {
      if (a.category && Object.prototype.hasOwnProperty.call(m, a.category)) {
        m[a.category]++
      }
    }
    return m
  }, [auctions])

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 shadow-sm rounded-b-2xl">
        <h1 className="font-bold text-lg text-center text-gray-900">التصنيفات</h1>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-36 bg-white rounded-2xl shadow-sm animate-pulse" />
            ))
          : CATEGORY_CATALOG.map((cat) => (
              <Link
                key={cat.slug}
                href={'/categories/' + encodeURIComponent(cat.slug)}
                className="rounded-2xl p-4 text-center bg-white border border-gray-100 shadow-md hover:border-amber-200 hover:shadow-lg transition-all"
              >
                <span className="text-4xl block mb-2">{cat.icon}</span>
                <h3 className="font-bold text-sm text-gray-900">{cat.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {counts[cat.name] ?? 0} مزاد
                </p>
              </Link>
            ))}
      </div>

      <BottomNav active="categories" />
    </div>
  )
}
