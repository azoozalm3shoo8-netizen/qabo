import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateHandoverCode } from '@/lib/handover'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const auctionId = req.nextUrl.searchParams.get('auction_id')
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!auctionId || !userId) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('handover_sessions')
    .select('*')
    .eq('auction_id', auctionId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json(null)
  if (data.seller_id !== userId && data.buyer_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, auction_id } = body as { user_id?: string; auction_id?: string }

  if (!isValidUserId(user_id)) return unauthorized()
  if (!auction_id) return NextResponse.json({ error: 'auction_id مطلوب' }, { status: 400 })

  const { data: auc, error: aErr } = await supabase
    .from('auctions')
    .select('seller_id, highest_bidder_id, status, ends_at')
    .eq('id', auction_id)
    .maybeSingle()

  if (aErr || !auc) return NextResponse.json({ error: 'مزاد غير موجود' }, { status: 404 })
  if (auc.seller_id !== user_id) {
    return NextResponse.json({ error: 'فقط البائع يبدأ التسليم' }, { status: 403 })
  }
  const buyer = auc.highest_bidder_id as string | null
  if (!buyer) return NextResponse.json({ error: 'لا يوجد فائز' }, { status: 400 })

  const { data: existing } = await supabase
    .from('handover_sessions')
    .select('*')
    .eq('auction_id', auction_id)
    .maybeSingle()

  if (existing) return NextResponse.json(existing)

  const { code, qrData } = generateHandoverCode()
  const { data, error } = await supabase
    .from('handover_sessions')
    .insert({
      auction_id,
      seller_id: auc.seller_id,
      buyer_id: buyer,
      verification_code: code,
      qr_data: qrData,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

async function releaseEscrowForAuction(auctionId: string) {
  const { data: escrow } = await supabase
    .from('escrows')
    .select('id')
    .eq('auction_id', auctionId)
    .eq('status', 'held')
    .maybeSingle()
  if (!escrow?.id) return
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://127.0.0.1:3000'
  const url = `${base.replace(/\/$/, '')}/api/escrow/release`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ escrow_id: escrow.id }),
  })
  if (!res.ok) {
    console.error('handover escrow release failed', await res.text())
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const {
    user_id,
    auction_id,
    session_id,
    action,
    qr_data,
    verification_code,
    skipped_qr: rawSkippedQr,
  } = body as {
    user_id?: string
    auction_id?: string
    session_id?: string
    action?: 'scan' | 'confirm' | 'dispute'
    qr_data?: string
    verification_code?: string
    skipped_qr?: boolean
  }

  const skipped_qr = rawSkippedQr === true

  if (!isValidUserId(user_id)) return unauthorized()
  if (!action) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  if (!auction_id && !session_id) {
    return NextResponse.json({ error: 'auction_id أو session_id مطلوب' }, { status: 400 })
  }

  let q = supabase.from('handover_sessions').select('*')
  if (session_id && typeof session_id === 'string') {
    q = q.eq('id', session_id.trim())
  } else if (auction_id) {
    q = q.eq('auction_id', auction_id)
  }
  const { data: row, error: fErr } = await q.maybeSingle()

  if (fErr || !row) return NextResponse.json({ error: 'جلسة غير موجودة' }, { status: 404 })

  if (action === 'scan') {
    if (row.buyer_id !== user_id) {
      return NextResponse.json({ error: 'فقط المشتري يمسح الرمز' }, { status: 403 })
    }
    const ok =
      (qr_data && qr_data === row.qr_data) ||
      (verification_code && verification_code === row.verification_code)
    if (!ok) return NextResponse.json({ error: 'رمز غير صحيح' }, { status: 400 })
    const { data, error } = await supabase
      .from('handover_sessions')
      .update({ status: 'scanned' })
      .eq('id', row.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (action === 'confirm') {
    if (row.buyer_id !== user_id) {
      return NextResponse.json({ error: 'فقط المشتري يؤكد' }, { status: 403 })
    }
    const okScanned = row.status === 'scanned'
    const okSkip = row.status === 'pending' && skipped_qr
    if (!okScanned && !okSkip) {
      return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('handover_sessions')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        skipped_qr,
      })
      .eq('id', row.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await releaseEscrowForAuction(row.auction_id as string)

    return NextResponse.json(data)
  }

  if (action === 'dispute') {
    if (row.buyer_id !== user_id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const { data, error } = await supabase
      .from('handover_sessions')
      .update({ status: 'disputed' })
      .eq('id', row.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
}
