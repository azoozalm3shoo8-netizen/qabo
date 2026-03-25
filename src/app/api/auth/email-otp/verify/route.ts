import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { baseProfileRowForUpsert } from '@/lib/server/profile-defaults'

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anon || !serviceKey) {
      return NextResponse.json({ error: 'إعدادات Supabase غير مكتملة' }, { status: 500 })
    }

    let body: { email?: string; token?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const token = typeof body.token === 'string' ? body.token.replace(/\D/g, '').trim() : ''

    if (!email || !token) {
      return NextResponse.json({ error: 'البريد الإلكتروني والرمز مطلوبان' }, { status: 400 })
    }

    if (token.length < 6) {
      return NextResponse.json({ error: 'الرمز غير كامل' }, { status: 400 })
    }

    const authClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error: verifyErr } = await authClient.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (verifyErr || !data?.user) {
      return NextResponse.json(
        { error: verifyErr?.message || 'رمز التحقق غير صحيح' },
        { status: 400 }
      )
    }

    const userId = data.user.id
    const userEmail = data.user.email ?? email
    const metaName =
      (typeof data.user.user_metadata?.full_name === 'string' && data.user.user_metadata.full_name) ||
      (typeof data.user.user_metadata?.name === 'string' && data.user.user_metadata.name) ||
      null

    const { data: existing, error: fetchErr } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (fetchErr) {
      return NextResponse.json(
        { error: fetchErr.message || 'تعذر التحقق من الملف الشخصي' },
        { status: 500 }
      )
    }

    if (!existing) {
      const base = baseProfileRowForUpsert(userId, null)
      const row = {
        ...base,
        full_name: metaName || userEmail.split('@')[0] || base.full_name,
        phone: base.phone,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
      const { error: insErr } = await db.from('profiles').insert(row)
      if (insErr) {
        return NextResponse.json(
          { error: insErr.message || 'تعذر إنشاء الملف الشخصي' },
          { status: 500 }
        )
      }
    }

    const { data: profile, error: profErr } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()

    if (profErr) {
      return NextResponse.json(
        { error: profErr.message || 'تعذر قراءة الملف الشخصي' },
        { status: 500 }
      )
    }

    const name =
      (profile?.full_name && String(profile.full_name).trim()) ||
      metaName ||
      userEmail.split('@')[0] ||
      'مستخدم'

    return NextResponse.json({
      success: true,
      user: {
        user_id: userId,
        email: userEmail,
        name,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع'
    console.error('[email-otp/verify]', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
