'use client'

import { Prohibit, Star, Trophy, Warning } from '@phosphor-icons/react'
import type { ComponentType } from 'react'

export type SellerTrustLevel = 'gold' | 'silver' | 'watch' | 'banned'

const LEVEL_STYLES: Record<
  SellerTrustLevel,
  {
    gradient: string
    border: string
    label: string
    Icon: ComponentType<{ className?: string; weight?: 'fill' | 'bold' | 'duotone' }>
    iconClass: string
  }
> = {
  gold: {
    gradient: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
    border: 'border-2 border-yellow-300 ring-2 ring-yellow-400/40 dark:ring-yellow-500/30',
    label: 'بائع موثوق',
    Icon: Trophy,
    iconClass: 'text-yellow-950',
  },
  silver: {
    gradient: 'bg-gradient-to-br from-gray-300 to-gray-400',
    border: 'border-2 border-gray-400 ring-1 ring-gray-400/30 dark:from-slate-400 dark:to-slate-500',
    label: 'بائع جيد',
    Icon: Star,
    iconClass: 'text-gray-900 dark:text-slate-900',
  },
  watch: {
    gradient: 'bg-gradient-to-br from-orange-400 to-orange-500',
    border: 'border-2 border-[#FF8C42]/80 ring-1 ring-[#FF8C42]/25',
    label: 'تحت المراقبة',
    Icon: Warning,
    iconClass: 'text-white',
  },
  banned: {
    gradient: 'bg-gradient-to-br from-red-500 to-red-600',
    border: 'border-2 border-red-700 ring-1 ring-red-500/30',
    label: 'محظور',
    Icon: Prohibit,
    iconClass: 'text-white',
  },
}

export type SellerTrustBadgeProps = {
  trustScore: number
  trustLevel: SellerTrustLevel
  totalSales: number
  successfulSales: number
  successRate?: number
}

type LegacyProps = {
  trustScore?: number
  trustLevel?: SellerTrustLevel
  totalSales?: number
  successfulSales?: number
  successRate?: number
  level?: SellerTrustLevel
  sales?: number
  rate?: number
}

export function SellerTrustBadge(props: SellerTrustBadgeProps | LegacyProps) {
  const trustScore = props.trustScore ?? 0
  const trustLevel = props.trustLevel ?? props.level ?? 'watch'
  const successfulSales = props.successfulSales ?? props.sales ?? 0
  const totalSales = props.totalSales ?? successfulSales
  const successRate = props.successRate ?? props.rate

  const cfg = LEVEL_STYLES[trustLevel]
  const { Icon } = cfg

  return (
    <div dir="rtl" className="space-y-2">
      <div
        className={`flex flex-col items-center gap-2 rounded-2xl px-4 py-3 shadow-md sm:flex-row sm:justify-between ${cfg.gradient} ${cfg.border}`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm dark:bg-black/20">
            <Icon className={`h-7 w-7 ${cfg.iconClass}`} weight="fill" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-white drop-shadow-sm">{cfg.label}</p>
            {successRate != null && !Number.isNaN(successRate) ? (
              <p className="text-xs text-white/90">معدل نجاح المبيعات: {Math.round(successRate)}٪</p>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl bg-[#1B7F7A]/30 px-3 py-1.5 text-center text-xs font-bold text-white backdrop-blur-sm dark:bg-[#1B7F7A]/50">
          ثقة القبو
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[#1B7F7A] dark:text-[#FF8C42]">{trustScore} نقطة ثقة</span>
        <span className="text-gray-700 dark:text-slate-300">
          {successfulSales} عملية بيع ناجحة
          {totalSales !== successfulSales ? ` · ${totalSales} إجمالي العمليات` : ''}
        </span>
      </div>
    </div>
  )
}
