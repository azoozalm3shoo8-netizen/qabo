import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(uid)) return unauthorized()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
