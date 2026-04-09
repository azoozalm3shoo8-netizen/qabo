'use client'

import { useCountdown } from '@/hooks/useCountdown'

export function InspectionCountdown({ endsAt }: { endsAt: string }) {
  const { days, hours, minutes, seconds, isExpired, totalSeconds } = useCountdown(endsAt)

  if (isExpired) {
    return <div className="text-red-600 font-bold dark:text-red-400">انتهت فترة الفحص</div>
  }

  const isUrgent = days === 0 && hours < 12

  return (
    <div
      className={`flex flex-wrap gap-2 items-center text-lg font-mono ${isUrgent ? 'text-red-600 animate-pulse dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
      dir="ltr"
      role="timer"
      aria-live={totalSeconds < 3600 ? 'assertive' : 'polite'}
      aria-label={`متبقي للفحص ${days} يوم ${hours} ساعة ${minutes} دقيقة`}
    >
      <span>متبقي للفحص:</span>
      {days > 0 ? <span>{days} يوم</span> : null}
      <span>
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}
