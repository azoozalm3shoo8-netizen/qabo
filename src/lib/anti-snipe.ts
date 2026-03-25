export const SNIPE_WINDOW_MS = 5 * 60 * 1000
export const EXTENSION_MS = 5 * 60 * 1000
export const MAX_AUCTION_EXTENSIONS = 6

export function shouldExtendAuction(
  endTime: string,
  bidTime: Date = new Date()
): { shouldExtend: boolean; newEndTime: string } {
  const end = new Date(endTime)
  const diff = end.getTime() - bidTime.getTime()
  if (diff > 0 && diff <= SNIPE_WINDOW_MS) {
    return { shouldExtend: true, newEndTime: new Date(end.getTime() + EXTENSION_MS).toISOString() }
  }
  return { shouldExtend: false, newEndTime: endTime }
}

/** Human-readable countdown (Arabic-oriented). */
export function formatTimeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return 'انتهى'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (d > 0) return `${d} يوم ${h} ساعة`
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
