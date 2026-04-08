export type PostAuctionReport = {
  auctionId: string
  title: string
  status: 'sold' | 'no_bids' | 'reserve_not_met'

  startingBid: number
  finalPrice: number | null
  priceIncrease: number | null
  estimatedFMV: number

  totalBids: number
  uniqueBidders: number
  totalWatchers: number
  questionsAsked: number
  questionsAnswered: number

  firstBidAfter: string | null
  mostActivePeriod: string | null
  antiSnipeExtensions: number

  categoryAvgBids: number
  categoryAvgPrice: number
  performanceVsCategory: 'above' | 'average' | 'below'

  tips_ar: string[]

  trustScoreChange: number
  newTrustScore: number
}
