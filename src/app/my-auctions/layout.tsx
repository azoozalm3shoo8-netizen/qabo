import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'مزاداتي | قبو' },
  description: 'مزاداتك النشطة والمنتهية والمفضلة على قبو.',
}

export default function MyAuctionsLayout({ children }: { children: React.ReactNode }) {
  return children
}
