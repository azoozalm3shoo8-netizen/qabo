'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from '@/lib/locale-context'
import { normalizeAuctionImages } from '@/lib/auction-images'

export function AuctionImageGallery({ images }: { images: string[] | null | undefined }) {
  const { t } = useLocale()
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
        className="flex aspect-[4/3] max-h-80 flex-col items-center justify-center gap-2 rounded-b-2xl bg-gray-100 px-4 text-center text-gray-400 dark:bg-slate-800 dark:text-slate-500"
        dir="rtl"
      >
        <span className="text-5xl" aria-hidden>
          📷
        </span>
        <p className="text-sm font-medium">{t('gallery_noPhotos')}</p>
      </div>
    )
  }

  if (list.length === 1) {
    return (
      <div className="relative aspect-[4/3] max-h-96 w-full overflow-hidden rounded-b-2xl bg-gray-100 dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={list[0]} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        ref={scrollerRef}
        dir="ltr"
        className="scrollbar-hide flex snap-x snap-mandatory gap-0 overflow-x-auto rounded-b-2xl"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {list.map((src, i) => (
          <div
            key={i}
            className="relative aspect-[4/3] max-h-96 min-w-full shrink-0 snap-center bg-gray-100 dark:bg-slate-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-2 px-2">
        {list.map((src, i) => (
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
              'h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ' +
              (i === index
                ? 'border-[#1B7F7A] ring-2 ring-[#1B7F7A]/20'
                : 'border-gray-200 opacity-70 hover:opacity-100 dark:border-slate-600')
            }
            aria-label={`${t('gallery_photoN')} ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
