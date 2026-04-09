import { AuctionDetailSkeleton } from '@/components/skeleton/AuctionDetailSkeleton'

export default function AuctionLoading() {
  return (
    <div className="mx-auto max-w-lg pb-24 pt-6">
      <AuctionDetailSkeleton />
    </div>
  )
}
