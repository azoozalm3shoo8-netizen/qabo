import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { handleAuctionEnd } from '@/lib/services/bidding-service'
import { autoAcceptExpiredInspections } from '@/lib/services/deal-service'
import { autoEscalateExpiredLevel1 } from '@/lib/services/dispute-service'
import { getFreePeriodInfo, isFreePeriodActive } from '@/lib/services/free-period-service'

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

  const fp = await isFreePeriodActive()
  if (fp) {
    const info = await getFreePeriodInfo()
    const days = info.daysRemaining
    const { data: setRow } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'free_period_cron_notifications')
      .maybeSingle()
    const sent =
      (setRow?.value as { sent?: Record<string, boolean> } | undefined)?.sent ?? {}
    const stages = ['14', '7', '1', '0'] as const
    const target =
      days != null && days <= 14 && days >= 8
        ? '14'
        : days != null && days <= 7 && days >= 2
          ? '7'
          : days === 1
            ? '1'
            : days === 0
              ? '0'
              : null

    if (target && !sent[target]) {
      const { data: users } = await supabase.from('profiles').select('id').limit(5000)
      const title =
        target === '14'
          ? 'الفترة المجانية تنتهي خلال أسبوعين'
          : target === '7'
            ? 'الفترة المجانية تنتهي خلال أسبوع'
            : target === '1'
              ? 'آخر يوم في الفترة المجانية!'
              : 'انتهت الفترة المجانية'
      const body =
        target === '0'
          ? 'شكراً لثقتكم! تُفعَّل العمولة وفق الشروط.'
          : info.messageAr || 'تنبيه الفترة المجانية'

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

  return NextResponse.json({ ok: true, ended_auctions: (ending ?? []).length })
}
