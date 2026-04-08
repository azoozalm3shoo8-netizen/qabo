import { NextRequest, NextResponse } from 'next/server'
import {
  getRecommendationsForUser,
  getSimilarAuctions,
  getTrendingAuctions,
} from '@/lib/services/recommendation-service'

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'trending'
  const userId = req.nextUrl.searchParams.get('user_id')
  const auctionId = req.nextUrl.searchParams.get('auction_id')
  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.min(40, Math.max(1, parseInt(limitRaw, 10) || 12)) : 12

  try {
    if (type === 'personal') {
      if (!userId) {
        return NextResponse.json({ error: 'user_id مطلوب' }, { status: 400 })
      }
      const items = await getRecommendationsForUser(userId, limit)
      return NextResponse.json(
        { items },
        { headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=120' } }
      )
    }
    if (type === 'similar') {
      if (!auctionId) {
        return NextResponse.json({ error: 'auction_id مطلوب' }, { status: 400 })
      }
      const items = await getSimilarAuctions(auctionId, limit)
      return NextResponse.json(
        { items },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120' } }
      )
    }
    const items = await getTrendingAuctions(limit)
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
