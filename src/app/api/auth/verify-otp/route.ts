import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TWILIO_SID = 'ACcf0368d45556a98145a08a1569d89fa7'
const TWILIO_TOKEN = '4a4c94cf686408487b126ce72f1d09ec'
const CHECK_URL = 'https://verify.twilio.com/v2/Services/VA6f3f00f20176735c36bba513b031240d/VerificationCheck'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()
    if (!phone || !code) return NextResponse.json({ error: 'missing data' }, { status: 400 })

    const credentials = Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64')
    const twilioRes = await fetch(CHECK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + credentials
      },
      body: new URLSearchParams({ To: phone, Code: code })
    })
    const twilioData = await twilioRes.json()
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
        const existing = listData?.users?.find((u: any) => u.phone === phone)
        if (existing) return NextResponse.json({ success: true, user_id: existing.id, phone })
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user_id: userData.user.id, phone })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
