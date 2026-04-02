import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleAuctionCancellation } from '@/lib/services/auction-protection-service'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const schema = z.object({
  user_id: z.string().uuid(),
  reason: z.string().min(1),
  reasonCategory: z.enum([
    'product_damaged',
    'buyer_no_pay',
    'description_error',
    'force_majeure',
    'changed_mind',
    'higher_offer',
    'price_unsatisfied',
    'other_unjustified',
  ]),
  evidenceUrls: z.array(z.string()).default([]),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: auctionId } = await context.params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  if (!isValidUserId(parsed.data.user_id)) return unauthorized()

  try {
    const r = await handleAuctionCancellation(
      parsed.data.user_id,
      auctionId,
      parsed.data.reason,
      parsed.data.reasonCategory,
      parsed.data.evidenceUrls
    )
    return NextResponse.json(r)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
