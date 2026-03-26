export default function AuctionLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 pb-24 pt-6">
      <div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-700" />
      <div className="h-6 w-3/4 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700" />
      <div className="h-4 w-1/2 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700" />
      <div className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-700" />
      <div className="h-12 animate-pulse rounded-xl bg-gray-200 dark:bg-slate-700" />
    </div>
  )
}
