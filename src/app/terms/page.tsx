'use client'

import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6F4F3] text-lg text-[#1B7F7A]"
          aria-label="رجوع"
        >
          →
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-[#1B7F7A]">الشروط والأحكام</h1>
        <div className="w-10" />
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <h2 className="mb-4 text-xl font-bold text-[#1F2937]">الشروط والأحكام — منصة قبو</h2>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">1. مقدمة</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            مرحباً بك في منصة قبو للمزادات الإلكترونية. باستخدامك للمنصة فإنك توافق على الالتزام بهذه الشروط
            والأحكام. يرجى قراءتها بعناية قبل استخدام خدماتنا. إذا كنت لا توافق على أي بند من هذه الشروط، يُرجى
            عدم استخدام المنصة.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">2. التسجيل والحساب</h2>
          <ul className="list-disc space-y-2 pr-5 text-sm leading-relaxed text-gray-700 marker:text-[#1B7F7A]">
            <li>يجب أن يكون عمرك 18 سنة أو أكثر لاستخدام المنصة.</li>
            <li>رقم الجوال المستخدم يجب أن يكون صحيحاً ومملوكاً لك، وأنت مسؤول عن أي نشاط يتم عبر حسابك.</li>
            <li>أنت مسؤول عن الحفاظ على سرية بيانات الدخول وعدم مشاركتها مع الغير.</li>
            <li>تحتفظ منصة قبو بحق تعليق أو إلغاء أي حساب يخالف هذه الشروط أو يسيء استخدام الخدمة.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">3. قواعد المزايدة</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            المزايدة على المنصة التزام قانوني وأخلاقي. عند تقديمك لمزايدة، فأنت تتعهد بدفع المبلغ إذا كنت أعلى
            مزايد عند انتهاء الوقت المحدد للمزاد، وفقاً لقواعد الدفع المعتمدة. يجب الالتزام بالحد الأدنى للزيادة
            بين المزايدات كما يحدده البائع أو المنصة. ينتهي المزاد تلقائياً عند انتهاء المدة الزمنية المعروضة،
            ويُعتبر أعلى مزايد هو الفائز ما لم يُلغَ المزاد لأسباب مشروعة. يُمنع منعاً باتاً مزايدة البائع على
            مزاداته الخاصة أو التلاعب بالأسعار. لا يجوز سحب المزايدة بعد تأكيدها إلا في حالات نادرة يقررها فريق
            الدعم وفق سياسة النزاعات.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">4. الدفع والعمولات</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            تفرض المنصة عمولة قدرها 5٪ من سعر المنتج الفائز (سعر الفوز)، بالإضافة إلى ضريبة القيمة المضافة بنسبة
            15٪ على قيمة العمولة فقط، ويُحتسب الإجمالي الذي يدفعه المشتري وفق المعادلة المعروضة عند الدفع. يتم السداد
            عبر بوابات دفع معتمدة (مثل Tap) وفق تعليمات الصفحة. يلتزم الفائز بالمزاد بإتمام الدفع خلال 48 ساعة من
            انتهاء المزاد ما لم يُتفق خلاف ذلك أو يُسمح بتمديد من الدعم. عدم السداد قد يؤدي إلى إلغاء الطلب أو
            تقييد الحساب.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">5. الشحن والتسليم</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            يلتزم البائع بشحن المنتج خلال 5 أيام عمل من تأكيد الدفع أو من الحالة التي يحددها النظام، ما لم يتفق
            الطرفان كتابياً عبر المنصة على غير ذلك. يلتزم المشتري بتأكيد استلام الطلب خلال 3 أيام من وصول الشحنة
            وفق تعليمات التتبع. إذا لم يُؤكد المشتري الاستلام، قد يُعتبر الطلب مُستلماً تلقائياً بعد 7 أيام من
            تأكيد الشحن، دون إخلال بحق المشتري في فتح تذكرة دعم خلال المدة المعقولة.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">6. المنتجات الممنوعة</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            يُحظر عرض أو بيع: الأسلحة والذخائر، المخدرات والمواد الخاضعة للرقابة، المقلدة أو المسروقة، التبغ
            والكحول حيث يمنع القانون ذلك، المواد الإباحية، الحيوانات الحية دون تصاريح نظامية، وأي سلع تخالف أنظمة
            المملكة العربية السعودية. نحتفظ بإزالة أي إعلان دون إشعار مسبق وإبلاغ الجهات عند الاقتضاء.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">7. حل النزاعات</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            تسعى منصة قبو للوساطة بين المشتري والبائع في حال النزاع. يلتزم الطرفان بتقديم الأدلة المطلوبة والتعاون
            مع فريق الدعم. قرار المنصة في النزاعات التي قيمتها أقل من 10,000 ريال سعودي يكون نهائياً في إطار الخدمة،
            دون إخلال بحق أي طرف في اللجوء للجهات المختصة خارج المنصة.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">8. حدود المسؤولية</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            تعمل قبو كوسيط تقني بين البائع والمشتري. لا تتحمل المنصة مسؤولية جودة المنتجات أو مطابقتها للوصف، ولا
            مسؤولية أضرار الشحن إلا حيث يقتضي النظام ذلك. المستخدمون يتعاملون مع بعضهم البعض على مسؤوليتهم مع
            الاستفادة من أدوات المنصة والإبلاغ.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">9. التعديلات على الشروط</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            قد تُحدّث هذه الشروط من وقت لآخر. سيتم إشعار المستخدمين بالتغييرات الجوهرية عبر المنصة أو البريد أو
            الرسائل النصية عند توفرها. استمرارك في استخدام الخدمة بعد التحديث يُعد موافقة على الشروط المعدّلة.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3 mt-8">10. التواصل</h2>
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            لأي استفسار قانوني أو شكوى متعلقة بهذه الشروط، يُرجى التواصل معنا عبر البريد الإلكتروني:
            support@qabo.app (عنوان توضيحي — يُستبدل بعنوانكم الفعلي). نهدف للرد خلال 48 ساعة عمل.
          </p>
        </section>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
