import { NextRequest, NextResponse } from 'next/server'

const TWILIO_SID = 'ACcf0368d45556a98145a08a1569d89fa7'
const TWILIO_TOKEN = '4a4c94cf686408487b126ce72f1d09ec'
const VERIFY_URL = 'https://verify.twilio.com/v2/Services/VA6f3f00f20176735c36bba513b031240d/Verifications'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'missing phone' }, { status: 400 })
    const credentials = Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64')
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + credentials
      },
      body: new URLSearchParams({ To: phone, Channel: 'sms' })
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message || 'failed' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
