import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: { escrow_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const escrow_id = typeof body.escrow_id === 'string' ? body.escrow_id.trim() : ''
  if (!escrow_id) {
    return NextResponse.json({ error: 'escrow_id مطلوب' }, { status: 400 })
  }

  const { data: esc, error: fErr } = await supabase.from('escrows').select('*').eq('id', escrow_id).maybeSingle()

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })
  if (!esc) return NextResponse.json({ error: 'الضمان غير موجود' }, { status: 404 })

  if (esc.status !== 'held') {
    return NextResponse.json({ error: 'حالة الضمان لا تسمح بالتحرير' }, { status: 400 })
  }

  const buyerId = esc.buyer_id as string
  const sellerId = esc.seller_id as string
  const amt = Math.round(Number(esc.amount) * 100) / 100
  const walletBacked = Boolean(esc.wallet_backed)

  if (walletBacked) {
    const { data: buyerW } = await supabase.from('wallets').select('*').eq('user_id', buyerId).maybeSingle()
    if (buyerW) {
      let frozen = Math.round(Number(buyerW.frozen_balance ?? 0) * 100) / 100
      if (frozen + 1e-9 >= amt) {
        frozen = Math.round((frozen - amt) * 100) / 100
        await supabase
          .from('wallets')
          .update({ frozen_balance: frozen, updated_at: new Date().toISOString() })
          .eq('id', buyerW.id as string)

        await supabase.from('wallet_transactions').insert({
          wallet_id: buyerW.id as string,
          user_id: buyerId,
          type: 'release',
          amount: amt,
          balance_after: Number(buyerW.available_balance ?? 0),
          reference: `escrow_release:${escrow_id}`,
          description: 'تحرير تجميد — تحويل للبائع',
        })
      }

      const { data: sellerW } = await supabase.from('wallets').select('*').eq('user_id', sellerId).maybeSingle()
      if (sellerW) {
        const sellerAvail = Math.round(Number(sellerW.available_balance ?? 0) * 100) / 100
        const sellerFrozen = Math.round(Number(sellerW.frozen_balance ?? 0) * 100) / 100
        const next = Math.round((sellerAvail + amt) * 100) / 100
        await supabase
          .from('wallets')
          .update({ available_balance: next, updated_at: new Date().toISOString() })
          .eq('id', sellerW.id as string)

        await supabase.from('wallet_transactions').insert({
          wallet_id: sellerW.id as string,
          user_id: sellerId,
          type: 'release',
          amount: amt,
          balance_after: next,
          reference: `escrow_release:${escrow_id}`,
          description: 'استلام مبلغ من درع الصفقة',
        })

        await supabase
          .from('profiles')
          .update({ wallet_balance: next + sellerFrozen, updated_at: new Date().toISOString() })
          .eq('id', sellerId)
      }

      const bAvail = Number(buyerW.available_balance ?? 0)
      await supabase
        .from('profiles')
        .update({
          wallet_balance: bAvail + frozen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', buyerId)
    }
  }

  const { error: uErr } = await supabase
    .from('escrows')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('id', escrow_id)

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  const { data: auc } = await supabase
    .from('auctions')
    .select('title')
    .eq('id', esc.auction_id as string)
    .maybeSingle()
  const title = (auc?.title && String(auc.title).trim()) || 'مزاد'

  await supabase.from('notifications').insert({
    user_id: sellerId,
    type: 'escrow_released',
    title: 'تم تحويل المبلغ',
    message: `تم تحويل المبلغ إلى محفظتك — ${title}`,
    auction_id: esc.auction_id as string,
  })

  await supabase.from('notifications').insert({
    user_id: buyerId,
    type: 'escrow_done',
    title: 'تمت الصفقة بنجاح',
    message: `تمت الصفقة بنجاح — ${title}`,
    auction_id: esc.auction_id as string,
  })

  return NextResponse.json({ success: true, status: 'released' })
}
