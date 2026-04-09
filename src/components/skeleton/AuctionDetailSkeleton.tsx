export function AuctionDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4" dir="rtl">
      <div className="aspect-square w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="h-8 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-12 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-4/6 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-14 rounded-xl bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}
