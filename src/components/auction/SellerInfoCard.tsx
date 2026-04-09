'use client'

import { CheckCircle, Star, UserCircle } from '@phosphor-icons/react'
import Image from 'next/image'
import Link from 'next/link'

export type SellerInfoCardSeller = {
  name: string
  avatar_url?: string | null
  rating: number | null
  total_reviews?: number | null
  auctions_count?: number | null
  is_verified?: boolean | null
  /** إن وُجد يظهر زر «عرض الملف» */
  profileHref?: string
}

export function SellerInfoCard({ seller }: { seller: SellerInfoCardSeller }) {
  const href = seller.profileHref
  const rating = seller.rating != null ? Number(seller.rating) : null

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#E6F4F3] dark:bg-teal-900/40">
          {seller.avatar_url ? (
            <Image
              src={seller.avatar_url}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#1B7F7A]">
              <UserCircle className="h-10 w-10" weight="fill" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-foreground">{seller.name}</h3>
            {seller.is_verified ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                موثق
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {rating != null && !Number.isNaN(rating) ? (
              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                <Star className="h-4 w-4" weight="fill" />
                {rating.toFixed(1)}
                {seller.total_reviews != null ? (
                  <span className="text-muted-foreground">({seller.total_reviews})</span>
                ) : null}
              </span>
            ) : null}
            {seller.auctions_count != null ? (
              <span>{seller.auctions_count} مزاد مكتمل</span>
            ) : null}
          </div>
        </div>
      </div>
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex rounded-xl border-2 border-[#1B7F7A] px-4 py-2 text-sm font-bold text-[#1B7F7A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-teal-500 dark:text-teal-300"
        >
          عرض الملف
        </Link>
      ) : null}
    </div>
  )
}
