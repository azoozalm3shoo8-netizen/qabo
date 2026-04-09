'use client'

import { FolderSimple } from '@phosphor-icons/react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { CATEGORY_CATALOG } from '@/lib/constants'

type AuctionCategoryRow = { id: string; category?: string | null }

export default function CategoriesPage() {
  const [auctions, setAuctions] = useState<AuctionCategoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auctions')
      .then((r) => r.json())
      .then((data) => {
        setAuctions(Array.isArray(data) ? (data as AuctionCategoryRow[]) : [])
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
      <div className="sticky top-0 z-30 rounded-b-2xl border-b border-border bg-background px-4 py-3 shadow-sm">
        <h1 className="flex items-center justify-center gap-2 text-center text-lg font-bold text-foreground">
          <FolderSimple className="h-6 w-6 text-[#1B7F7A]" weight="fill" />
          التصنيفات
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-card shadow-sm" />
            ))
          : CATEGORY_CATALOG.map((cat) => (
              <Link
                key={cat.slug}
                href={'/categories/' + encodeURIComponent(cat.slug)}
                className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-md transition-all hover:border-[#1B7F7A]/30 hover:shadow-lg"
              >
                <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#E6F4F3] text-4xl">
                  {cat.icon}
                </span>
                <h3 className="text-sm font-bold text-foreground">{cat.name}</h3>
                <p className="mt-1 text-xs font-semibold text-[#1B7F7A]">{counts[cat.name] ?? 0} مزاد</p>
              </Link>
            ))}
      </div>

      <BottomNav active="search" />
    </div>
  )
}
