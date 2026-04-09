'use client'

const CHIPS: { label: string; api: string }[] = [
  { label: 'الكل', api: 'الكل' },
  { label: 'إلكترونيات', api: 'إلكترونيات' },
  { label: 'سيارات', api: 'سيارات' },
  { label: 'ساعات', api: 'ساعات' },
  { label: 'حقائب', api: 'أزياء' },
  { label: 'أثاث', api: 'أثاث' },
  { label: 'فن', api: 'أخرى' },
  { label: 'رياضة', api: 'رياضة' },
  { label: 'أخرى', api: 'أخرى' },
]

export function CategoryBar({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (api: string) => void
}) {
  return (
    <div
      className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
      dir="rtl"
      role="tablist"
      aria-label="فئات المزادات"
    >
      {CHIPS.map(({ label, api }) => {
        const active = selected === api
        return (
          <button
            key={api + label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(api)}
            className={
              'snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ' +
              (active
                ? 'bg-[#1B7F7A] text-white shadow-md dark:bg-teal-600'
                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300')
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
