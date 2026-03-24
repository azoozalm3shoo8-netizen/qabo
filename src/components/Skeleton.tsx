export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={
        'rounded-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-skeleton-shimmer ' +
        className
      }
    />
  )
}

export function AuctionCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <Skeleton className="h-32 w-full rounded-none rounded-t-xl" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-[88%]" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

export function HomeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <AuctionCardSkeleton key={i} />
      ))}
    </div>
  )
}
