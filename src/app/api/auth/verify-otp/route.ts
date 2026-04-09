import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/server/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function twilioVerifyCheckUrl(): string | null {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim()
  if (sid) return `https://verify.twilio.com/v2/Services/${sid}/VerificationCheck`
  const full = process.env.TWILIO_VERIFY_CHECK_URL?.trim()
  return full || null
}

export async function POST(req: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
    const checkUrl = twilioVerifyCheckUrl()

    if (!accountSid || !authToken || !checkUrl) {
      console.error('[verify-otp] Twilio env غير مكتملة')
      return NextResponse.json(
        { error: 'خدمة التحقق غير مُعدّة. راجع إعدادات Twilio في البيئة.' },
        { status: 503 }
      )
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(`verify-otp:${ip}`, 900_000, 5)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'طلبات كثيرة. حاول بعد قليل.', retryAfter: rl.retryAfter },
        { status: 429 }
      )
    }

    const { phone, code } = await req.json()
    if (!phone || !code) return NextResponse.json({ error: 'missing data' }, { status: 400 })

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const twilioRes = await fetch(checkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + credentials,
      },
      body: new URLSearchParams({ To: phone, Code: String(code) }),
    })
    const twilioData = (await twilioRes.json()) as { status?: string; message?: string }
    if (twilioData.status !== 'approved') {
      return NextResponse.json({ error: 'wrong_otp' }, { status: 400 })
    }

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      phone: phone,
      phone_confirm: true,
    })

    if (createError) {
      if (createError.message.includes('already') || createError.message.includes('duplicate')) {
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existing = listData?.users?.find((u: { phone?: string }) => u.phone === phone)
        if (existing) return NextResponse.json({ success: true, user_id: existing.id, phone })
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user_id: userData.user.id, phone })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
