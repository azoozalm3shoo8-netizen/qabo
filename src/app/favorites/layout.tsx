import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'المفضلة | قبو' },
  description: 'مزاداتك المفضلة على قبو.',
}

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children
}
