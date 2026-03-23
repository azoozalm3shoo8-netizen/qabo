import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { closeExpiredAuctions } from '@/lib/server/close-expired-auctions'
import { syncPendingOrdersForEndedAuctions } from '@/lib/server/ensure-order-for-auction'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isAuthorizedCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true
  if (req.headers.get('x-vercel-cron')) return true
  return false
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  await closeExpiredAuctions(supabase)
  await syncPendingOrdersForEndedAuctions(supabase)

  return NextResponse.json({
    success: true,
    message: 'تم إغلاق المزادات المنتهية',
    timestamp: new Date().toISOString(),
  })
}
