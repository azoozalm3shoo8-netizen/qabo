import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'لوحة المتصدرين',
  description: 'أفضل المزايدين والبائعين على قبو.',
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
