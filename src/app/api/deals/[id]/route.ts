import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { calculateCommission } from '@/lib/services/commission-service'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const uid = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(uid)) return unauthorized()
  const { id } = await context.params
  const supabase = createClient()
  const { data: deal, error } = await supabase.from('deals').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!deal) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (deal.buyer_id !== uid && deal.seller_id !== uid) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  let breakdown
  try {
    breakdown = await calculateCommission(deal.sale_price, deal.seller_id, {
      deal: {
        free_period: deal.free_period as boolean | null | undefined,
        platform_metadata: deal.platform_metadata as Record<string, unknown> | null | undefined,
      },
    })
  } catch {
    breakdown = null
  }

  const timeline = [
    { step: 'فوز', at: deal.created_at },
    deal.full_payment_id ? { step: 'دفع', at: deal.updated_at } : null,
    deal.delivery_status === 'delivered' ? { step: 'تسليم', at: deal.handover_confirmed_at } : null,
    deal.inspection_ends_at ? { step: 'نهاية الفحص', at: deal.inspection_ends_at } : null,
  ].filter(Boolean)

  return NextResponse.json({ ...deal, commission_breakdown: breakdown, timeline })
}
