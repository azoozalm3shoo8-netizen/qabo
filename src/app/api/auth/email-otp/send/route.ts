import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GoTrue email OTP expects the anon key on the Auth API (not the service role),
 * so this route uses NEXT_PUBLIC_SUPABASE_ANON_KEY for signInWithOtp only.
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return NextResponse.json({ error: 'إعدادات Supabase غير مكتملة' }, { status: 500 })
  }

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'البريد الإلكتروني غير صالح' }, { status: 400 })
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // OTP رقمي فقط — لا نستخدم emailRedirectTo (ذلك لـ Magic Link)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message || 'تعذر إرسال الرمز' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
