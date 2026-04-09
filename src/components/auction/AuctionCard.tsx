'use client'

import { Gavel, MapPin } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { AuctionCountdownMini } from '@/components/auction/AuctionCountdownMini'
import { FavoriteHeart } from '@/components/FavoriteHeart'
import { normalizeAuctionImages } from '@/lib/auction-images'
import { formatSARFromRiyalInteger } from '@/lib/utils/currency'

export type AuctionCardAuction = {
  id: string
  title: string
  current_bid: number
  bid_count: number
  ends_at: string
  status: string
  images?: unknown
  city?: string | null
}

export function AuctionCard({
  auction: a,
  userId,
  priorityImage,
}: {
  auction: AuctionCardAuction
  userId?: string | null
  priorityImage?: boolean
}) {
  const imgs = normalizeAuctionImages(a.images)
  const src = imgs[0] ?? null

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      <Link
        href={'/auction/' + a.id}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        prefetch
      >
        <div className="relative aspect-[4/3] w-full bg-muted">
          {src ? (
            <Image
              src={src}
              alt={a.title ? `صورة ${a.title}` : 'صورة المنتج'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              priority={priorityImage}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">📷</div>
          )}
          <div className="absolute end-2 top-2 rounded-full bg-white/95 p-1 shadow-md dark:bg-slate-900/90">
            <FavoriteHeart auctionId={a.id} userId={userId ?? null} />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 text-sm font-bold text-foreground">{a.title}</h3>
          <p className="mt-1 text-lg font-extrabold text-[#1B7F7A] dark:text-teal-300">
            {formatSARFromRiyalInteger(Math.round(Number(a.current_bid)))}
          </p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-1 pt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Gavel className="h-3.5 w-3.5 text-[#1B7F7A]" weight="bold" />
              {a.bid_count} مزايدة
            </span>
            <AuctionCountdownMini endsAt={a.ends_at} />
            {a.city ? (
              <span className="inline-flex max-w-full items-center gap-0.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {a.city}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
