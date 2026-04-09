export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4" dir="rtl">
      <div className="mx-auto h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="mx-auto h-6 w-40 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}
