import { getEffectiveCommissionRates } from '@/lib/services/free-period-service'
import {
  calculateCommissionFromDatabase,
  estimatePrice,
  formatHalalat,
  getCommissionTiers,
} from '@/lib/services/commission-core'
import type { CommissionCalculation } from '@/lib/types/financial-types'

/** يمر عبر الفترة المجانية تلقائياً عبر getEffectiveCommissionRates */
export async function calculateCommission(
  salePrice: number,
  sellerId: string,
  options?: { isProSubscriber?: boolean }
): Promise<CommissionCalculation> {
  return getEffectiveCommissionRates(salePrice, sellerId, options)
}

export { calculateCommissionFromDatabase, estimatePrice, formatHalalat, getCommissionTiers }
