import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'مركز المساعدة | قبو' },
  description: 'أسئلة شائعة حول المزادات والدفع وحماية المشتري على قبو.',
}

const FAQ = [
  {
    q: 'كيف أنشئ مزاد؟',
    a: 'اضغط على + في الأسفل واتبع الخطوات الأربع: صور، تفاصيل، تسعير، ومراجعة.',
  },
  {
    q: 'كيف أدفع؟',
    a: 'بعد فوزك، ادفع بالبطاقة البنكية أو Apple Pay من صفحة الصفقة.',
  },
  {
    q: 'ما هي حماية المشتري؟',
    a: 'نحتفظ بأموالك حتى تستلم القطعة وتفحصها خلال 3 أيام. إذا لم تكن راضياً، افتح نزاعاً.',
  },
  {
    q: 'كم عمولة قبو؟',
    a: '9% + 3 ر.س من المبلغ النهائي، تُضاف على المشتري عند الفوز (تقديري — راجع صفحة كيف يعمل المزاد للتفاصيل المحدثة).',
  },
  {
    q: 'كيف أتواصل مع البائع؟',
    a: 'من صفحة المزاد، استخدم الرسائل أو «اسأل البائع» حسب التوفر.',
  },
  {
    q: 'ماذا لو لم تصل القطعة؟',
    a: 'افتح نزاعاً من صفحة الصفقة وسنساعدك في الحل.',
  },
  {
    q: 'كيف ألغي مزادي؟',
    a: 'يمكنك إلغاء المزاد قبل أول مزايدة فقط من صفحة مزاداتك.',
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 pb-16" dir="rtl">
      <h1 className="text-2xl font-bold text-[#1B7F7A] dark:text-teal-300">مركز المساعدة</h1>
      <p className="text-sm text-gray-600 dark:text-slate-400">
        إن لم تجد إجابتك، تواصل معنا من{' '}
        <a href="mailto:support@qabboo.com" className="font-bold text-[#1B7F7A] underline">
          الدعم
        </a>
        .
      </p>
      <div className="space-y-3">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm open:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <summary className="cursor-pointer text-sm font-bold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F7A] dark:text-slate-100">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-400">{item.a}</p>
          </details>
        ))}
      </div>
      <Link
        href="/how-it-works"
        className="inline-flex min-h-[44px] items-center rounded-xl bg-[#1B7F7A] px-4 py-3 text-sm font-bold text-white"
      >
        كيف يعمل قبو؟
      </Link>
    </div>
  )
}
