import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'البحث',
  description: 'ابحث في مزادات قبو حسب الاسم والتصنيف والمدينة.',
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
