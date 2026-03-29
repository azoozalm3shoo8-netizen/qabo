import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isValidUserId } from '@/lib/server/require-user'
import type { Defect } from '@/lib/video360-types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userIdRaw = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(userIdRaw)) {
    return NextResponse.json({ success: false, error: 'معرّف المستخدم غير صالح' }, { status: 401 })
  }
  const sellerId = userIdRaw!.trim()

  let body: {
    job_id?: string
    auction_id?: string
    responses?: { defect_index: number; confirmed: boolean; comment?: string }[]
    acknowledge_responsibility?: boolean
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ success: false, error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const jobId = body.job_id?.trim()
  if (!jobId) {
    return NextResponse.json({ success: false, error: 'job_id مطلوب' }, { status: 400 })
  }
  const responses = Array.isArray(body.responses) ? body.responses : []
  const acknowledge = body.acknowledge_responsibility === true

  const supabase = createClient()

  try {
    const { data: job, error: jobErr } = await supabase
      .from('video_360_jobs')
      .select('*')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr) {
      return NextResponse.json({ success: false, error: jobErr.message }, { status: 500 })
    }
    if (!job) {
      return NextResponse.json({ success: false, error: 'المهمة غير موجودة' }, { status: 404 })
    }
    if (String(job.user_id) !== sellerId) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 403 })
    }
    if (String(job.status) !== 'done') {
      return NextResponse.json({ success: false, error: 'المهمة لم تكتمل بعد' }, { status: 400 })
    }

    const defects = (job.defects as Defect[]) || []
    let confirmed = 0
    let denied = 0

    for (const r of responses) {
      const idx = r.defect_index
      if (!Number.isFinite(idx) || idx < 0 || idx >= defects.length) continue
      const d = defects[idx]
      const row = {
        job_id: jobId,
        auction_id: body.auction_id?.trim() || job.auction_id || null,
        seller_id: sellerId,
        defect_index: idx,
        defect_type: d.type,
        defect_severity: d.severity,
        ai_description: d.description_ar,
        seller_confirmed: r.confirmed,
        seller_comment: r.comment?.slice(0, 2000) || '',
      }
      const { error: upErr } = await supabase.from('defect_responses').upsert(row, {
        onConflict: 'job_id,defect_index',
      })
      if (upErr) {
        return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
      }
      if (r.confirmed) confirmed++
      else denied++
    }

    const { error: updErr } = await supabase
      .from('video_360_jobs')
      .update({
        seller_response_status: 'completed',
        seller_confirmed_defects: confirmed,
        seller_denied_defects: denied,
        seller_responsibility_acknowledged: acknowledge,
        seller_response_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (updErr) {
      return NextResponse.json({ success: false, error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, confirmed, denied })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const jobId = sp.get('job_id')?.trim()
  const auctionId = sp.get('auction_id')?.trim()

  if (!jobId && !auctionId) {
    return NextResponse.json({ error: 'job_id أو auction_id مطلوب' }, { status: 400 })
  }

  const supabase = createClient()

  try {
    const base = supabase.from('defect_responses').select('*').order('defect_index', { ascending: true })
    const { data: rows, error } = jobId
      ? await base.eq('job_id', jobId)
      : await base.eq('auction_id', auctionId!)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = rows || []
    const confirmed = list.filter((r: { seller_confirmed: boolean }) => r.seller_confirmed).length
    const denied = list.filter((r: { seller_confirmed: boolean }) => !r.seller_confirmed).length

    return NextResponse.json({
      responses: list,
      summary: { total: list.length, confirmed, denied },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
