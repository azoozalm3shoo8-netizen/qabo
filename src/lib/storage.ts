'use client'

import { createClient } from '@supabase/supabase-js'
import { blobToJpegFile, compressImage as compressBlob } from '@/lib/image-processing'

const BUCKET = 'auction-images'

function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env missing')
  return createClient(url, key)
}

async function compressFileForUpload(file: File): Promise<File> {
  const maxBytes = 1024 * 1024
  let q = 0.85
  let attempt = 0
  let last: File | null = null
  while (attempt < 6) {
    const blob = await compressBlob(file, 1200, q)
    last = await blobToJpegFile(blob, file.name)
    if (last.size <= maxBytes) return last
    q -= 0.12
    attempt += 1
  }
  return last ?? file
}

export async function uploadImage(
  file: File,
  path: string,
  opts?: { skipCompression?: boolean }
): Promise<string | null> {
  try {
    const toUpload = opts?.skipCompression ? file : await compressFileForUpload(file)
    const supabase = getSupabaseBrowser()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, toUpload, {
        contentType: toUpload.type || 'image/jpeg',
        upsert: true,
      })
    if (error) return null
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    return pub.publicUrl
  } catch {
    return null
  }
}

export async function deleteImage(pathOrUrl: string): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowser()
    const marker = `/object/public/${BUCKET}/`
    const path = pathOrUrl.includes('http')
      ? (() => {
          const i = pathOrUrl.indexOf(marker)
          if (i === -1) return pathOrUrl
          try {
            return decodeURIComponent(pathOrUrl.slice(i + marker.length))
          } catch {
            return pathOrUrl.slice(i + marker.length)
          }
        })()
      : pathOrUrl.replace(/^\/+/, '')
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    return !error
  } catch {
    return false
  }
}
