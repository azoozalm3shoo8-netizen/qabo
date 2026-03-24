'use client'

import Image from 'next/image'

export function QabbooIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-qabboo.png"
      alt="Qabboo"
      width={size}
      height={size}
      className={'object-contain shrink-0 ' + className}
      priority
    />
  )
}
