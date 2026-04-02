import type { SupabaseClient } from '@supabase/supabase-js'

export async function insertFinancialNotification(
  supabase: SupabaseClient,
  opts: {
    user_id: string
    type: string
    title: string
    body: string
    auction_id?: string
    deal_id?: string
    data?: Record<string, unknown>
  }
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: opts.user_id,
    type: opts.type,
    title: opts.title.slice(0, 500),
    message: opts.body.slice(0, 4000),
    is_read: false,
  }
  if (opts.auction_id) row.auction_id = opts.auction_id
  if (opts.deal_id) row.deal_id = opts.deal_id
  if (opts.data && Object.keys(opts.data).length) {
    row.data = opts.data
  }
  const { error } = await supabase.from('notifications').insert(row)
  if (error) {
    const withoutDeal = { ...row }
    delete withoutDeal.deal_id
    delete withoutDeal.data
    const r2 = await supabase.from('notifications').insert(withoutDeal)
    if (r2.error) console.error('[insertFinancialNotification]', r2.error.message)
  }
}
