/**
 * Client-only image helpers (Canvas API).
 * إزالة الخلفية تتم عبر POST /api/images/remove-bg فقط — لا تُستورد مكتبات @imgly هنا.
 */

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}

export async function compressImage(
  file: File | Blob,
  maxWidth = 1200,
  quality = 0.85
): Promise<Blob> {
  const img = await loadImageFromBlob(file)
  let w = img.naturalWidth || img.width
  let h = img.naturalHeight || img.height
  if (w <= 0 || h <= 0) throw new Error('invalid image size')
  if (w > maxWidth) {
    h = (h * maxWidth) / w
    w = maxWidth
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w)
  canvas.height = Math.round(h)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality
    )
  })
}

export async function addWatermark(file: File | Blob, text = 'qabboo'): Promise<Blob> {
  const img = await loadImageFromBlob(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  ctx.drawImage(img, 0, 0)
  const fontSize = 20
  ctx.font = `bold ${fontSize}px Cairo, var(--font-cairo), system-ui, sans-serif`
  ctx.globalAlpha = 0.3
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.65)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  const pad = 12
  const x = pad
  const y = h - pad
  ctx.textBaseline = 'bottom'
  ctx.fillText(text, x, y)
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.88
    )
  })
}

export async function enhanceBrightness(
  file: File | Blob,
  _amount = 1.15
): Promise<Blob> {
  void _amount
  const img = await loadImageFromBlob(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  ctx.filter = 'brightness(1.15) contrast(1.05) saturate(1.1)'
  ctx.drawImage(img, 0, 0)
  ctx.filter = 'none'
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.9
    )
  })
}

/** إزالة الخلفية على الخادم فقط — يستدعي `/api/images/remove-bg` ثم يحمّل الناتج كـ Blob */
export async function removeBackground(
  file: File | Blob,
  onProgress?: (fraction: number) => void
): Promise<Blob> {
  const { readQaboUserFromStorage } = await import('@/lib/qabo-user')
  const user = readQaboUserFromStorage()
  if (!user?.user_id) {
    throw new Error('يجب تسجيل الدخول لإزالة الخلفية')
  }

  onProgress?.(0.08)
  const formData = new FormData()
  const filePart =
    file instanceof File
      ? file
      : new File([file], 'upload.jpg', { type: file.type || 'image/jpeg' })
  formData.append('file', filePart)
  formData.append(
    'options',
    JSON.stringify({
      addWhiteBg: false,
      outputFormat: 'webp',
    })
  )

  const res = await fetch(
    `/api/images/remove-bg?user_id=${encodeURIComponent(user.user_id)}`,
    {
      method: 'POST',
      body: formData,
    }
  )

  onProgress?.(0.55)
  const data = (await res.json()) as { success?: boolean; url?: string; error?: string }
  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.error || 'فشلت إزالة الخلفية')
  }

  onProgress?.(0.75)
  const imgRes = await fetch(data.url)
  if (!imgRes.ok) {
    throw new Error('تعذر تحميل الصورة بعد المعالجة')
  }
  const blob = await imgRes.blob()
  onProgress?.(1)
  return blob
}

export async function generateImageHash(file: File | Blob): Promise<string> {
  const img = await loadImageFromBlob(file)
  const size = 8
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)
  const grays: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    grays.push(0.299 * r + 0.587 * g + 0.114 * b)
  }
  const mean = grays.reduce((a, b) => a + b, 0) / grays.length
  let bits = 0n
  for (let i = 0; i < grays.length; i++) {
    if ((grays[i] ?? 0) >= mean) bits |= 1n << BigInt(63 - i)
  }
  return bits.toString(16).padStart(16, '0')
}

/** 1 = identical perceptual hash, 0 = completely different (Hamming on full hash). */
export function hashSimilarity(hexA: string, hexB: string): number {
  if (!hexA || !hexB || hexA.length !== hexB.length) return 0
  try {
    const a = BigInt('0x' + hexA)
    const b = BigInt('0x' + hexB)
    let x = a ^ b
    let bits = 0
    while (x > 0n) {
      if (x & 1n) bits += 1
      x >>= 1n
    }
    const maxBits = hexA.length * 4
    return maxBits > 0 ? 1 - bits / maxBits : 0
  } catch {
    return 0
  }
}

export async function blobToJpegFile(blob: Blob, baseName: string): Promise<File> {
  const name = baseName.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
}
