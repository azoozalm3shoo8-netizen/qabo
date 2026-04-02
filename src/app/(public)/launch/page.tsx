import type { Metadata } from 'next'
import Link from 'next/link'
import { CommissionTiersDisplay } from '@/components/auction/CommissionTiersDisplay'

export const metadata: Metadata = {
  title: 'القبو — منصة مزادات آمنة في الرياض | ابدأ مجاناً',
  description:
    'أول منصة مزادات بفيديو 360° وذكاء اصطناعي في السعودية. سجّل الآن واستفد من فترة الإطلاق المجانية بدون عمولة.',
  openGraph: { locale: 'ar_SA', type: 'website' },
}

export default async function LaunchPage() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  let endsAt: string | null = null
  try {
    const res = await fetch(`${base}/api/platform/free-period`, { next: { revalidate: 3600 } })
    const j = await res.json()
    endsAt = j.endsAt ?? null
  } catch {
    endsAt = null
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F3F4F6] dark:bg-slate-950">
      <section className="bg-[#1B7F7A] px-4 py-16 text-center text-white">
        <h1 className="text-3xl font-extrabold">القبو — أول منصة مزادات آمنة في الرياض</h1>
        <p className="mt-4 text-lg opacity-95">ابدأ الآن مجاناً — بدون عمولة ولا رسوم!</p>
        {endsAt ? (
          <p className="mt-2 text-sm opacity-90">
            تنتهي الفترة المجانية في: {new Date(endsAt).toLocaleDateString('ar-SA', { dateStyle: 'long' })}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/auth/register"
            className="rounded-xl bg-white px-6 py-3 font-bold text-[#1B7F7A]"
          >
            سجّل كبائع
          </Link>
          <Link
            href="/auth/register"
            className="rounded-xl border-2 border-white px-6 py-3 font-bold text-white"
          >
            سجّل كمشتري
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h2 className="text-xl font-bold text-[#1B7F7A]">لماذا القبو؟</h2>
        <ul className="grid gap-4 text-sm sm:grid-cols-2">
          <li className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            📷 فيديو 360° وذكاء اصطناعي للعيوب
          </li>
          <li className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            🛡️ حماية مالية عبر مُيسر
          </li>
          <li className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            📍 نقاط آمنة في الرياض
          </li>
          <li className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            ⭐ نظام ثقة للبائعين
          </li>
        </ul>
        <h2 className="text-xl font-bold text-[#1B7F7A]">بعد الفترة المجانية</h2>
        <CommissionTiersDisplay />
      </section>
    </div>
  )
}
