import { createClient } from '@/lib/supabase-server'
import type { CommissionCalculation } from '@/lib/types/financial-types'
import { calculateCommissionFromDatabase } from '@/lib/services/commission-core'

async function getSettingJson(key: string): Promise<unknown> {
  const supabase = createClient()
  const { data } = await supabase.from('platform_settings').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}

export async function isFreePeriodActive(): Promise<boolean> {
  const enabled = await getSettingJson('free_period_enabled')
  const endsRaw = await getSettingJson('free_period_ends_at')
  const on =
    typeof enabled === 'object' &&
    enabled !== null &&
    'value' in enabled &&
    (enabled as { value: boolean }).value === true
  if (!on) return false
  const endsStr =
    typeof endsRaw === 'object' &&
    endsRaw !== null &&
    'value' in endsRaw &&
    typeof (endsRaw as { value: unknown }).value === 'string'
      ? (endsRaw as { value: string }).value
      : null
  if (!endsStr) return false
  const ends = new Date(endsStr)
  if (Number.isNaN(ends.getTime())) return false
  return Date.now() < ends.getTime()
}

/** صفقة بدأت في فترة مجانية تبقى مجانية حتى بعد انتهاء الفترة */
export async function isDealFreePeriod(deal: {
  free_period?: boolean | null
  platform_metadata?: Record<string, unknown> | null
}): Promise<boolean> {
  if (deal.free_period) return true
  const m = deal.platform_metadata
  return Boolean(m && typeof m === 'object' && m.free_period === true)
}

export async function getFreePeriodInfo(): Promise<{
  isActive: boolean
  endsAt: string | null
  daysRemaining: number | null
  isWarningPhase: boolean
  messageAr: string
}> {
  const enabled = await getSettingJson('free_period_enabled')
  const endsRaw = await getSettingJson('free_period_ends_at')
  const warnRaw = await getSettingJson('free_period_warning_days')
  const msgActive = await getSettingJson('free_period_message_ar')
  const msgEnd = await getSettingJson('free_period_ending_message_ar')

  const on =
    typeof enabled === 'object' &&
    enabled !== null &&
    'value' in enabled &&
    (enabled as { value: boolean }).value === true
  const endsStr =
    typeof endsRaw === 'object' &&
    endsRaw !== null &&
    'value' in endsRaw &&
    typeof (endsRaw as { value: unknown }).value === 'string'
      ? (endsRaw as { value: string }).value
      : null
  const warnDays =
    typeof warnRaw === 'object' &&
    warnRaw !== null &&
    'value' in warnRaw &&
    typeof (warnRaw as { value: unknown }).value === 'number'
      ? (warnRaw as { value: number }).value
      : 14

  const defaultActive =
    typeof msgActive === 'object' &&
    msgActive !== null &&
    'value' in msgActive &&
    typeof (msgActive as { value: unknown }).value === 'string'
      ? (msgActive as { value: string }).value
      : '🎉 المنصة مجانية حالياً! لا عمولة ولا رسوم — فقط استمتع بالتجربة الآمنة'

  const defaultEnding =
    typeof msgEnd === 'object' &&
    msgEnd !== null &&
    'value' in msgEnd &&
    typeof (msgEnd as { value: unknown }).value === 'string'
      ? (msgEnd as { value: string }).value
      : '⚠️ الفترة المجانية تنتهي قريباً — ستُفعَّل العمولة بتاريخ {date}. اطّلع على التفاصيل'

  if (!on || !endsStr) {
    return {
      isActive: false,
      endsAt: null,
      daysRemaining: null,
      isWarningPhase: false,
      messageAr: '',
    }
  }

  const ends = new Date(endsStr)
  const now = Date.now()
  if (Number.isNaN(ends.getTime()) || now >= ends.getTime()) {
    return {
      isActive: false,
      endsAt: endsStr,
      daysRemaining: 0,
      isWarningPhase: false,
      messageAr: '',
    }
  }

  const msPerDay = 86400000
  const daysRemaining = Math.ceil((ends.getTime() - now) / msPerDay)
  const isWarningPhase = daysRemaining <= warnDays
  const dateAr = ends.toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const messageAr = isWarningPhase
    ? defaultEnding.replace('{date}', dateAr).replace('{X}', String(daysRemaining))
    : defaultActive

  return {
    isActive: true,
    endsAt: endsStr,
    daysRemaining,
    isWarningPhase,
    messageAr,
  }
}

export async function getEffectiveCommissionRates(
  salePrice: number,
  sellerId: string,
  options?: { isProSubscriber?: boolean }
): Promise<CommissionCalculation> {
  if (await isFreePeriodActive()) {
    const info = await getFreePeriodInfo()
    return {
      salePrice,
      tierName: 'free_period',
      sellerRate: 0,
      sellerCommission: 0,
      buyerProtection: 0,
      totalBuyerCharge: salePrice,
      sellerPayout: salePrice,
      platformRevenue: 0,
      breakdown: [
        { label_ar: 'سعر المنتج', amount: salePrice, who_pays: 'buyer' },
        { label_ar: 'عمولة البائع (مجانية حالياً! 🎉)', amount: 0, who_pays: 'seller' },
        { label_ar: 'رسم حماية المشتري (مجاني حالياً! 🎉)', amount: 0, who_pays: 'buyer' },
      ],
      freePeriod: true,
      freePeriodEndsAt: info.endsAt,
    }
  }
  return calculateCommissionFromDatabase(salePrice, sellerId, options)
}
