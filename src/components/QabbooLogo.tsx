'use client'

import Image from 'next/image'

type Variant = 'header' | 'login' | 'splash'

export function QabbooLogo({ variant }: { variant: Variant }) {
  if (variant === 'header') {
    return (
      <Image
        src="/logo-qabboo.png"
        alt="قبو"
        width={100}
        height={32}
        className="h-8 w-auto max-w-[100px] object-contain object-right"
        priority
      />
    )
  }

  if (variant === 'login') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <Image
          src="/logo-qabboo.png"
          alt="قبو"
          width={160}
          height={160}
          className="h-20 w-auto max-w-[200px] object-contain"
          priority
        />
        <p className="text-xl font-bold text-white [font-family:var(--font-inter),Inter,system-ui,sans-serif]">
          qabboo
        </p>
        <p className="text-3xl font-extrabold text-white">قبو</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <Image
        src="/logo-qabboo.png"
        alt="قبو"
        width={160}
        height={160}
        className="max-h-32 w-auto max-w-[220px] object-contain"
        priority
      />
      <p className="text-sm text-gray-500 text-center">كنوزك عندنا...</p>
    </div>
  )
}
