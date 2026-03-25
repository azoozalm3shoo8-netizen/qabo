'use client'

import { useState } from 'react'
import { useLocale } from '@/lib/locale-context'
import { normalizeAuctionImages } from '@/lib/auction-images'

export function AuctionImageGallery({ images }: { images: string[] | null | undefined }) {
  const { t } = useLocale()
  const list = normalizeAuctionImages(images)
  const [index, setIndex] = useState(0)

  if (list.length === 0) {
    return (
      <div
        className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-12 text-center text-gray-400 dark:bg-slate-800 dark:text-slate-500"
        dir="rtl"
      >
        <span className="text-5xl" aria-hidden>
          📷
        </span>
        <p className="text-sm font-medium">{t('gallery_noPhotos')}</p>
      </div>
    )
  }

  const main = list[index] ?? list[0]

  return (
    <div className="space-y-3">
      <div className="flex w-full justify-center rounded-2xl bg-gray-100 px-2 py-3 dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main}
          alt=""
          className="max-h-[400px] w-full object-contain rounded-2xl"
          loading="eager"
        />
      </div>
      {list.length > 1 ? (
        <div className="flex flex-wrap justify-center gap-2 px-1">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={
                'h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ' +
                (i === index
                  ? 'border-[#1B7F7A] ring-2 ring-[#1B7F7A]/20'
                  : 'border-gray-200 opacity-80 hover:opacity-100 dark:border-slate-600')
              }
              aria-label={`${t('gallery_photoN')} ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
