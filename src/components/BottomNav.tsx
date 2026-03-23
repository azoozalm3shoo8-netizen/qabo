'use client'

import Link from 'next/link'

export type BottomNavKey =
  | 'home'
  | 'categories'
  | 'favorites'
  | 'orders'
  | 'messages'
  | 'profile'

export function BottomNav({ active }: { active: BottomNavKey }) {
  const cls = (key: BottomNavKey) =>
    'flex flex-col items-center gap-0.5 text-[10px] sm:text-xs min-w-0 flex-1 ' +
    (active === key ? 'text-amber-500' : 'text-gray-400')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 flex justify-around items-end py-1.5 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      aria-label="التنقل السفلي"
    >
      <Link href="/" className={cls('home')}>
        <span className="text-lg sm:text-xl">🏠</span>
        الرئيسية
      </Link>
      <Link href="/categories" className={cls('categories')}>
        <span className="text-lg sm:text-xl">📁</span>
        التصنيفات
      </Link>
      <Link href="/create" className="flex flex-col items-center gap-0.5 -mt-4 flex-shrink-0">
        <span className="text-xl sm:text-2xl bg-amber-500 text-white w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg">
          +
        </span>
      </Link>
      <Link href="/favorites" className={cls('favorites')}>
        <span className="text-lg sm:text-xl">❤️</span>
        المفضلة
      </Link>
      <Link href="/orders" className={cls('orders')}>
        <span className="text-lg sm:text-xl">📦</span>
        طلباتي
      </Link>
      <Link href="/messages" className={cls('messages')}>
        <span className="text-lg sm:text-xl">💬</span>
        الرسائل
      </Link>
      <Link href="/profile" className={cls('profile')}>
        <span className="text-lg sm:text-xl">👤</span>
        حسابي
      </Link>
    </nav>
  )
}
