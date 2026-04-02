import type { Metadata } from 'next'
import { HowAuctionWorks } from '@/components/info/HowAuctionWorks'

export const metadata: Metadata = {
  title: 'كيف يعمل المزاد',
  description: 'دليل المزايدة والبيع والحماية المالية على منصة القبو.',
  openGraph: { title: 'كيف يعمل المزاد — القبو', locale: 'ar_SA' },
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-16 dark:bg-slate-950">
      <HowAuctionWorks />
    </div>
  )
}
