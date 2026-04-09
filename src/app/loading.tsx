export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 dark:bg-slate-900" dir="rtl">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-12 animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-700" />
        <div className="scrollbar-hide flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-24 shrink-0 rounded-full bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-slate-700" />
        <div className="flex gap-3 overflow-hidden pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 w-40 shrink-0 rounded-xl bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    </div>
  )
}
