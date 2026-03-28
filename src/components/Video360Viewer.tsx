'use client'

import '@cloudimage/360-view/css'
import dynamic from 'next/dynamic'
import { Info, Warning, WarningOctagon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CI360Hotspot, Defect } from '@/lib/video360-types'
import type { CI360ViewerRef, Hotspot as ViewerHotspot } from '@cloudimage/360-view/react'

const CI360Viewer = dynamic(
  () => import('@cloudimage/360-view/react').then((mod) => mod.CI360Viewer ?? mod.default),
  { ssr: false }
)

export interface Video360ViewerProps {
  frameUrls: string[]
  annotatedUrls: string[]
  hotspots: CI360Hotspot[]
  defects: Defect[]
  overallCondition: string
  conditionScore: number
  summaryAr: string
}

function displayCondition(c: string) {
  if (c === 'unknown') return 'غير محدد'
  return c
}

export function Video360Viewer({
  frameUrls,
  annotatedUrls,
  hotspots,
  defects,
  overallCondition,
  conditionScore,
  summaryAr,
}: Video360ViewerProps) {
  const [annotatedMode, setAnnotatedMode] = useState(false)
  const [dark, setDark] = useState(false)
  const viewerRef = useRef<CI360ViewerRef>(null)

  useEffect(() => {
    const el = document.documentElement
    const sync = () => setDark(el.classList.contains('dark'))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const canAnnot =
    annotatedUrls.length >= 2 && annotatedUrls.length === frameUrls.length
  const activeUrls = annotatedMode && canAnnot ? annotatedUrls : frameUrls
  const amountX = activeUrls.length

  const libHotspots: ViewerHotspot[] = useMemo(
    () =>
      (hotspots || []).map((h) => ({
        id: h.id,
        label: h.label,
        orientation: h.orientation,
        containerSize: h.containerSize,
        positions: h.positions,
        content: h.content,
      })),
    [hotspots]
  )

  const goToDefect = useCallback(
    (frameIndex: number) => {
      viewerRef.current?.goToFrame(frameIndex, undefined)
    },
    []
  )

  const scoreColor =
    conditionScore >= 80 ? 'bg-green-500' : conditionScore >= 50 ? 'bg-[#FF8C42]' : 'bg-red-500'

  if (amountX < 2) {
    return <p className="text-sm text-gray-500">لا توجد إطارات كافية لعرض 360°</p>
  }

  return (
    <div className="space-y-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400">حالة المنتج</p>
            <p className="text-lg font-bold text-[#1B7F7A] dark:text-[#2dd4bf]">{displayCondition(overallCondition)}</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500">الدرجة</p>
            <p className="text-xl font-bold text-[#1F2937] dark:text-slate-100">{conditionScore}/100</p>
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
          <div className={'h-full rounded-full ' + scoreColor} style={{ width: `${Math.min(100, conditionScore)}%` }} />
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">العيوب: {defects?.length ?? 0}</p>
        {summaryAr ? <p className="mt-2 text-sm leading-relaxed text-[#1F2937] dark:text-slate-200">{summaryAr}</p> : null}
      </motion.div>

      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setAnnotatedMode(false)}
          className={
            'rounded-full px-4 py-2 text-xs font-bold transition ' +
            (!annotatedMode
              ? 'bg-[#1B7F7A] text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200')
          }
        >
          العرض الأصلي
        </button>
        <button
          type="button"
          disabled={!canAnnot}
          onClick={() => setAnnotatedMode(true)}
          className={
            'rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-40 ' +
            (annotatedMode
              ? 'bg-[#FF8C42] text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200')
          }
        >
          عرض العيوب
        </button>
      </div>

      <div className="mx-auto w-full max-w-[800px] overflow-hidden rounded-2xl border border-gray-100 bg-[#F3F4F6] dark:border-slate-700 dark:bg-slate-900">
        <CI360Viewer
          ref={viewerRef}
          id={'ci360-' + amountX}
          className="w-full"
          imageListX={activeUrls}
          amountX={amountX}
          indexZeroBase={true}
          autoplay={true}
          speed={100}
          fullscreen={true}
          hotspots={annotatedMode ? libHotspots : []}
          aspectRatio="16/9"
          theme={dark ? 'dark' : 'light'}
          bottomCircle={true}
          zoomMax={3}
          hints={true}
          brandColor="#1B7F7A"
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        {!defects || defects.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Info className="h-6 w-6 shrink-0" weight="fill" />
            <p className="text-sm font-medium">لم يتم اكتشاف أي عيوب — المنتج في حالة ممتازة!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {defects.map((d, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-gray-100 bg-[#F3F4F6]/50 p-3 dark:border-slate-600 dark:bg-slate-900/50"
              >
                <div className="flex items-start gap-2">
                  {d.severity === 'major' ? (
                    <WarningOctagon className="h-6 w-6 shrink-0 text-red-500" weight="fill" />
                  ) : d.severity === 'moderate' ? (
                    <Warning className="h-6 w-6 shrink-0 text-[#FF8C42]" weight="fill" />
                  ) : (
                    <Info className="h-6 w-6 shrink-0 text-green-600" weight="fill" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1F2937] dark:text-slate-100">{d.type}</p>
                    <p
                      className={
                        'text-xs font-bold ' +
                        (d.severity === 'major'
                          ? 'text-red-600'
                          : d.severity === 'moderate'
                            ? 'text-[#FF8C42]'
                            : 'text-green-600')
                      }
                    >
                      {d.severity === 'minor' ? 'طفيف' : d.severity === 'moderate' ? 'متوسط' : 'كبير'}
                    </p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">{d.description_ar}</p>
                    <button
                      type="button"
                      onClick={() => goToDefect(d.frame_index)}
                      className="mt-2 text-xs font-bold text-[#1B7F7A] underline"
                    >
                      اذهب للعيب
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
