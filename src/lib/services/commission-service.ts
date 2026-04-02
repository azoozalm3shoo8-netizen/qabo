import {
  buildFreePeriodCommissionCalculation,
  getEffectiveCommissionRates,
  isDealFreePeriod,
  isFreePeriodActive,
} from '@/lib/services/free-period-service'
import {
  calculateCommissionFromDatabase,
  estimatePrice,
  formatHalalat,
  getCommissionTiers,
} from '@/lib/services/commission-core'
import type { CommissionCalculation } from '@/lib/types/financial-types'

export async function calculateCommission(
  salePrice: number,
  sellerId: string,
  options?: {
    isProSubscriber?: boolean
    deal?: { free_period?: boolean | null; platform_metadata?: Record<string, unknown> | null }
  }
): Promise<CommissionCalculation> {
  if (options?.deal && (await isDealFreePeriod(options.deal))) {
    const m = options.deal.platform_metadata
    const endsAt = typeof m?.free_period_ends_at === 'string' ? m.free_period_ends_at : null
    return buildFreePeriodCommissionCalculation(salePrice, endsAt)
  }
  if (await isFreePeriodActive()) {
    return getEffectiveCommissionRates(salePrice, sellerId, options)
  }
  return calculateCommissionFromDatabase(salePrice, sellerId, options)
}

export { calculateCommissionFromDatabase, estimatePrice, formatHalalat, getCommissionTiers }
