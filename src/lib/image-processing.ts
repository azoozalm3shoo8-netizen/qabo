/** Client-only image helpers (Canvas API). */

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
  file: Blob,
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

export async function addWatermark(file: Blob, text = 'qabboo'): Promise<Blob> {
  const img = await loadImageFromBlob(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  ctx.drawImage(img, 0, 0)
  const fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.035))
  ctx.font = `bold ${fontSize}px Cairo, Inter, system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = Math.max(1, fontSize / 14)
  const pad = fontSize * 0.6
  const x = pad
  const y = h - pad
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.88
    )
  })
}

export async function enhanceBrightness(file: Blob, amount = 1.2): Promise<Blob> {
  const img = await loadImageFromBlob(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  ctx.filter = `brightness(${amount})`
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

export async function removeBackground(file: Blob): Promise<Blob> {
  const img = await loadImageFromBlob(file)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas context')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h)
  const d = data.data
  const threshold = 235
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] ?? 0
    const g = d[i + 1] ?? 0
    const b = d[i + 2] ?? 0
    if (r > threshold && g > threshold && b > threshold) {
      d[i + 3] = 0
    }
  }
  ctx.putImageData(data, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/png'
    )
  })
}

export async function generateImageHash(file: Blob): Promise<string> {
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
  let hi = 0
  let lo = 0
  for (let i = 0; i < 32; i++) {
    if ((grays[i] ?? 0) >= mean) hi |= 1 << i
  }
  for (let i = 0; i < 32; i++) {
    if ((grays[i + 32] ?? 0) >= mean) lo |= 1 << i
  }
  return `${hi.toString(16).padStart(8, '0')}${lo.toString(16).padStart(8, '0')}`
}

export async function blobToJpegFile(blob: Blob, baseName: string): Promise<File> {
  const name = baseName.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
}
