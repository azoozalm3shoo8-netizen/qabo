export type PricingInsight = {
  category: string
  avgPriceRatio: number
  medianFinalPrice: number
  avgBidsWhenSold: number
  bestStartingBidRange: string
  sampleSize: number
}

export type EnhancedSuggestion = {
  estimatedFMV: number
  suggestedStartingBid: number
  suggestedReservePrice: number
  minimumBidIncrement: number
  breakdown: {
    condition_ar: string
    conditionRate: number
    categoryStartRate: number
    keywordBoost: number | null
    originalPriceUsed: boolean
  }
  tips_ar: string[]
  adjusted: boolean
  adjustmentReason_ar?: string
  categoryInsight?: PricingInsight
}
