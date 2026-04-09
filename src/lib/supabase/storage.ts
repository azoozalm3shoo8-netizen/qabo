import { supabase } from '@/lib/supabase/client'

const BUCKET = 'auction-images'

export function getImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  const clean = path.replace(/^\/+/, '')
  return `${base}/storage/v1/object/public/${BUCKET}/${clean}`
}

/** Extract storage path from full public URL */
export function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  try {
    return decodeURIComponent(url.slice(i + marker.length))
  } catch {
    return url.slice(i + marker.length)
  }
}

function extFromFile(file: File): string {
  const name = file.name.toLowerCase()
  const dot = name.lastIndexOf('.')
  if (dot >= 0) {
    const e = name.slice(dot + 1)
    if (['jpg', 'jpeg', 'png', 'webp'].includes(e)) return e === 'jpeg' ? 'jpg' : e
  }
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export async function uploadAuctionImage(file: File, auctionId: string): Promise<string> {
  const ext = extFromFile(file)
  const folder = (auctionId && auctionId.trim()) || `temp/${Date.now()}`
  const path = `${folder}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  })

  if (error) throw error

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = pub.publicUrl
  return url
}

export async function deleteAuctionImage(pathOrUrl: string): Promise<void> {
  const path =
    pathOrUrl.startsWith('http') ? pathFromPublicUrl(pathOrUrl) : pathOrUrl.replace(/^\/+/, '')
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}
