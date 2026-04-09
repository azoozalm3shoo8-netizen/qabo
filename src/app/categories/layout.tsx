import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'الفئات | قبو' },
  description: 'تصفح مزادات قبو حسب الفئة.',
}

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return children
}
