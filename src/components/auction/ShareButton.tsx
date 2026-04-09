'use client'

import { useState } from 'react'
import { formatSAR } from '@/lib/utils/currency'

const baseUrl = () =>
  typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://qabboo.com'

export function ShareButton({
  auctionId,
  title,
  currentBidHalalas,
}: {
  auctionId: string
  title: string
  currentBidHalalas: number
}) {
  const [copied, setCopied] = useState(false)
  const url = `${baseUrl()}/auction/${auctionId}`
  const price = formatSAR(currentBidHalalas, true)
  const text = `مزاد: ${title}\nالسعر الحالي: ${price}\nزايد الآن:`

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text, url }).catch(() => {})
    }
  }

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank')
  }

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    )
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {typeof navigator !== 'undefined' && 'share' in navigator ? (
        <button
          type="button"
          onClick={() => void handleNativeShare()}
          className="rounded-lg bg-[#1B7F7A] p-2 text-white transition hover:bg-[#156661]"
          aria-label="مشاركة"
        >
          مشاركة
        </button>
      ) : null}

      <button
        type="button"
        onClick={shareWhatsApp}
        className="rounded-lg bg-green-600 px-2 py-1.5 text-sm font-bold text-white hover:bg-green-700"
        aria-label="واتساب"
      >
        واتساب
      </button>

      <button
        type="button"
        onClick={shareTwitter}
        className="rounded-lg bg-sky-500 px-2 py-1.5 text-sm font-bold text-white hover:bg-sky-600"
        aria-label="إكس"
      >
        إكس
      </button>

      <button
        type="button"
        onClick={() => void copyLink()}
        className="rounded-lg bg-gray-200 px-2 py-1.5 text-sm font-bold text-gray-800 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        aria-label="نسخ الرابط"
      >
        {copied ? 'تم النسخ' : 'نسخ الرابط'}
      </button>
    </div>
  )
}
