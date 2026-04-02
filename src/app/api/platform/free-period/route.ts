import { NextResponse } from 'next/server'
import { getFreePeriodInfo } from '@/lib/services/free-period-service'

export async function GET() {
  const info = await getFreePeriodInfo()
  return NextResponse.json(
    {
      isActive: info.isActive,
      endsAt: info.endsAt,
      daysRemaining: info.daysRemaining,
      isWarningPhase: info.isWarningPhase,
      messageAr: info.messageAr,
    },
    {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    }
  )
}
