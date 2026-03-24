'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeAuctionImages } from '@/lib/auction-images'

export function AuctionImageGallery({ images }: { images: string[] | null | undefined }) {
  const list = normalizeAuctionImages(images)
  const [index, setIndex] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el || list.length <= 1) return
    const w = el.clientWidth
    if (w <= 0) return
    const i = Math.round(el.scrollLeft / w)
    setIndex(Math.min(Math.max(0, i), list.length - 1))
  }, [list.length])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll, list.length])

  if (list.length === 0) {
    return (
      <div
        className="aspect-[4/3] max-h-80 bg-gray-100 flex flex-col items-center justify-center gap-2 rounded-b-2xl text-gray-400 px-4 text-center"
        dir="rtl"
      >
        <span className="text-5xl" aria-hidden>
          📷
        </span>
        <p className="text-sm font-medium text-gray-500">لا توجد صور</p>
      </div>
    )
  }

  if (list.length === 1) {
    return (
      <div className="relative aspect-[4/3] max-h-80 w-full overflow-hidden rounded-b-2xl bg-gray-100">
        <Image
          src={list[0]}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={scrollerRef}
        dir="ltr"
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-0 rounded-b-2xl"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {list.map((src, i) => (
          <div
            key={i}
            className="relative min-w-full aspect-[4/3] max-h-80 snap-center shrink-0 bg-gray-100"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5">
        {list.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              scrollerRef.current?.scrollTo({
                left: i * (scrollerRef.current?.clientWidth ?? 0),
                behavior: 'smooth',
              })
            }}
            className={
              'w-2 h-2 rounded-full transition-colors ' +
              (i === index ? 'bg-[#1B7F7A]' : 'bg-gray-300')
            }
            aria-label={'صورة ' + (i + 1)}
          />
        ))}
      </div>
    </div>
  )
}
