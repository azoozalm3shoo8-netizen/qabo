import type { Metadata } from 'next'
import Link from 'next/link'
import { CommissionTiersDisplay } from '@/components/auction/CommissionTiersDisplay'
import { LaunchCountdown } from '@/components/info/LaunchCountdown'

export const metadata: Metadata = {
  title: 'القبو — منصة مزادات آمنة في الرياض | ابدأ مجاناً',
  description:
    'أول منصة مزادات بفيديو 360° وذكاء اصطناعي في السعودية. سجّل الآن واستفد من فترة الإطلاق المجانية بدون عمولة.',
  openGraph: { locale: 'ar_SA', type: 'website' },
}

export default async function LaunchPage() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  let endsAt: string | null = null
  let freeInfo: { isActive: boolean; endsAt: string | null } | null = null
  try {
    const res = await fetch(`${base}/api/platform/free-period`, { next: { revalidate: 3600 } })
    const j = await res.json()
    endsAt = j.endsAt ?? null
    freeInfo = { isActive: Boolean(j.isActive), endsAt: j.endsAt ?? null }
  } catch {
    endsAt = null
    freeInfo = null
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

      <section className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-[#1B7F7A]">لماذا القبو؟</h2>
        <ul className="grid gap-4 text-right text-sm sm:grid-cols-2">
          <li className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-lg" aria-hidden>
              📷
            </span>{' '}
            فيديو 360° وذكاء اصطناعي يكشف العيوب
          </li>
          <li className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-lg" aria-hidden>
              🛡️
            </span>{' '}
            حماية مالية كاملة عبر مُيسر
          </li>
          <li className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-lg" aria-hidden>
              📍
            </span>{' '}
            نقاط آمنة للتسليم في الرياض
          </li>
          <li className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-lg" aria-hidden>
              ⭐
            </span>{' '}
            نظام ثقة يحمي المشتري والبائع
          </li>
        </ul>
      </section>

      <section className="bg-[#1B7F7A] px-4 py-14 text-center text-white">
        <h2 className="text-xl font-bold">العرض المجاني</h2>
        <LaunchCountdown endsAtIso={endsAt} />
        <p className="mt-4 text-lg font-semibold">0% عمولة — 0 رسوم — حماية كاملة</p>
        <p className="mt-2 text-sm opacity-95">سجّل الآن واحصل على كل المميزات مجاناً!</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link href="/auth/register" className="rounded-xl bg-white px-6 py-3 font-bold text-[#1B7F7A]">
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

      <section className="mx-auto max-w-3xl space-y-4 px-4 py-12">
        <h2 className="text-xl font-bold text-[#1B7F7A]">بعد الفترة المجانية</h2>
        <p className="text-sm text-gray-700 dark:text-slate-300">
          عمولة تبدأ من 2% فقط — أقل من أي منصة! البائع الذهبي يحصل على خصم إضافي.
        </p>
        <CommissionTiersDisplay freeInfo={freeInfo} />
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-4 pb-16">
        <h2 className="text-xl font-bold text-[#1B7F7A]">أسئلة شائعة</h2>
        <div className="space-y-4 text-sm text-gray-800 dark:text-slate-200">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="font-bold text-[#1B7F7A]">هل الفترة المجانية فعلاً مجانية؟</p>
            <p className="mt-2">نعم 100%. لا عمولة ولا رسوم مخفية. فقط تأمين الجدية (يُسترد كاملاً بعد البيع الناجح).</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="font-bold text-[#1B7F7A]">ماذا يحدث بعد انتهاء الفترة المجانية؟</p>
            <p className="mt-2">تُطبَّق عمولة بسيطة تبدأ من 2% وفق شرائح المنصة.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="font-bold text-[#1B7F7A]">هل المنصة آمنة؟</p>
            <p className="mt-2">نعم. أموالك محمية عبر مُيسر المرخصة من SAMA.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="font-bold text-[#1B7F7A]">هل يمكن الإلغاء؟</p>
            <p className="mt-2">
              المزاد المفتوح ملزم. المزاد بحد أدنى يُلغى تلقائياً إذا لم يصل السعر للحد المطلوب.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
