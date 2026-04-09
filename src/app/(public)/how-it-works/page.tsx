import type { Metadata } from 'next'
import { HowAuctionWorks } from '@/components/info/HowAuctionWorks'

export const metadata: Metadata = {
  title: 'كيف يعمل قبو',
  description: 'دليل المزايدة والبيع وحماية المشتري على منصة قبو.',
  openGraph: { title: 'كيف يعمل قبو', locale: 'ar_SA' },
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-16 dark:bg-slate-950">
      <HowAuctionWorks />
    </div>
  )
}
