import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const auctionId = sp.get('auction_id')?.trim()
  const jobId = sp.get('job_id')?.trim()

  const supabase = createClient()

  if (jobId) {
    const { data, error } = await supabase
      .from('video_360_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('status', 'done')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ available: false })
    return jsonFromRow(data)
  }

  if (auctionId) {
    const { data, error } = await supabase
      .from('video_360_jobs')
      .select('*')
      .eq('auction_id', auctionId)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ available: false })
    return jsonFromRow(data)
  }

  return NextResponse.json({ error: 'auction_id أو job_id مطلوب' }, { status: 400 })
}

function jsonFromRow(data: Record<string, unknown>) {
  const frame_urls = (data.frame_urls as string[]) || []
  const annotated_urls = (data.annotated_urls as string[]) || []
  const nobg_urls = (data.nobg_urls as string[]) || []
  return NextResponse.json({
    available: true,
    job_id: data.id,
    frame_urls,
    annotated_urls,
    nobg_urls,
    hotspots: data.hotspots ?? [],
    defects: data.defects ?? [],
    overall_condition: data.overall_condition,
    condition_score: data.condition_score,
    summary_ar: data.condition_summary_ar,
    total_frames: frame_urls.length,
    seller_response_status: data.seller_response_status ?? 'pending',
    seller_confirmed_defects: data.seller_confirmed_defects ?? 0,
    seller_denied_defects: data.seller_denied_defects ?? 0,
  })
}
