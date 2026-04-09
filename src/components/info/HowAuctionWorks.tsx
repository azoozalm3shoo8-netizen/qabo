'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { CommissionTiersDisplay } from '@/components/auction/CommissionTiersDisplay'

export function HowAuctionWorks() {
  const [free, setFree] = useState<{
    isActive: boolean
    endsAt: string | null
    messageAr: string
  } | null>(null)

  useEffect(() => {
    void fetch('/api/platform/free-period')
      .then((r) => r.json())
      .then(setFree)
      .catch(() => setFree(null))
  }, [])

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-10 px-4 py-8 text-[#1F2937] dark:text-slate-100">
      <h1 className="text-2xl font-bold text-[#1B7F7A]">كيف يعمل قبو؟</h1>

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: '📝', t: 'سجّل مجاناً', d: 'أنشئ حسابك في ثوانٍ وابدأ التصفح' },
          { icon: '🔍', t: 'تصفح وزايد', d: 'اختر من مئات المزادات وزايد بنقرة واحدة' },
          { icon: '🛡️', t: 'ادفع بأمان', d: 'أموالك محمية حتى تستلم القطعة وتفحصها' },
          { icon: '📦', t: 'استلم وقيّم', d: 'استلم قطعتك، افحصها، وقيّم البائع' },
        ].map((s) => (
          <div
            key={s.t}
            className="rounded-2xl border border-[#1B7F7A]/20 bg-gradient-to-br from-white to-[#E6F4F3]/40 p-4 dark:border-teal-800 dark:from-slate-800 dark:to-slate-900"
          >
            <div className="text-3xl">{s.icon}</div>
            <h2 className="mt-2 font-bold text-[#1B7F7A] dark:text-teal-300">{s.t}</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{s.d}</p>
          </div>
        ))}
      </section>

      <Section title="حماية المشتري">
        <p className="text-sm leading-relaxed">
          بعد استلام الشحنة، لديك حتى <strong>3 أيام</strong> لفحص القطعة. خلال هذه الفترة تبقى أموالك محمية؛ إن
          واجهت مشكلة يمكنك فتح نزاعاً من صفحة الصفقة.
        </p>
      </Section>

      <Section title="رسوم قبو (ملخص)">
        <p className="text-sm leading-relaxed">
          عند الفوز يُضاف على المشتري عمولة منصة تقديرية <strong>9٪ + 3 ر.س</strong> على المبلغ النهائي (للتوضيح
          فقط — راجع الشرائح أدناه والشروط للقيم الدقيقة).
        </p>
      </Section>

      <div className="rounded-2xl bg-[#FF8C42] p-4 text-center text-white shadow-lg">
        <Link
          href="/auth/register"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#1B7F7A]"
        >
          ابدأ الآن — سجّل مجاناً
        </Link>
      </div>

      <Section title="كيف تزايد؟">
        <ol className="list-decimal space-y-2 pr-5 text-sm leading-relaxed">
          <li>سجّل بطاقتك (مرة واحدة عبر التحقق البسيط).</li>
          <li>اختر مزاداً وقدّم مزايدتك.</li>
          <li>يُحجز حوالي 10٪ كضمان جدية — يُسترد إذا خسرت.</li>
          <li>إذا تجاوزك مزايد، يُحرَّر ضمانك.</li>
          <li>إذا فزت، ادفع المبلغ الكامل ورسم الحماية (مجاني أثناء الفترة المجانية).</li>
          <li>استلم وافحص خلال المهلة المحددة.</li>
          <li>اقبل أو اعترض؛ لا يصل المال للبائع قبل رضاك أو انتهاء المهلة.</li>
        </ol>
      </Section>

      <Section title="كيف تبيع؟">
        <ol className="list-decimal space-y-2 pr-5 text-sm leading-relaxed">
          <li>أنشئ إعلانك (صور، فيديو 360° اختياري، وصف).</li>
          <li>اختر مزاداً مفتوحاً أو بحد أدنى سري.</li>
          <li>يُحجز تأمين جدية منك — يُسترد بعد البيع الناجح.</li>
          <li>بعد الفوز، نسّق التسليم مع المشتري.</li>
          <li>بعد قبول المشتري، يُحوَّل لك المبلغ عبر مُيسر.</li>
        </ol>
      </Section>

      <Section title="الحماية المالية">
        <ul className="space-y-2 text-sm">
          <li>أموالك تمر عبر مُيسر — بوابة مرخصة من SAMA.</li>
          <li>القبو لا يحتفظ بأموالك.</li>
          <li>فترة فحص ومسار نزاعات لدعم الطرفين.</li>
        </ul>
      </Section>

      <Section title="العمولة" id="commission">
        {free?.isActive ? (
          <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm dark:bg-green-900/20">
            <p className="font-bold">🎉 خبر سار! المنصة حالياً في فترة الإطلاق المجانية</p>
            <p className="mt-1">
              لا عمولة على البائع ولا رسوم على المشتري حتى{' '}
              {free.endsAt
                ? new Date(free.endsAt).toLocaleDateString('ar-SA', { dateStyle: 'long' })
                : 'تاريخ الإعلان'}
              .
            </p>
            <p className="mt-3 font-medium">
              سجّل الآن واستفد من الفترة المجانية!{' '}
              <Link href="/auth/register" className="text-[#1B7F7A] underline">
                إنشاء حساب
              </Link>
            </p>
            <p className="mt-2 text-xs font-semibold text-gray-700 dark:text-slate-300">
              بعد انتهاء الفترة المجانية، ستُطبَّق العمولة التالية:
            </p>
          </div>
        ) : null}
        {!free?.isActive ? (
          <p className="mb-3 text-sm text-gray-700 dark:text-slate-300">شرائح العمولة الحالية:</p>
        ) : null}
        <CommissionTiersDisplay freeInfo={free} />
      </Section>

      <Section title="ماذا لو ألغى البائع؟">
        <p className="text-sm">
          في المزاد المفتوح الالتزام أقوى. الإلغاء غير المبرر قد يؤدي لمصادرة التأمين وخفض الثقة. التكرار قد يؤدي
          للحظر.
        </p>
      </Section>

      <p className="text-center text-sm">
        <Link href="/terms" className="text-[#1B7F7A] underline">
          الشروط والأحكام الكاملة
        </Link>
      </p>
    </div>
  )
}

function Section({
  title,
  id,
  children,
}: {
  title: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id}>
      <h2 className="mb-3 text-lg font-bold text-[#FF8C42]">{title}</h2>
      {children}
    </section>
  )
}
