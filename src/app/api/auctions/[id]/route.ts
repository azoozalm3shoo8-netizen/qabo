import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { closeAuctionIfExpiredForId } from '@/lib/server/close-expired-auctions'
import { calculateSellerResponsiveness } from '@/lib/services/seller-responsiveness-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  await closeAuctionIfExpiredForId(supabase, id)

  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!auction) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const [sellerRes, bidderRes, sellerResponsiveness] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, city, rating')
      .eq('id', auction.seller_id)
      .maybeSingle(),
    auction.highest_bidder_id
      ? supabase
          .from('profiles')
          .select('full_name')
          .eq('id', auction.highest_bidder_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { full_name: string } | null }),
    calculateSellerResponsiveness(String(auction.seller_id)),
  ])

  const sellerName =
    (sellerRes.data?.full_name && String(sellerRes.data.full_name).trim()) || ''

  return NextResponse.json({
    ...auction,
    seller: {
      full_name: sellerName || 'بائع',
      city: sellerRes.data?.city ?? null,
      rating: sellerRes.data?.rating ?? null,
    },
    highest_bidder: auction.highest_bidder_id
      ? {
          full_name:
            (bidderRes.data?.full_name && String(bidderRes.data.full_name).trim()) ||
            'مزايد',
        }
      : null,
    seller_responsiveness: sellerResponsiveness,
  })
}
