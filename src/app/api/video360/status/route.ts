import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('job_id')
  if (!jobId?.trim()) {
    return NextResponse.json({ error: 'job_id مطلوب' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase.from('video_360_jobs').select('*').eq('id', jobId.trim()).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  return NextResponse.json(data)
}
