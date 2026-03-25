'use client'

import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { useLocale } from '@/lib/locale-context'

export default function PrivacyPage() {
  const { t, dir, locale } = useLocale()
  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 dark:bg-slate-900" dir={dir}>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F4F3] text-lg text-[#1B7F7A] dark:bg-[#134e4a] dark:text-slate-100"
          aria-label={t('common_back')}
        >
          →
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-[#1B7F7A] dark:text-slate-100">
          {t('privacy_title')}
        </h1>
        <div className="w-10" />
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <h2 className="mb-4 text-xl font-bold text-[#1F2937] dark:text-slate-100">
          {t('privacy_title')} — {t('common_appName')}
        </h2>

        {locale === 'en' ? (
          <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">{t('privacy_body')}</p>
        ) : null}

        {locale === 'ar' ? (
          <>
        <section>
          <h2 className="mb-3 mt-8 text-lg font-bold text-[#1B7F7A]">1. ما البيانات التي نجمعها</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            قد نجمع: رقم الجوال، الاسم الكامل (إن وُجد)، المدينة، سجل المزايدات والمشتريات، سجل المعاملات
            والمدفوعات، معلومات الجهاز ونوع المتصفح بشكل مجمّع، وعنوان IP لأغراض الأمان ومنع الاحتيال. لا نطلب بيانات
            أكثر من اللازم لتشغيل الخدمة.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-8 text-lg font-bold text-[#1B7F7A]">2. كيف نستخدم بياناتك</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            نستخدم البيانات لتقديم المزادات والدفع والإشعارات، ومعالجة الطلبات، وتحسين تجربة المستخدم، ومنع الاحتيال
            وإساءة الاستخدام، والامتثال للأنظمة المعمول بها في المملكة العربية السعودية.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-8 text-lg font-bold text-[#1B7F7A]">3. مشاركة البيانات مع أطراف ثالثة</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            قد نشارك البيانات الضرورية مع: مزودي الدفع (مثل Tap Payments) لإتمام العمليات، ومزود البنية التحتية
            (Supabase) لتخزين البيانات وتشغيل قاعدة البيانات، ومزود الرسائل القصيرة (Twilio) لإرسال رموز التحقق.
            لا نبيع بياناتك الشخصية لأطراف تجارية لأغراض تسويقية لهم.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-8 text-lg font-bold text-[#1B7F7A]">4. أمان البيانات</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            نطبق تشفيراً أثناء النقل (HTTPS) ونعتمد على مزودي خدمة يوفرون حماية للبيانات المخزنة. نحد من صلاحيات
            الوصول داخلياً ونراجع إعدادات الأمان بشكل دوري قدر الإمكان. لا يوجد نظام خالٍ تماماً من المخاطر، لكننا
            نبذل جهداً معقولاً لحماية معلوماتك.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-8 text-lg font-bold text-[#1B7F7A]">5. ملفات تعريف الارتباط</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            نستخدم ملفات تعريف ارتباط ضرورية لتشغيل الجلسة والموقع. حالياً لا نستخدم ملفات تتبع إعلانية من طرف
            ثالث عبر المنصة؛ أي تغيير لاحق سيُذكر في تحديث لهذه السياسة.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-8 text-lg font-bold text-[#1B7F7A]">6. حقوقك — نظام حماية البيانات الشخصية (PDPL)</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            وفقاً للأنظمة المعمول بها في المملكة، لك الحق في طلب الاطلاع على بياناتك الشخصية لدينا، وتصحيحها إن
            كانت غير دقيقة، وحذفها أو تقييد معالجتها حيث يسمح النظام بذلك، وسحب الموافقة على معالجة معيّنة حيث
            لا تؤثر على التزامات تعاقدية سارية. لممارسة هذه الحقوق، تواصل معنا عبر البريد المذكور أدناه مع ذكر
            هويتك باختصار وطلبك.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-8 text-lg font-bold text-[#1B7F7A]">7. التعديلات على سياسة الخصوصية</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            قد نُحدّث هذه السياسة لتعكس تغييرات في الخدمة أو الأنظمة. سيتم نشر النسخة المحدثة على هذه الصفحة مع
            تاريخ التحديث عند الحاجة. ننصحك بمراجعة الصفحة بشكل دوري.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-8 text-lg font-bold text-[#1B7F7A]">8. التواصل</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            لطلبات الخصوصية والاستفسارات: privacy@qabo.app (عنوان توضيحي — يُستبدل بعنوانكم الفعلي). نسعى للرد خلال
            48 ساعة عمل.
          </p>
        </section>
          </>
        ) : null}
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
