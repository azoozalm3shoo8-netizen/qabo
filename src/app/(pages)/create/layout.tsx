import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'أنشئ مزاد جديد',
  description: 'أنشئ مزادك في قبو بخطوات بسيطة: صور، تفاصيل، تسعير، ومراجعة.',
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children
}
