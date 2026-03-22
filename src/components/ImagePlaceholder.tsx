export function ImagePlaceholder({
  className = '',
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const sz =
    size === 'sm'
      ? 'text-2xl'
      : size === 'md'
        ? 'text-3xl'
        : size === 'lg'
          ? 'text-5xl'
          : 'text-7xl'
  return (
    <div
      className={
        'bg-gray-100 flex items-center justify-center rounded-xl text-gray-400 ' + sz + ' ' + className
      }
      aria-hidden
    >
      📦
    </div>
  )
}
