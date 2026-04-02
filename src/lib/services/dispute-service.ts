import 'server-only'

import { createClient } from '@/lib/supabase-server'

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
