import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { handleAuctionEnd } from '@/lib/services/bidding-service'
import { autoAcceptExpiredInspections } from '@/lib/services/deal-service'
import { autoEscalateExpiredLevel1 } from '@/lib/services/dispute-service'
import { getFreePeriodInfo } from '@/lib/services/free-period-service'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const h = req.headers.get('authorization')
  if (!secret || h !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  await autoAcceptExpiredInspections()
  await autoEscalateExpiredLevel1()

  const now = new Date().toISOString()
  const { data: ending } = await supabase
    .from('auctions')
    .select('id')
    .eq('status', 'active')
    .lt('ends_at', now)

  for (const row of ending ?? []) {
    try {
      await handleAuctionEnd(row.id)
    } catch (e) {
      console.error('[cron handleAuctionEnd]', row.id, e)
    }
  }

  const info = await getFreePeriodInfo()
  const { data: setRow } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'free_period_cron_notifications')
    .maybeSingle()
  const sent = (setRow?.value as { sent?: Record<string, boolean> } | undefined)?.sent ?? {}

  const { data: minTier } = await supabase
    .from('commission_tiers')
    .select('seller_rate')
    .eq('is_active', true)
    .order('seller_rate', { ascending: true })
    .limit(1)
    .maybeSingle()
  const minPct = minTier?.seller_rate != null ? (Number(minTier.seller_rate) * 100).toFixed(0) : '2'

  if (info.isActive && info.daysRemaining != null) {
    const days = info.daysRemaining
    const target =
      days <= 14 && days >= 8 ? '14' : days <= 7 && days >= 2 ? '7' : days === 1 ? '1' : null

    if (target && !sent[target]) {
      const { data: users } = await supabase.from('profiles').select('id').limit(5000)
      const title =
        target === '14'
          ? 'الفترة المجانية تنتهي خلال أسبوعين'
          : target === '7'
            ? 'الفترة المجانية تنتهي خلال أسبوع'
            : 'آخر يوم في الفترة المجانية!'
      const body = info.messageAr || 'تنبيه الفترة المجانية'

      for (const u of users ?? []) {
        await insertFinancialNotification(supabase, {
          user_id: u.id as string,
          type: 'free_period',
          title,
          body,
          data: { stage: target },
        })
      }

      sent[target] = true
      await supabase
        .from('platform_settings')
        .upsert({ key: 'free_period_cron_notifications', value: { sent } }, { onConflict: 'key' })
    }
  }

  if (!info.isActive && info.endsAt) {
    const ended = new Date(info.endsAt).getTime() <= Date.now()
    if (ended && !sent['ended']) {
      const { data: users } = await supabase.from('profiles').select('id').limit(5000)
      const title = 'الفترة المجانية انتهت — شكراً لثقتكم!'
      const body = `تُفعَّل العمولة وفق الشروط. أقل عمولة للبائع تبدأ من حوالي ${minPct}٪.`
      for (const u of users ?? []) {
        await insertFinancialNotification(supabase, {
          user_id: u.id as string,
          type: 'free_period',
          title,
          body,
          data: { stage: 'ended' },
        })
      }
      sent['ended'] = true
      await supabase
        .from('platform_settings')
        .upsert({ key: 'free_period_cron_notifications', value: { sent } }, { onConflict: 'key' })
    }
  }

  return NextResponse.json({ ok: true, ended_auctions: (ending ?? []).length })
}
