import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, token } = body as { user_id?: string; token?: string }

  if (!isValidUserId(user_id)) return unauthorized()
  if (!token || typeof token !== 'string' || token.length < 20) {
    return NextResponse.json({ error: 'token مطلوب' }, { status: 400 })
  }

  const { error } = await supabase.from('user_push_tokens').upsert(
    { user_id, token, updated_at: new Date().toISOString() },
    { onConflict: 'token' }
  )

  if (error) {
    console.error('push-tokens:', error.message)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ ok: true })
}
