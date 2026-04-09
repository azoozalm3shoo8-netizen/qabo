'use client'

import { Crown, Medal, Trophy } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { SellerResponsivenessBadge } from '@/components/seller/SellerResponsivenessBadge'
import type { ResponsivenessData } from '@/lib/types/seller-responsiveness'

export type LeaderboardBidderRow = {
  rank: number
  label: string
  level: number
  level_name: string
  xp: number
  auctions_won: number
  is_viewer?: boolean
}

export type LeaderboardSellerRow = {
  rank: number
  display_name: string
  trust_score: number
  trust_level: string
  successful_sales: number
  responsiveness: ResponsivenessData
  is_viewer?: boolean
}

function rankAccent(rank: number): string {
  if (rank === 1) return 'border-amber-400/80 bg-gradient-to-l from-amber-50 to-amber-100/80 dark:from-amber-950/40 dark:to-amber-900/20'
  if (rank === 2) return 'border-slate-300 bg-gradient-to-l from-slate-50 to-slate-100/90 dark:from-slate-800/50 dark:to-slate-800/30'
  if (rank === 3) return 'border-orange-300/90 bg-gradient-to-l from-orange-50 to-orange-100/70 dark:from-orange-950/30 dark:to-orange-900/20'
  return 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800/80'
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" weight="fill" />
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-500" weight="fill" />
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" weight="fill" />
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E6F4F3] text-sm font-bold text-[#1B7F7A] dark:bg-slate-700 dark:text-slate-100">
      {rank}
    </span>
  )
}

export function LeaderboardBiddersTable({ rows }: { rows: LeaderboardBidderRow[] }) {
  return (
    <div className="space-y-3" dir="rtl">
      <div className="hidden md:grid md:grid-cols-[48px_1fr_100px_100px_100px] md:gap-3 md:rounded-xl md:bg-gray-50 md:px-4 md:py-2 md:text-xs md:font-bold md:text-gray-600 dark:md:bg-slate-800/60 dark:md:text-slate-300">
        <span className="text-center">#</span>
        <span>المزايد</span>
        <span className="text-center">المستوى</span>
        <span className="text-center">النقاط</span>
        <span className="text-center">مزادات فائزة</span>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.rank}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className={
            'rounded-2xl border-2 p-3 shadow-sm transition md:grid md:grid-cols-[48px_1fr_100px_100px_100px] md:items-center md:gap-3 md:border md:p-3 ' +
            rankAccent(row.rank) +
            (row.is_viewer
              ? ' bg-[#1B7F7A]/5 ring-2 ring-[#1B7F7A] ring-offset-2 dark:bg-[#1B7F7A]/10 dark:ring-offset-slate-900'
              : '')
          }
        >
          <div className="mb-2 flex items-center justify-between md:mb-0 md:justify-center">
            <div className="flex items-center gap-2 md:flex-col md:gap-1">
              <RankIcon rank={row.rank} />
            </div>
            <span className="text-xs text-gray-500 md:hidden">#{row.rank}</span>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2 md:mb-0">
            <span className="font-bold text-[#1F2937] dark:text-slate-100">{row.label}</span>
            {row.is_viewer ? (
              <span className="rounded-full bg-[#1B7F7A]/15 px-2 py-0.5 text-[10px] font-bold text-[#1B7F7A] dark:bg-teal-900/40 dark:text-teal-100">
                أنت
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm md:contents md:text-base">
            <div className="rounded-lg bg-white/80 px-2 py-1 dark:bg-slate-900/40">
              <p className="text-[10px] text-gray-500 md:hidden">مستوى</p>
              <p className="font-semibold text-[#1B7F7A] dark:text-teal-300">
                {row.level}
                <span className="mr-1 text-xs font-normal text-gray-500 dark:text-slate-400">
                  {row.level_name}
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-white/80 px-2 py-1 dark:bg-slate-900/40">
              <p className="text-[10px] text-gray-500 md:hidden">XP</p>
              <p className="font-bold text-gray-900 dark:text-slate-100">{row.xp.toLocaleString('ar-SA')}</p>
            </div>
            <div className="rounded-lg bg-white/80 px-2 py-1 dark:bg-slate-900/40">
              <p className="text-[10px] text-gray-500 md:hidden">فوز</p>
              <p className="font-bold text-gray-900 dark:text-slate-100">{row.auctions_won}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function trustBadgeClass(level: string): string {
  if (level === 'gold') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100'
  if (level === 'silver') return 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-100'
  return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
}

export function LeaderboardSellersTable({ rows }: { rows: LeaderboardSellerRow[] }) {
  return (
    <div className="space-y-3" dir="rtl">
      <div className="hidden md:grid md:grid-cols-[48px_1fr_120px_88px_88px] md:gap-3 md:rounded-xl md:bg-gray-50 md:px-4 md:py-2 md:text-xs md:font-bold md:text-gray-600 dark:md:bg-slate-800/60 dark:md:text-slate-300">
        <span className="text-center">#</span>
        <span>البائع</span>
        <span className="text-center">الثقة</span>
        <span className="text-center">مبيعات</span>
        <span className="text-center">تجاوب</span>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.rank}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className={
            'rounded-2xl border-2 p-3 shadow-sm md:grid md:grid-cols-[48px_1fr_120px_88px_88px] md:items-center md:gap-3 md:border md:p-3 ' +
            rankAccent(row.rank) +
            (row.is_viewer ? ' ring-2 ring-[#FF8C42] ring-offset-2 dark:ring-offset-slate-900' : '')
          }
        >
          <div className="mb-2 flex items-center justify-between md:mb-0 md:justify-center">
            <RankIcon rank={row.rank} />
            <Crown className="h-4 w-4 text-amber-500/70 md:hidden" weight="duotone" />
          </div>
          <div className="mb-2 space-y-2 md:mb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#1F2937] dark:text-slate-100">{row.display_name}</span>
              {row.is_viewer ? (
                <span className="rounded-full bg-[#FF8C42]/20 px-2 py-0.5 text-[10px] font-bold text-[#c45d18] dark:text-amber-200">
                  أنت
                </span>
              ) : null}
            </div>
            <span
              className={
                'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ' + trustBadgeClass(row.trust_level)
              }
            >
              {row.trust_level === 'gold' ? 'ذهبي' : row.trust_level === 'silver' ? 'فضي' : 'مراقبة'}
            </span>
          </div>
          <p className="mb-2 text-center text-lg font-bold text-[#1B7F7A] md:mb-0 dark:text-teal-300">
            {row.trust_score}
          </p>
          <p className="mb-2 text-center font-semibold text-gray-800 md:mb-0 dark:text-slate-100">
            {row.successful_sales}
          </p>
          <div className="flex justify-center md:justify-center">
            <SellerResponsivenessBadge data={row.responsiveness} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
