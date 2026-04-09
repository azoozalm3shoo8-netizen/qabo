type AuctionJsonLdProps = {
  auction: {
    id: string
    title: string
    description?: string | null
    current_bid_halalas: number
    starting_bid_halalas: number
    bid_count: number
    ends_at: string
    images?: string[] | null
    category?: string
    seller_name?: string | null
  }
}

export function AuctionJsonLd({ auction }: AuctionJsonLdProps) {
  const ends = new Date(auction.ends_at)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: auction.title,
    description: auction.description || auction.title,
    image: auction.images?.[0],
    category: auction.category,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'SAR',
      lowPrice: (auction.starting_bid_halalas / 100).toFixed(2),
      highPrice: (auction.current_bid_halalas / 100).toFixed(2),
      offerCount: Math.max(1, auction.bid_count),
      availability:
        ends > new Date() ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    },
    ...(auction.seller_name
      ? { seller: { '@type': 'Person', name: auction.seller_name } }
      : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
