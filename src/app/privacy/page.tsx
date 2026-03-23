'use client'

import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg"
          aria-label="رجوع"
        >
          →
        </Link>
        <h1 className="font-bold text-lg text-gray-900 flex-1 text-center">سياسة الخصوصية</h1>
        <div className="w-10" />
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <h2 className="font-bold text-xl text-gray-900 mb-4">سياسة الخصوصية — منصة قبو</h2>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">1. ما البيانات التي نجمعها</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            قد نجمع: رقم الجوال، الاسم الكامل (إن وُجد)، المدينة، سجل المزايدات والمشتريات، سجل المعاملات
            والمدفوعات، معلومات الجهاز ونوع المتصفح بشكل مجمّع، وعنوان IP لأغراض الأمان ومنع الاحتيال. لا نطلب بيانات
            أكثر من اللازم لتشغيل الخدمة.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">2. كيف نستخدم بياناتك</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            نستخدم البيانات لتقديم المزادات والدفع والإشعارات، ومعالجة الطلبات، وتحسين تجربة المستخدم، ومنع الاحتيال
            وإساءة الاستخدام، والامتثال للأنظمة المعمول بها في المملكة العربية السعودية.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">3. مشاركة البيانات مع أطراف ثالثة</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            قد نشارك البيانات الضرورية مع: مزودي الدفع (مثل Tap Payments) لإتمام العمليات، ومزود البنية التحتية
            (Supabase) لتخزين البيانات وتشغيل قاعدة البيانات، ومزود الرسائل القصيرة (Twilio) لإرسال رموز التحقق.
            لا نبيع بياناتك الشخصية لأطراف تجارية لأغراض تسويقية لهم.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">4. أمان البيانات</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            نطبق تشفيراً أثناء النقل (HTTPS) ونعتمد على مزودي خدمة يوفرون حماية للبيانات المخزنة. نحد من صلاحيات
            الوصول داخلياً ونراجع إعدادات الأمان بشكل دوري قدر الإمكان. لا يوجد نظام خالٍ تماماً من المخاطر، لكننا
            نبذل جهداً معقولاً لحماية معلوماتك.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">5. ملفات تعريف الارتباط</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            نستخدم ملفات تعريف ارتباط ضرورية لتشغيل الجلسة والموقع. حالياً لا نستخدم ملفات تتبع إعلانية من طرف
            ثالث عبر المنصة؛ أي تغيير لاحق سيُذكر في تحديث لهذه السياسة.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">6. حقوقك — نظام حماية البيانات الشخصية (PDPL)</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            وفقاً للأنظمة المعمول بها في المملكة، لك الحق في طلب الاطلاع على بياناتك الشخصية لدينا، وتصحيحها إن
            كانت غير دقيقة، وحذفها أو تقييد معالجتها حيث يسمح النظام بذلك، وسحب الموافقة على معالجة معيّنة حيث
            لا تؤثر على التزامات تعاقدية سارية. لممارسة هذه الحقوق، تواصل معنا عبر البريد المذكور أدناه مع ذكر
            هويتك باختصار وطلبك.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">7. التعديلات على سياسة الخصوصية</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            قد نُحدّث هذه السياسة لتعكس تغييرات في الخدمة أو الأنظمة. سيتم نشر النسخة المحدثة على هذه الصفحة مع
            تاريخ التحديث عند الحاجة. ننصحك بمراجعة الصفحة بشكل دوري.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">8. التواصل</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            لطلبات الخصوصية والاستفسارات: privacy@qabo.app (عنوان توضيحي — يُستبدل بعنوانكم الفعلي). نسعى للرد خلال
            48 ساعة عمل.
          </p>
        </section>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
