import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'مزاد قبو'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let title = 'مزاد على قبو'
  let priceLabel = 'يبدأ قريباً'
  let bids = 0

  try {
    if (supabaseUrl && key) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/auctions?id=eq.${encodeURIComponent(id)}&select=title,current_bid,bid_count,ends_at`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        }
      )
      const rows = (await res.json()) as Array<{
        title?: string
        current_bid?: number
        bid_count?: number
      }>
      const auction = rows[0]
      if (auction?.title) title = auction.title
      if (auction?.current_bid != null) {
        const riyals = Number(auction.current_bid)
        priceLabel = `${riyals.toLocaleString('en-US')} ر.س`
      }
      bids = Number(auction?.bid_count ?? 0)
    }
  } catch {
    /* keep defaults */
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
          fontFamily: 'system-ui, sans-serif',
          padding: 60,
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.85, marginBottom: 20 }}>قبو | Qabboo</div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.25,
          }}
        >
          {title.length > 120 ? title.slice(0, 117) + '…' : title}
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: '#34d399', marginTop: 28 }}>{priceLabel}</div>
        <div style={{ fontSize: 24, marginTop: 16, opacity: 0.9 }}>{bids} مزايدة</div>
      </div>
    ),
    { ...size }
  )
}
