export type AuctionRecommendation = {
  auctionId: string
  title: string
  currentPrice: number
  imageUrl: string | null
  endsAt: string
  bidCount: number
  watcherCount: number
  category: string
  reason_ar: string
}
