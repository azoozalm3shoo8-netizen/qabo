/**
 * @deprecated مسار escrow/orders القديم («درع الصفقة»). الصفقات المالية الحديثة تمر عبر جدول deals و Moyasar.
 * يُبقى للتوافق مع واجهات قديمة؛ تفضيل توحيد العرض مع مسار الصفقات الجديد عند التطوير.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ensureWallet(userId: string) {
  const { data: w } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle()
  if (w) return w
  const { data: ins, error } = await supabase
    .from('wallets')
    .insert({ user_id: userId, available_balance: 0, frozen_balance: 0 })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return ins
}

export async function GET(req: NextRequest) {
  const auctionId = req.nextUrl.searchParams.get('auction_id')
  if (!auctionId) {
    return NextResponse.json({ error: 'auction_id مطلوب' }, { status: 400 })
  }

  const { data, error } = await supabase.from('escrows').select('*').eq('auction_id', auctionId).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ escrow: data })
}

export async function POST(req: NextRequest) {
  let body: {
    auction_id?: string
    buyer_id?: string
    seller_id?: string
    amount?: number
    wallet_backed?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const auction_id = body.auction_id
  const buyer_id = body.buyer_id
  const seller_id = body.seller_id
  const amount = Number(body.amount)
  const wallet_backed = Boolean(body.wallet_backed)

  if (!auction_id || !isValidUserId(buyer_id) || !isValidUserId(seller_id)) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'المبلغ غير صالح' }, { status: 400 })
  }

  if (wallet_backed) {
    try {
      const w = await ensureWallet(buyer_id)
      const walletId = w.id as string
      let available = Math.round(Number(w.available_balance ?? 0) * 100) / 100
      let frozen = Math.round(Number(w.frozen_balance ?? 0) * 100) / 100
      const amt = Math.round(amount * 100) / 100
      if (available + 1e-9 < amt) {
        return NextResponse.json({ error: 'الرصيد غير كافٍ لتجميد المبلغ' }, { status: 400 })
      }
      available = Math.round((available - amt) * 100) / 100
      frozen = Math.round((frozen + amt) * 100) / 100
      const { error: uErr } = await supabase
        .from('wallets')
        .update({
          available_balance: available,
          frozen_balance: frozen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId)
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

      await supabase.from('wallet_transactions').insert({
        wallet_id: walletId,
        user_id: buyer_id,
        type: 'freeze',
        amount: amt,
        balance_after: available,
        reference: `escrow:${auction_id}`,
        description: 'تجميد — درع الصفقة',
      })
      await supabase
        .from('profiles')
        .update({ wallet_balance: available + frozen, updated_at: new Date().toISOString() })
        .eq('id', buyer_id)
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'فشل التجميد' }, { status: 500 })
    }
  }

  const { data: esc, error: eErr } = await supabase
    .from('escrows')
    .insert({
      auction_id,
      buyer_id,
      seller_id,
      amount,
      status: 'held',
      wallet_backed,
    })
    .select('id')
    .single()

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })

  const { data: auc } = await supabase.from('auctions').select('title').eq('id', auction_id).maybeSingle()
  const title = (auc?.title && String(auc.title).trim()) || 'مزاد'

  await supabase.from('notifications').insert({
    user_id: seller_id,
    type: 'escrow_held',
    title: 'تجميد المبلغ',
    message: `تم تجميد المبلغ — يرجى شحن المنتج: ${title}`,
    auction_id,
  })

  return NextResponse.json({ escrow_id: esc.id, status: 'held' })
}
