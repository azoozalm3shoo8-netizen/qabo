import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Qabboo Auction'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function TwitterImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  let title = 'مزاد على قبو'
  let price = 'يبدأ قريباً'
  let bids = 0

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/auctions?id=eq.${encodeURIComponent(id)}&select=title,current_bid,bid_count,ends_at`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )
    const [auction] = await res.json()
    if (auction) {
      title = auction.title || title
      price = auction.current_bid
        ? `${(auction.current_bid / 100).toLocaleString()} ر.س`
        : price
      bids = auction.bid_count || 0
    }
  } catch {
    // fallback to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f766e 0%, #115e59 50%, #134e4a 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.8, marginBottom: 20, display: 'flex' }}>
          قبو | Qabboo
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.3,
            display: 'flex',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            color: '#34d399',
            marginTop: 30,
            display: 'flex',
          }}
        >
          {price}
        </div>
        <div style={{ fontSize: 24, marginTop: 15, opacity: 0.9, display: 'flex' }}>
          🔥 {bids} مزايدة
        </div>
      </div>
    ),
    { ...size }
  )
}
