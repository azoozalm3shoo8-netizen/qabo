import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'الرسائل | قبو' },
  description: 'محادثاتك مع البائعين والمشترين على قبو.',
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children
}
