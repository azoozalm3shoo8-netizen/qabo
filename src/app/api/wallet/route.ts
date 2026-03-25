import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function ensureWallet(userId: string) {
  const { data: w, error: wErr } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle()
  if (wErr) throw new Error(wErr.message)
  if (w) return w
  const { data: ins, error: iErr } = await supabase
    .from('wallets')
    .insert({ user_id: userId, available_balance: 0, frozen_balance: 0 })
    .select('*')
    .single()
  if (iErr) throw new Error(iErr.message)
  return ins
}

async function syncProfileBalance(userId: string, balance: number) {
  await supabase
    .from('profiles')
    .update({ wallet_balance: balance, updated_at: new Date().toISOString() })
    .eq('id', userId)
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: 'missing user_id' }, { status: 400 })
  }

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .maybeSingle()

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  let walletRow: Record<string, unknown> | null = null
  try {
    walletRow = await ensureWallet(userId)
  } catch (e: unknown) {
    const balance = Number(profile?.wallet_balance ?? 0)
    const { data: txs, error: tErr } = await supabase
      .from('wallet_transactions')
      .select('id, amount, balance_after, type, description, reference, auction_id, created_at, wallet_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(80)

    if (tErr) {
      return NextResponse.json({
        balance,
        available_balance: balance,
        frozen_balance: 0,
        transactions: [],
        transactions_error: tErr.message,
      })
    }

    return NextResponse.json({
      balance,
      available_balance: balance,
      frozen_balance: 0,
      transactions: txs ?? [],
    })
  }

  const available = Number(walletRow.available_balance ?? 0)
  const frozen = Number(walletRow.frozen_balance ?? 0)
  const legacy = Number(profile?.wallet_balance ?? 0)
  const displayAvailable = available > 0 || frozen > 0 ? available : legacy

  const { data: txs, error: tErr } = await supabase
    .from('wallet_transactions')
    .select('id, amount, balance_after, type, description, reference, auction_id, created_at, wallet_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80)

  if (tErr) {
    return NextResponse.json({
      balance: displayAvailable,
      available_balance: displayAvailable,
      frozen_balance: frozen,
      transactions: [],
      transactions_error: tErr.message,
    })
  }

  return NextResponse.json({
    balance: displayAvailable + frozen,
    available_balance: displayAvailable,
    frozen_balance: frozen,
    transactions: txs ?? [],
  })
}

export async function POST(req: NextRequest) {
  let body: {
    user_id?: string
    type?: string
    amount?: number
    reference?: string
    description?: string
    seller_id?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const user_id = body.user_id
  const type = body.type
  const amount = Number(body.amount)
  const reference = typeof body.reference === 'string' ? body.reference.trim() : ''
  const description =
    typeof body.description === 'string' ? body.description : null

  if (!isValidUserId(user_id) || !type) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'المبلغ غير صالح' }, { status: 400 })
  }

  let wallet: Record<string, unknown>
  try {
    wallet = await ensureWallet(user_id)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر إنشاء المحفظة' }, { status: 500 })
  }

  const walletId = wallet.id as string
  let available = Math.round(Number(wallet.available_balance ?? 0) * 100) / 100
  let frozen = Math.round(Number(wallet.frozen_balance ?? 0) * 100) / 100
  const amt = Math.round(amount * 100) / 100

  const insertTx = async (
    txType: string,
    balAfter: number,
    desc: string,
    ref: string | null
  ) => {
    const { error } = await supabase.from('wallet_transactions').insert({
      wallet_id: walletId,
      user_id,
      type: txType,
      amount: amt,
      balance_after: balAfter,
      reference: ref,
      description: desc,
    })
    if (error) throw new Error(error.message)
  }

  try {
    if (type === 'deposit') {
      available = Math.round((available + amt) * 100) / 100
      await supabase
        .from('wallets')
        .update({ available_balance: available, updated_at: new Date().toISOString() })
        .eq('id', walletId)
      await insertTx('deposit', available, description || 'إيداع', reference || null)
      await syncProfileBalance(user_id, available + frozen)
      return NextResponse.json({ success: true, available_balance: available, frozen_balance: frozen })
    }

    if (type === 'withdraw') {
      if (amt < 50) {
        return NextResponse.json({ error: 'الحد الأدنى للسحب 50 ر.س' }, { status: 400 })
      }
      if (available + 1e-9 < amt) {
        return NextResponse.json({ error: 'الرصيد غير كافٍ' }, { status: 400 })
      }
      available = Math.round((available - amt) * 100) / 100
      await supabase
        .from('wallets')
        .update({ available_balance: available, updated_at: new Date().toISOString() })
        .eq('id', walletId)
      await insertTx(
        'withdraw',
        available,
        description || `سحب${reference ? ` — ${reference}` : ''}`,
        reference || null
      )
      await syncProfileBalance(user_id, available + frozen)
      return NextResponse.json({ success: true, available_balance: available, frozen_balance: frozen })
    }

    if (type === 'freeze') {
      if (available + 1e-9 < amt) {
        return NextResponse.json({ error: 'الرصيد غير كافٍ للتجميد' }, { status: 400 })
      }
      available = Math.round((available - amt) * 100) / 100
      frozen = Math.round((frozen + amt) * 100) / 100
      await supabase
        .from('wallets')
        .update({
          available_balance: available,
          frozen_balance: frozen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId)
      await insertTx('freeze', available, description || 'تجميد لدرع الصفقة', reference || null)
      await syncProfileBalance(user_id, available + frozen)
      return NextResponse.json({ success: true, available_balance: available, frozen_balance: frozen })
    }

    if (type === 'release') {
      const seller_id = body.seller_id
      if (!isValidUserId(seller_id)) {
        return NextResponse.json({ error: 'seller_id غير صالح' }, { status: 400 })
      }
      if (frozen + 1e-9 < amt) {
        return NextResponse.json({ error: 'لا يوجد رصيد مجمّد كافٍ' }, { status: 400 })
      }
      frozen = Math.round((frozen - amt) * 100) / 100

      await supabase
        .from('wallets')
        .update({
          frozen_balance: frozen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId)

      await insertTx('release', available, description || 'تحرير من التجميد (المشتري)', reference || null)

      const sellerWallet = await ensureWallet(seller_id)
      const sellerAvail = Math.round(Number(sellerWallet.available_balance ?? 0) * 100) / 100
      const sellerNext = Math.round((sellerAvail + amt) * 100) / 100
      await supabase
        .from('wallets')
        .update({ available_balance: sellerNext, updated_at: new Date().toISOString() })
        .eq('id', sellerWallet.id as string)

      await supabase.from('wallet_transactions').insert({
        wallet_id: sellerWallet.id as string,
        user_id: seller_id,
        type: 'release',
        amount: amt,
        balance_after: sellerNext,
        reference: reference || null,
        description: description || 'استلام مبلغ من درع الصفقة',
      })

      await syncProfileBalance(user_id, available + frozen)
      await syncProfileBalance(seller_id, sellerNext + Number(sellerWallet.frozen_balance ?? 0))

      return NextResponse.json({
        success: true,
        buyer_available: available,
        buyer_frozen: frozen,
        seller_available: sellerNext,
      })
    }

    return NextResponse.json({ error: 'نوع العملية غير مدعوم' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'فشلت العملية' }, { status: 500 })
  }
}
