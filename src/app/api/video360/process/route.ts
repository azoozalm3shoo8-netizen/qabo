import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import fs from 'fs'
import path from 'path'
import { analyzeDefects, conditionForDatabase } from '@/lib/ai-defect-analyzer'
import { annotateAllFrames } from '@/lib/frame-annotator'
import { filterFrames } from '@/lib/frame-quality-filter'
import { uploadFramesToStorage, uploadVideo } from '@/lib/frame-uploader'
import { generateHotspots } from '@/lib/hotspot-generator'
import { cleanupJob, extractFramesFromBuffer } from '@/lib/video-frame-extractor'
import { createClient } from '@/lib/supabase-server'
import { isValidUserId } from '@/lib/server/require-user'
import type { Defect } from '@/lib/video360-types'

export const runtime = 'nodejs'
export const maxDuration = 180

const ALLOWED_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const MAX_BYTES = 100 * 1024 * 1024

type PipelineOpts = { enhance: boolean; removeBg: boolean }

async function runVideo360Pipeline(
  jobId: string,
  auctionId: string | null,
  videoBuffer: Buffer,
  startedAt: number,
  opts: PipelineOpts
) {
  const supabase = createClient()

  const fail = async (msg: string) => {
    try {
      await supabase
        .from('video_360_jobs')
        .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', jobId)
    } catch {
      /* ignore */
    }
    try {
      await cleanupJob(jobId)
    } catch {
      /* ignore */
    }
  }

  try {
    await supabase
      .from('video_360_jobs')
      .update({ status: 'uploading', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    await supabase
      .from('video_360_jobs')
      .update({ status: 'extracting', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const { framePaths } = await extractFramesFromBuffer(videoBuffer, jobId, 36)

    await supabase
      .from('video_360_jobs')
      .update({
        total_extracted: framePaths.length,
        frames_folder: path.join('/tmp/qabo-v360', jobId, 'frames'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    await supabase
      .from('video_360_jobs')
      .update({ status: 'filtering', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const { valid, rejected } = await filterFrames(framePaths)
    const validFramePaths = valid.map((v) => v.path)

    await supabase
      .from('video_360_jobs')
      .update({
        valid_frames: valid.length,
        rejected_frames: rejected.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (opts.enhance) {
      try {
        await supabase
          .from('video_360_jobs')
          .update({ status: 'enhancing', updated_at: new Date().toISOString() })
          .eq('id', jobId)
      } catch {
        /* ignore */
      }

      const { enhanceVideoFrame } = await import('@/lib/image-enhancer')
      for (const fp of validFramePaths) {
        try {
          const r = await enhanceVideoFrame(fp)
          fs.writeFileSync(fp, r.buffer)
        } catch {
          /* keep original frame */
        }
      }
    }

    let nobgPaths: string[] = []
    if (opts.removeBg) {
      try {
        await supabase
          .from('video_360_jobs')
          .update({ status: 'removing-bg', updated_at: new Date().toISOString() })
          .eq('id', jobId)
      } catch {
        /* ignore */
      }

      const nobgDir = path.join('/tmp/qabo-v360', jobId, 'nobg')
      try {
        fs.mkdirSync(nobgDir, { recursive: true })
      } catch {
        /* ignore */
      }

      const { removeImageBackground } = await import('@/lib/background-remover')

      for (let i = 0; i < validFramePaths.length; i++) {
        const fp = validFramePaths[i]
        const outPath = path.join(nobgDir, `frame_${i.toString().padStart(3, '0')}.jpg`)
        try {
          const buf = fs.readFileSync(fp)
          const rb = await removeImageBackground(buf, { addWhiteBg: true })
          if (rb.success && rb.buffer.length > 0) {
            fs.writeFileSync(outPath, rb.buffer)
          } else {
            fs.copyFileSync(fp, outPath)
          }
          nobgPaths.push(outPath)
        } catch {
          try {
            fs.copyFileSync(fp, outPath)
            nobgPaths.push(outPath)
          } catch {
            /* skip frame */
          }
        }
      }
    }

    await supabase
      .from('video_360_jobs')
      .update({ status: 'analyzing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const analysis = await analyzeDefects(validFramePaths)
    const defects: Defect[] = analysis.defects
    const dbCondition = conditionForDatabase(analysis.overall_condition)

    await supabase
      .from('video_360_jobs')
      .update({
        defects,
        overall_condition: dbCondition,
        condition_score: analysis.condition_score,
        condition_summary_ar: analysis.summary_ar,
        ai_model_used: analysis.ai_model,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    await supabase
      .from('video_360_jobs')
      .update({ status: 'annotating', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    const annotatedDir = path.join('/tmp/qabo-v360', jobId, 'annotated')
    const annotatedPaths = await annotateAllFrames(validFramePaths, defects, annotatedDir)

    const frame_urls = await uploadFramesToStorage(jobId, validFramePaths, 'frames')
    const annotated_urls = await uploadFramesToStorage(jobId, annotatedPaths, 'annotated')
    const videoUrl = await uploadVideo(jobId, videoBuffer)

    let nobg_urls: string[] = []
    if (nobgPaths.length > 0) {
      try {
        nobg_urls = await uploadFramesToStorage(jobId, nobgPaths, 'nobg')
      } catch {
        nobg_urls = []
      }
    }

    const hotspots = generateHotspots(defects, validFramePaths.length, 800, 600)
    const processing_time_ms = Date.now() - startedAt

    const updatePayload: Record<string, unknown> = {
      frame_urls,
      annotated_urls,
      video_storage_path: videoUrl,
      hotspots,
      status: 'done',
      processing_time_ms,
      updated_at: new Date().toISOString(),
    }
    if (nobg_urls.length > 0) {
      updatePayload.nobg_urls = nobg_urls
    }

    await supabase.from('video_360_jobs').update(updatePayload).eq('id', jobId)

    await cleanupJob(jobId)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'فشلت المعالجة'
    await fail(msg)
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now()

  const userIdRaw = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(userIdRaw)) {
    return NextResponse.json({ success: false, error: 'معرّف المستخدم مطلوب أو غير صالح' }, { status: 401 })
  }
  const userId = userIdRaw.trim()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'تعذر قراءة البيانات' }, { status: 400 })
  }

  const enhanceRaw = form.get('enhance')
  const removeBgRaw = form.get('removeBg')
  const enhance = enhanceRaw === 'true'
  const removeBg = removeBgRaw === 'true'

  const file = form.get('file')
  const auctionRaw = form.get('auction_id')
  const auctionId =
    typeof auctionRaw === 'string' && auctionRaw.trim() && isValidUserId(auctionRaw.trim())
      ? auctionRaw.trim()
      : null

  if (!file || typeof file === 'string' || !('arrayBuffer' in file)) {
    return NextResponse.json({ success: false, error: 'لم يُرفع ملف فيديو' }, { status: 400 })
  }

  const f = file as File
  const mime = (f.type || '').toLowerCase()
  if (!ALLOWED_TYPES.has(mime)) {
    return NextResponse.json(
      { success: false, error: 'صيغة الفيديو غير مدعومة. استخدم MP4 أو MOV أو WebM' },
      { status: 400 }
    )
  }
  if (f.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: 'حجم الفيديو يتجاوز 100 ميجابايت' }, { status: 400 })
  }

  let videoBuffer: Buffer
  try {
    videoBuffer = Buffer.from(await f.arrayBuffer())
  } catch {
    return NextResponse.json({ success: false, error: 'تعذر قراءة ملف الفيديو' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: jobRow, error: insErr } = await supabase
    .from('video_360_jobs')
    .insert({
      user_id: userId,
      auction_id: auctionId,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insErr || !jobRow?.id) {
    return NextResponse.json(
      {
        success: false,
        error:
          'تعذر إنشاء المهمة. نفّذ video360-schema.sql في Supabase: ' + (insErr?.message || ''),
      },
      { status: 500 }
    )
  }

  const jobId = jobRow.id as string
  const pipelineOpts: PipelineOpts = { enhance, removeBg }

  after(async () => {
    await runVideo360Pipeline(jobId, auctionId, videoBuffer, started, pipelineOpts)
  })

  return NextResponse.json({
    success: true,
    job_id: jobId,
    status: 'pending',
    message: 'بدأت المعالجة، راقب الحالة عبر /api/video360/status',
  })
}
