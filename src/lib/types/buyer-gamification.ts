export type Badge = {
  id: string
  name_ar: string
  icon: string
  earned_at: string
}

export type BuyerProfile = {
  id: string
  user_id: string
  xp: number
  level: number
  level_name: string
  total_bids: number
  auctions_won: number
  auctions_watched: number
  current_streak: number
  longest_streak: number
  last_bid_date: string | null
  last_activity_date: string | null
  badges: Badge[]
  created_at: string
  updated_at: string
}

export type XPEvent = 'bid' | 'win' | 'deal_complete' | 'watch'

export type LeaderboardEntry = {
  rank: number
  displayName: string
  xp: number
  level: number
  levelName: string
}
