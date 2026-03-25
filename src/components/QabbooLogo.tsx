'use client'

import Image from 'next/image'
import Link from 'next/link'

type Variant = 'header' | 'hero' | 'login' | 'splash'

export function QabbooLogo({ variant }: { variant: Variant }) {
  if (variant === 'header' || variant === 'hero') {
    const hero = variant === 'hero'
    const inner = (
      <>
        <Image
          src="/logo-qabboo.png"
          alt="قبو"
          width={100}
          height={32}
          className="h-8 w-auto max-w-[100px] object-contain object-right"
          priority
        />
        <span
          className={
            'font-bold text-lg leading-none ' +
            (hero ? 'text-white drop-shadow-sm' : 'text-[#1F2937] dark:text-slate-100')
          }
        >
          قبو
        </span>
      </>
    )
    return (
      <Link
        href="/"
        className="flex flex-row-reverse items-center gap-2"
        aria-label="قبو"
      >
        {inner}
      </Link>
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
      <p className="text-center text-sm text-gray-500">كنوزك عندنا...</p>
    </div>
  )
}
