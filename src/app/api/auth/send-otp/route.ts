import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/server/rate-limit'

function twilioVerifyStartUrl(): string | null {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim()
  if (sid) return `https://verify.twilio.com/v2/Services/${sid}/Verifications`
  const full = process.env.TWILIO_VERIFY_START_URL?.trim()
  return full || null
}

export async function POST(req: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
    const verifyUrl = twilioVerifyStartUrl()

    if (!accountSid || !authToken || !verifyUrl) {
      console.error('[send-otp] Twilio env غير مكتملة')
      return NextResponse.json(
        { error: 'خدمة الإرسال غير مُعدّة. راجع إعدادات Twilio في البيئة.' },
        { status: 503 }
      )
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(`send-otp:${ip}`, 900_000, 5)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'طلبات كثيرة. حاول بعد قليل.', retryAfter: rl.retryAfter },
        { status: 429 }
      )
    }

    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'missing phone' }, { status: 400 })

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + credentials,
      },
      body: new URLSearchParams({ To: phone, Channel: 'sms' }),
    })
    const data = (await res.json()) as { message?: string }
    if (!res.ok) return NextResponse.json({ error: data.message || 'failed' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
