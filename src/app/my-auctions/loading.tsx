export default function MyAuctionsLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-3 px-4 pb-24 pt-6">
      <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 flex-1 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-slate-700" />
      ))}
    </div>
  )
}
