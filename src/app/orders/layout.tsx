import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'طلباتي | قبو' },
  description: 'متابعة مشترياتك ومبيعاتك على قبو.',
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children
}
