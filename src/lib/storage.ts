'use client'

import { createClient } from '@supabase/supabase-js'

const BUCKET = 'auction-images'

function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env غير مكتمل')
  return createClient(url, key)
}

async function compressImage(file: File): Promise<File> {
  const maxBytes = 1024 * 1024
  const maxW = 1200

  const tryCompress = (quality: number): Promise<File | null> =>
    new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let w = img.naturalWidth || img.width
        let h = img.naturalHeight || img.height
        if (w <= 0 || h <= 0) {
          resolve(null)
          return
        }
        if (w > maxW) {
          h = (h * maxW) / w
          w = maxW
        }
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(w)
        canvas.height = Math.round(h)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null)
              return
            }
            const base = file.name.replace(/\.[^.]+$/, '') || 'image'
            resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      img.src = url
    })

  let q = 0.82
  let attempt = 0
  let last: File | null = null
  while (attempt < 6) {
    last = await tryCompress(q)
    if (!last) break
    if (last.size <= maxBytes) return last
    q -= 0.12
    attempt += 1
  }
  return last ?? file
}

export async function uploadImage(file: File, path: string): Promise<string | null> {
  try {
    const compressed = await compressImage(file)
    const supabase = getSupabaseBrowser()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, compressed, {
        contentType: compressed.type || 'image/jpeg',
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
