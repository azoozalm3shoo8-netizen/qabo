import { NextRequest, NextResponse } from 'next/server'
import { getAuctionSocialProof } from '@/lib/services/social-proof-service'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'معرّف المزاد مطلوب' }, { status: 400 })
  }

  try {
    const proof = await getAuctionSocialProof(id)
    return NextResponse.json(proof, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
