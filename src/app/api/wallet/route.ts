import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'missing user_id' }, { status: 400 })
  }

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .maybeSingle()

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const balance = Number(profile?.wallet_balance ?? 0)

  const { data: txs, error: tErr } = await supabase
    .from('wallet_transactions')
    .select('id, amount, balance_after, type, description, auction_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (tErr) {
    return NextResponse.json({
      wallet_balance: balance,
      transactions: [],
      transactions_error: tErr.message,
    })
  }

  return NextResponse.json({
    wallet_balance: balance,
    transactions: txs ?? [],
  })
}
