import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminUserId } from '@/lib/admin-ids'
import { isValidUserId } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REASONS = new Set([
  'محتوى مخالف',
  'منتج ممنوع',
  'احتيال محتمل',
  'سعر غير واقعي',
  'أخرى',
])

export async function POST(req: NextRequest) {
  let body: {
    user_id?: string
    auction_id?: string | null
    reported_user_id?: string | null
    reason?: string
    details?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { user_id, auction_id, reported_user_id, reason, details } = body
  if (!isValidUserId(user_id)) {
    return NextResponse.json({ error: 'معرّف المستخدم غير صالح' }, { status: 400 })
  }
  if (!reason || !REASONS.has(reason)) {
    return NextResponse.json({ error: 'سبب البلاغ غير صالح' }, { status: 400 })
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user_id,
    reported_auction_id: auction_id || null,
    reported_user_id: reported_user_id || null,
    reason,
    details: typeof details === 'string' ? details.trim().slice(0, 2000) || null : null,
  })

  if (error) {
    return NextResponse.json({ error: 'تعذر حفظ البلاغ: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'تم إرسال البلاغ بنجاح' })
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!isAdminUserId(userId)) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 403 })
  }

  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const list = reports ?? []
    const reporterIds = [...new Set(list.map((r) => r.reporter_id as string))]
    const auctionIds = [
      ...new Set(
        list.map((r) => r.reported_auction_id as string | null).filter(Boolean) as string[]
      ),
    ]

    const [{ data: profs }, { data: aucs }] = await Promise.all([
      reporterIds.length
        ? supabase.from('profiles').select('id, full_name').in('id', reporterIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      auctionIds.length
        ? supabase.from('auctions').select('id, title').in('id', auctionIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ])

    const pMap = new Map((profs ?? []).map((p) => [p.id, p]))
    const aMap = new Map((aucs ?? []).map((a) => [a.id, a]))

    const enriched = list.map((r) => ({
      ...r,
      reporter_name:
        (pMap.get(r.reporter_id as string)?.full_name &&
          String(pMap.get(r.reporter_id as string)!.full_name).trim()) ||
        'مستخدم',
      auction_title: r.reported_auction_id
        ? aMap.get(r.reported_auction_id as string)?.title ?? null
        : null,
    }))

    return NextResponse.json(enriched)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg, reports: [] })
  }
}

export async function PATCH(req: NextRequest) {
  let body: {
    report_id?: string
    status?: string
    admin_notes?: string | null
    user_id?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { report_id, status, admin_notes, user_id } = body
  if (!report_id || !isAdminUserId(user_id)) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 403 })
  }

  const allowed = new Set(['pending', 'reviewed', 'resolved', 'dismissed'])
  if (!status || !allowed.has(status)) {
    return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reports')
    .update({
      status,
      admin_notes: admin_notes != null ? String(admin_notes).slice(0, 2000) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', report_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
