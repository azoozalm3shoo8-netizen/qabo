/**
 * أدوات عرض العد التنازلي — ثوابت التمديد مشتركة مع `anti-snipe-service` عبر `anti-snipe-constants`.
 */
export { EXTENSION_MS, MAX_AUCTION_EXTENSIONS, SNIPE_WINDOW_MS } from '@/lib/anti-snipe-constants'

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
