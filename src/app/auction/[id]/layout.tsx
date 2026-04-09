import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { formatSAR } from '@/lib/utils/currency'

type Props = { children: ReactNode; params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof process.env.VERCEL_URL === 'string' ? `https://${process.env.VERCEL_URL}` : '')
  if (!base || !id) {
    return { title: 'مزاد' }
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/auctions/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return { title: 'مزاد' }
    const auction = (await res.json()) as {
      title?: string
      description?: string | null
      current_bid?: number
      images?: string[] | null
    }
    const title = auction.title || 'مزاد'
    const desc =
      (auction.description || '').slice(0, 160) ||
      `مزاد على ${title} — السعر الحالي ${formatSAR(Number(auction.current_bid ?? 0), false)}`
    const imgs = Array.isArray(auction.images) ? auction.images[0] : undefined
    return {
      title,
      description: desc,
      openGraph: {
        title: `${title} | قبو`,
        description: desc,
        ...(imgs ? { images: [{ url: imgs }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: desc,
      },
    }
  } catch {
    return { title: 'مزاد' }
  }
}

export default function AuctionIdLayout({ children }: Props) {
  return children
}
