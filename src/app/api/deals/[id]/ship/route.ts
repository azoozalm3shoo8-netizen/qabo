import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const schema = z.object({
  user_id: z.string().uuid(),
  tracking_number: z.string().min(2).max(120),
  shipping_provider: z.enum(['aramex', 'smsa', 'dhl', 'other']),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: dealId } = await context.params
    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }
    if (!isValidUserId(parsed.data.user_id)) return unauthorized()

    const supabase = createClient()
    const { data: deal, error: dErr } = await supabase
      .from('deals')
      .select('seller_id, buyer_id, auction_id')
      .eq('id', dealId)
      .maybeSingle()

    if (dErr || !deal) {
      return NextResponse.json({ error: 'الصفقة غير موجودة' }, { status: 404 })
    }
    if (deal.seller_id !== parsed.data.user_id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const { error: uErr } = await supabase
      .from('deals')
      .update({
        tracking_number: parsed.data.tracking_number.trim(),
        shipping_provider: parsed.data.shipping_provider,
        shipped_at: now,
        updated_at: now,
      })
      .eq('id', dealId)

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    try {
      await insertFinancialNotification(supabase, {
        user_id: deal.buyer_id as string,
        type: 'deal_shipped',
        title: 'تم شحن طلبك',
        body: `رقم التتبع: ${parsed.data.tracking_number.trim()} — شركة ${parsed.data.shipping_provider}`,
        auction_id: (deal.auction_id as string) || undefined,
        deal_id: dealId,
      })
    } catch (e) {
      console.error('[ship deal notify]', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
