import { NextResponse } from 'next/server'
import { getCommissionTiers } from '@/lib/services/commission-core'

export async function GET() {
  try {
    const tiers = await getCommissionTiers()
    return NextResponse.json(tiers, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
