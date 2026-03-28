/**
 * رفع فريمات وفيديو إلى Supabase Storage — خادم فقط
 */

import fs from 'fs'
import { createClient } from '@/lib/supabase-server'

async function runPool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    for (;;) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

export async function uploadFramesToStorage(
  jobId: string,
  framePaths: string[],
  subfolder: string
): Promise<string[]> {
  const supabase = createClient()
  return runPool(framePaths, 3, async (fp, index) => {
    const storagePath = `360/${jobId}/${subfolder}/frame_${index.toString().padStart(3, '0')}.jpg`
    const buffer = fs.readFileSync(fp)
    const { error } = await supabase.storage.from('auction-images').upload(storagePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('auction-images').getPublicUrl(storagePath)
    return data.publicUrl
  })
}

export async function uploadVideo(jobId: string, videoBuffer: Buffer): Promise<string> {
  const supabase = createClient()
  const storagePath = `360/${jobId}/original.mp4`
  const { error } = await supabase.storage.from('auction-images').upload(storagePath, videoBuffer, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('auction-images').getPublicUrl(storagePath)
  return data.publicUrl
}
