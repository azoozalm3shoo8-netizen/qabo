import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { sendTelegramAlert } from '@/lib/telegram'

const KEYS = new Set([
  'commission_percent',
  'commission_rate',
  'auction_min_price',
  'min_starting_price',
  'auction_max_price',
  'max_auction_days',
  'default_auction_duration_hours',
  'telegram_bot_token',
  'telegram_chat_id',
  'maintenance_mode',
])

function db() {
  return createClient()
}

function normalizeRowValue(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'value' in (raw as object)) {
    return (raw as { value: unknown }).value
  }
  return raw
}

export async function GET(req: NextRequest) {
  const actorId = req.nextUrl.searchParams.get('user_id')
  const gate = await requirePermission(actorId, 'dashboard')
  if (!gate.ok) return gate.res

  const { data, error } = await db().from('platform_settings').select('key, value')

  if (error) {
    return NextResponse.json({
      settings: {},
      _note: 'جدول platform_settings غير جاهز — نفّذ admin-schema-v2.sql',
    })
  }

  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) {
    settings[row.key as string] = normalizeRowValue(row.value)
  }

  return NextResponse.json({
    settings,
    ai_keys: {
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      HF_API_TOKEN: Boolean(process.env.HF_API_TOKEN),
      PERSPECTIVE_API_KEY: Boolean(process.env.PERSPECTIVE_API_KEY),
      GOOGLE_AI_KEY: Boolean(process.env.GOOGLE_AI_KEY),
      CF_ACCOUNT_ID: Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN),
    },
  })
}

export async function PUT(req: NextRequest) {
  let body: {
    user_id?: string
    settings?: Record<string, unknown>
    test_telegram?: boolean
    key?: string
    value?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id: actorId, settings, test_telegram, key: singleKey, value: singleValue } = body
  const gate = await requirePermission(actorId, 'settings')
  if (!gate.ok) return gate.res

  if (test_telegram) {
    await sendTelegramAlert('✅ <b>قبو</b> — اختبار تيليجرام من لوحة التحكم')
    await logAdminAction({
      actorId: actorId!,
      action: 'admin.settings.telegram_test',
      ipAddress: clientIp(req),
    })
    return NextResponse.json({
      ok: true,
      message: 'تم إرسال رسالة الاختبار (إن وُجدت TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID)',
    })
  }

  const now = new Date().toISOString()

  if (typeof singleKey === 'string' && singleKey.length > 0 && 'value' in body) {
    if (!KEYS.has(singleKey)) {
      return NextResponse.json({ error: 'مفتاح غير مسموح' }, { status: 400 })
    }
    const row: Record<string, unknown> = {
      key: singleKey,
      value: { value: singleValue },
      updated_at: now,
    }
    const { error } = await db().from('platform_settings').upsert(row, { onConflict: 'key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAdminAction({
      actorId: actorId!,
      action: 'admin.settings.update',
      details: { key: singleKey },
      ipAddress: clientIp(req),
    })
    return NextResponse.json({ ok: true })
  }

  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'بيانات الإعدادات ناقصة' }, { status: 400 })
  }

  const keysTouched: string[] = []
  for (const key of Object.keys(settings)) {
    if (!KEYS.has(key)) continue
    const value = settings[key]
    const { error } = await db()
      .from('platform_settings')
      .upsert({ key, value: { value }, updated_at: now }, { onConflict: 'key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    keysTouched.push(key)
  }

  await logAdminAction({
    actorId: actorId!,
    action: 'admin.settings.update',
    details: { keys: keysTouched },
    ipAddress: clientIp(req),
  })

  return NextResponse.json({ ok: true })
}
