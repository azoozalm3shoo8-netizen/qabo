import { NextRequest, NextResponse } from 'next/server'
import { enhancePricingSuggestion } from '@/lib/services/pricing-feedback-service'

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')?.trim() ?? ''
  if (!category) {
    return NextResponse.json({ error: 'التصنيف مطلوب' }, { status: 400 })
  }

  const condition = req.nextUrl.searchParams.get('condition')?.trim() || 'good'
  const title = req.nextUrl.searchParams.get('title')?.trim() || ''
  const opRaw = req.nextUrl.searchParams.get('original_price')
  const op = opRaw != null && opRaw !== '' ? Number(opRaw) : NaN
  const originalPrice = Number.isFinite(op) && op > 0 ? op : undefined

  try {
    const enhanced = await enhancePricingSuggestion({
      category,
      condition,
      title: title || undefined,
      originalPrice,
    })
    return NextResponse.json(enhanced)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ في التسعير'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
