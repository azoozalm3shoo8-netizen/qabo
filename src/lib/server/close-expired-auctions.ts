import type { SupabaseClient } from '@supabase/supabase-js'
import { handleAuctionEnd } from '@/lib/services/bidding-service'

/**
 * عند انتهاء المزاد أثناء الجلب — نفس مسار الإغلاق الموحّد (صفقة + إشعارات مالية).
 */
export async function closeAuctionIfExpiredForId(supabase: SupabaseClient, auctionId: string) {
  const now = new Date().toISOString()
  try {
    const { data: row, error } = await supabase
      .from('auctions')
      .select('id, status, ends_at')
      .eq('id', auctionId)
      .maybeSingle()
    if (error || !row) return
    if (String(row.status) !== 'active') return
    if (new Date(String(row.ends_at)) > new Date(now)) return
    await handleAuctionEnd(auctionId)
  } catch (e) {
    console.error('[closeAuctionIfExpiredForId]', e)
  }
}

/** إغلاق دفعي لكل المزادات المنتهية — يمر عبر handleAuctionEnd (لا يُحدّث ended فقط). */
export async function closeExpiredAuctions(supabase: SupabaseClient) {
  const now = new Date().toISOString()
  try {
    const { data: rows, error } = await supabase
      .from('auctions')
      .select('id')
      .eq('status', 'active')
      .lt('ends_at', now)
    if (error || !rows?.length) return
    for (const r of rows) {
      try {
        await handleAuctionEnd(r.id as string)
      } catch (e) {
        console.error('[closeExpiredAuctions]', r.id, e)
      }
    }
  } catch (e) {
    console.error('[closeExpiredAuctions]', e)
  }
}
