'use client'

import {
  ChartBar,
  ChatsCircle,
  CurrencyCircleDollar,
  Eye,
  Fire,
  Gavel,
  Lightbulb,
  SealCheck,
  Timer,
  TrendUp,
  UsersThree,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import type { PostAuctionReport } from '@/lib/types/post-auction-analytics'

type Props = {
  auctionId: string
  userId: string
  defaultOpen?: boolean
}

export function PostAuctionReportCard({ auctionId, userId, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [report, setReport] = useState<PostAuctionReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(
        '/api/auctions/' +
          encodeURIComponent(auctionId) +
          '/report?user_id=' +
          encodeURIComponent(userId)
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التحميل')
      setReport(data as PostAuctionReport)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطأ')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [auctionId, userId])

  useEffect(() => {
    if (!defaultOpen) return
    setOpen(true)
    void load()
  }, [defaultOpen, load])

  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      dir="rtl"
    >
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o
            if (next) void load()
            return next
          })
        }}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-right transition hover:bg-gray-50 dark:hover:bg-slate-700/50"
      >
        <span className="text-sm font-bold text-[#1B7F7A] dark:text-slate-200">📊 تقرير الأداء</span>
        <span className="text-xs text-gray-500">{open ? 'إخفاء' : 'عرض'}</span>
      </button>
      {open ? (
        <div className="border-t border-gray-100 px-4 pb-4 pt-2 dark:border-slate-700">
          {loading ? (
            <p className="py-4 text-center text-sm text-gray-500">جاري التحميل…</p>
          ) : err ? (
            <p className="py-2 text-sm text-red-600">{err}</p>
          ) : report ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-[#E6F4F3] p-3 dark:bg-[#134e4a]/40">
                <h4 className="mb-1 flex items-center gap-2 font-bold text-[#1F2937] dark:text-slate-100">
                  <ChartBar className="h-5 w-5 text-[#1B7F7A]" weight="bold" />
                  الملخص
                </h4>
                <p className="text-gray-700 dark:text-slate-300">
                  الحالة:{' '}
                  <strong>
                    {report.status === 'sold'
                      ? 'تم البيع'
                      : report.status === 'no_bids'
                        ? 'بدون مزايدات'
                        : 'لم يُحقق الاحتياطي'}
                  </strong>
                </p>
                <p className="mt-1 text-gray-600 dark:text-slate-400">
                  سعر الافتتاح: {report.startingBid.toLocaleString('ar-SA')} ر.س
                  {report.finalPrice != null && (
                    <>
                      {' '}
                      — النهائي: {report.finalPrice.toLocaleString('ar-SA')} ر.س
                    </>
                  )}
                </p>
                {report.priceIncrease != null && (
                  <p
                    className={
                      'mt-1 font-semibold ' +
                      (report.priceIncrease > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600')
                    }
                  >
                    تغيّر السعر: {Math.round(report.priceIncrease)}٪
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  القيمة السوقية المقدّرة (مرجع): {report.estimatedFMV.toLocaleString('ar-SA')} ر.س
                </p>
              </div>

              <div>
                <h4 className="mb-2 flex items-center gap-2 font-bold text-[#1F2937] dark:text-slate-100">
                  <UsersThree className="h-5 w-5 text-[#1B7F7A]" weight="bold" />
                  التفاعل
                </h4>
                <ul className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-slate-400">
                  <li className="flex items-center gap-1">
                    <Gavel className="h-4 w-4 text-[#1B7F7A]" weight="bold" /> {report.totalBids} مزايدة
                  </li>
                  <li className="flex items-center gap-1">
                    <UsersThree className="h-4 w-4" /> {report.uniqueBidders} مزايد
                  </li>
                  <li className="flex items-center gap-1">
                    <Eye className="h-4 w-4" /> {report.totalWatchers} في المفضلة
                  </li>
                  <li className="flex items-center gap-1">
                    <ChatsCircle className="h-4 w-4" /> {report.questionsAsked} سؤال /{' '}
                    {report.questionsAnswered} إجابة
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 flex items-center gap-2 font-bold text-[#1F2937] dark:text-slate-100">
                  <Timer className="h-5 w-5 text-[#1B7F7A]" weight="bold" />
                  التوقيت
                </h4>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-slate-400">
                  <li>أول مزايدة: {report.firstBidAfter ?? '—'}</li>
                  <li>أكثر فترة نشاطاً: {report.mostActivePeriod ?? '—'}</li>
                  <li className="flex items-center gap-1">
                    <Fire className="h-4 w-4 text-orange-500" weight="fill" />
                    تمديدات مكافحة الاقتناص: {report.antiSnipeExtensions}
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 flex items-center gap-2 font-bold text-[#1F2937] dark:text-slate-100">
                  <TrendUp className="h-5 w-5 text-[#1B7F7A]" weight="bold" />
                  مقارنة بالفئة
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  متوسط المزايدات في الفئة: {report.categoryAvgBids} — متوسط السعر:{' '}
                  {report.categoryAvgPrice.toLocaleString('ar-SA')} ر.س
                </p>
                <p
                  className={
                    'mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ' +
                    (report.performanceVsCategory === 'above'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : report.performanceVsCategory === 'below'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200')
                  }
                >
                  <CurrencyCircleDollar className="h-4 w-4" weight="bold" />
                  الأداء مقارنة بالفئة:{' '}
                  {report.performanceVsCategory === 'above'
                    ? 'فوق المتوسط'
                    : report.performanceVsCategory === 'below'
                      ? 'دون المتوسط'
                      : 'ضمن المتوسط'}
                </p>
              </div>

              <div>
                <h4 className="mb-2 flex items-center gap-2 font-bold text-[#1F2937] dark:text-slate-100">
                  <SealCheck className="h-5 w-5 text-[#1B7F7A]" weight="bold" />
                  الثقة
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  درجة الثقة الحالية (مرجع): {report.newTrustScore}
                  {report.trustScoreChange !== 0 && (
                    <span className="mr-1">
                      ({report.trustScoreChange > 0 ? '+' : ''}
                      {report.trustScoreChange})
                    </span>
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-[#1B7F7A]/20 bg-[#F0FAF9] p-3 dark:border-[#1B7F7A]/30 dark:bg-[#134e4a]/25">
                <h4 className="mb-2 flex items-center gap-2 font-bold text-[#1F2937] dark:text-slate-100">
                  <Lightbulb className="h-5 w-5 text-[#FF8C42]" weight="fill" />
                  نصائح
                </h4>
                <ul className="list-disc space-y-1 pr-4 text-xs text-gray-700 dark:text-slate-300">
                  {report.tips_ar.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
