/**
 * استخراج فريمات من فيديو — خادم فقط (ffmpeg مباشرة)
 */

import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const TMP_ROOT = '/tmp/qabo-v360'

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  const { stdout, stderr } = await execFileAsync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ],
    { maxBuffer: 10 * 1024 * 1024 }
  ).catch((err: Error & { stderr?: string }) => {
    throw new Error(`ffprobe فشل: ${err.message}${err.stderr ? ` — ${err.stderr}` : ''}`)
  })

  const v = parseFloat(String(stdout).trim())
  if (!Number.isFinite(v) || v <= 0) {
    throw new Error(`مدة الفيديو غير صالحة: ${stdout}`)
  }
  return v
}

export async function extractFrames(
  videoPath: string,
  outputDir: string,
  targetFrames = 36
): Promise<string[]> {
  ensureDir(outputDir)

  const duration = await getVideoDuration(videoPath)
  const fps = Math.min(120, Math.max(0.01, targetFrames / duration))

  const pattern = path.join(outputDir, 'frame_%03d.jpg')
  const { stderr } = await execFileAsync(
    'ffmpeg',
    ['-y', '-i', videoPath, '-vf', `fps=${fps}`, '-q:v', '2', '-f', 'image2', pattern],
    { maxBuffer: 20 * 1024 * 1024 }
  ).catch((err: Error & { stderr?: string }) => {
    const msg = err.stderr || err.message
    throw new Error(`ffmpeg فشل في استخراج الفريمات: ${msg}`)
  })

  if (stderr && /error/i.test(stderr) && !/deprecated/i.test(stderr)) {
    // بعض تحذيرات ffmpeg تظهر كـ stderr دون فشل فعلي؛ نعتمد على وجود الملفات
  }

  const files = fs
    .readdirSync(outputDir)
    .filter((f) => /^frame_\d+\.jpg$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(outputDir, f))

  if (files.length === 0) {
    throw new Error('لم يُستخرج أي فريم — تحقق من تنسيق الفيديو ووجود ffmpeg')
  }

  return files
}

export async function extractFramesFromBuffer(
  videoBuffer: Buffer,
  jobId: string,
  targetFrames?: number
): Promise<{ outputDir: string; framePaths: string[] }> {
  const base = path.join(TMP_ROOT, jobId)
  const inputPath = path.join(base, 'input.mp4')
  const framesDir = path.join(base, 'frames')
  ensureDir(path.dirname(inputPath))
  ensureDir(framesDir)
  fs.writeFileSync(inputPath, videoBuffer)
  const framePaths = await extractFrames(inputPath, framesDir, targetFrames)
  return { outputDir: framesDir, framePaths }
}

export async function cleanupJob(jobId: string): Promise<void> {
  const dir = path.join(TMP_ROOT, jobId)
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  } catch {
    /* ignore */
  }
}
