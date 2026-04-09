import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'حسابي',
  description: 'ملفك الشخصي، مزاداتك، مشترياتك، والمحفظة على قبو.',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
