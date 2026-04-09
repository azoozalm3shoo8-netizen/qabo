import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'التسليم | قبو' },
  description: 'تسليم المنتج وتأكيد الاستلام على قبو.',
}

export default function HandoverLayout({ children }: { children: React.ReactNode }) {
  return children
}
