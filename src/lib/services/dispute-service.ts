import 'server-only'

import { createClient } from '@/lib/supabase-server'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'

export async function sendDisputeMessage(
  disputeId: string,
  userId: string,
  message: string,
  attachments?: string[]
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('dispute_messages').insert({
    dispute_id: disputeId,
    user_id: userId,
    body: message,
    attachments: attachments ?? [],
  })
  if (error) throw new Error(error.message)
}

export async function escalateDispute(disputeId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('disputes')
    .update({ level: 2, status: 'escalated', updated_at: new Date().toISOString() })
    .eq('id', disputeId)
  if (error) throw new Error(error.message)
}

/** تذكير يومي — تصعيد النزاعات المستوى 1 المنتهية */
export async function autoEscalateExpiredLevel1(): Promise<void> {
  const supabase = createClient()
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: rows, error } = await supabase
    .from('disputes')
    .select('id')
    .eq('level', 1)
    .eq('status', 'open')
    .lt('created_at', cutoff)

  if (error) {
    console.warn('[autoEscalateExpiredLevel1]', error.message)
    return
  }

  for (const r of rows ?? []) {
    try {
      await escalateDispute(r.id as string)
    } catch (e) {
      console.error('[autoEscalateExpiredLevel1]', r.id, e)
    }
  }
}

/**
 * نزاعات مفتوحة تجاوزت مهلة رد البائع (48 ساعة) دون أي رسالة من البائع.
 */
export async function processDisputesPastSellerDeadline(): Promise<void> {
  const supabase = createClient()
  const now = new Date().toISOString()

  try {
    const { data: rows, error } = await supabase
      .from('disputes')
      .select('id, deal_id, seller_response_deadline, status')
      .eq('status', 'open')
      .not('seller_response_deadline', 'is', null)
      .lt('seller_response_deadline', now)

    if (error) {
      console.warn('[processDisputesPastSellerDeadline]', error.message)
      return
    }

    for (const row of rows ?? []) {
      try {
        const dealId = row.deal_id as string
        const { data: deal } = await supabase.from('deals').select('seller_id, buyer_id, auction_id').eq('id', dealId).maybeSingle()
        if (!deal) continue
        const sellerId = deal.seller_id as string

        const { data: msgs } = await supabase
          .from('dispute_messages')
          .select('user_id')
          .eq('dispute_id', row.id as string)

        const sellerReplied = (msgs ?? []).some((m) => String(m.user_id) === sellerId)
        if (sellerReplied) continue

        await supabase
          .from('disputes')
          .update({
            status: 'resolved',
            resolution_type: 'auto_buyer_favor',
            updated_at: now,
          })
          .eq('id', row.id as string)

        await insertFinancialNotification(supabase, {
          user_id: deal.buyer_id as string,
          type: 'dispute_auto_resolved',
          title: 'تسوية تلقائية للنزاع',
          body: 'لم يردّ البائع خلال المهلة — أُقفل النزاع لصالحك.',
          auction_id: (deal.auction_id as string) || undefined,
          deal_id: dealId,
        })
        await insertFinancialNotification(supabase, {
          user_id: sellerId,
          type: 'dispute_auto_resolved',
          title: 'إغلاق نزاع تلقائياً',
          body: 'لم ترد خلال 48 ساعة — أُقفل النزاع لصالح المشتري.',
          auction_id: (deal.auction_id as string) || undefined,
          deal_id: dealId,
        })
      } catch (e) {
        console.error('[processDisputesPastSellerDeadline] row', row.id, e)
      }
    }
  } catch (e) {
    console.error('[processDisputesPastSellerDeadline]', e)
  }
}
