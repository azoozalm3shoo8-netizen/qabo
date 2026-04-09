/**
 * مساعد نزاعات قائم على قواعد — بدون API خارجي.
 */

export type DisputeAnalysis = {
  suggestedResolution: 'full_refund' | 'partial_refund' | 'seller_favor' | 'needs_review'
  confidence: number
  reason_ar: string
  factors: string[]
}

function conditionRank(s: string): number {
  const scale: Record<string, number> = {
    new: 5,
    like_new: 4,
    good: 3,
    fair: 2,
    poor: 1,
    new_sealed: 5,
    new_open: 5,
    used: 3,
    refurbished: 4,
  }
  const k = s.trim().toLowerCase()
  return scale[k] ?? 3
}

function getConditionGap(claimed: string, disputed: string): number {
  return Math.abs(conditionRank(claimed) - conditionRank(disputed))
}

export function analyzeDispute(params: {
  disputeReason: string
  hasPhotos: boolean
  photoCount: number
  dealAmountHalalas: number
  sellerTrustScore: number
  sellerCompletedDeals: number
  buyerCompletedDeals: number
  timeSinceDeliveryHours: number
  sellerResponded: boolean
  sellerResponseTimeHours: number | null
  itemConditionClaimed: string
  itemConditionDisputed: string
}): DisputeAnalysis {
  let buyerScore = 0
  let sellerScore = 0
  const factors: string[] = []

  if (params.hasPhotos && params.photoCount >= 2) {
    buyerScore += 25
    factors.push('المشتري أرفق صوراً واضحة')
  } else if (!params.hasPhotos) {
    sellerScore += 15
    factors.push('المشتري لم يرفق صوراً')
  }

  if (params.sellerTrustScore < 50) {
    buyerScore += 20
    factors.push('سمعة البائع منخفضة')
  } else if (params.sellerTrustScore > 80) {
    sellerScore += 15
    factors.push('البائع ذو سمعة عالية')
  }

  if (!params.sellerResponded) {
    buyerScore += 30
    factors.push('البائع لم يرد')
  } else if (params.sellerResponseTimeHours != null && params.sellerResponseTimeHours < 12) {
    sellerScore += 10
    factors.push('البائع رد بسرعة')
  }

  const conditionGap = getConditionGap(params.itemConditionClaimed, params.itemConditionDisputed)
  if (conditionGap >= 2) {
    buyerScore += 20
    factors.push('فرق بين الحالة المعلنة والمتنازع عليها')
  }

  if (params.dealAmountHalalas < 10_000) {
    buyerScore += 5
    factors.push('مبلغ الصفقة صغير')
  }

  if (params.timeSinceDeliveryHours > 168) {
    sellerScore += 15
    factors.push('النزاع بعد فترة طويلة من الاستلام')
  }

  const total = buyerScore + sellerScore
  const buyerRatio = total > 0 ? buyerScore / total : 0.5

  if (buyerRatio > 0.7) {
    return {
      suggestedResolution: 'full_refund',
      confidence: Math.round(buyerRatio * 1000) / 1000,
      reason_ar: 'الأدلة تميل لصالح المشتري',
      factors,
    }
  }
  if (buyerRatio > 0.55) {
    return {
      suggestedResolution: 'partial_refund',
      confidence: Math.round(buyerRatio * 1000) / 1000,
      reason_ar: 'يُقترح حل وسط باسترداد جزئي',
      factors,
    }
  }
  if (buyerRatio < 0.35) {
    return {
      suggestedResolution: 'seller_favor',
      confidence: Math.round((1 - buyerRatio) * 1000) / 1000,
      reason_ar: 'الأدلة تميل لصالح البائع',
      factors,
    }
  }
  return {
    suggestedResolution: 'needs_review',
    confidence: 0.5,
    reason_ar: 'تحتاج مراجعة يدوية من المنصة',
    factors,
  }
}
