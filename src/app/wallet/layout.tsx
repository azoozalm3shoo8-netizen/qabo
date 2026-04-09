import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'المحفظة | قبو' },
  description: 'رصيدك والإيداع والسحب على قبو.',
}

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children
}
