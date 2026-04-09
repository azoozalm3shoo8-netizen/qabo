'use client'

import { X } from '@phosphor-icons/react'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'
import { uploadImage, deleteImage } from '@/lib/storage'
import { pathFromPublicUrl } from '@/lib/supabase/storage'
import type { AuctionDraftFormData } from '@/components/create/auction-draft-types'

const MAX = 10

function randomName() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function StepPhotos({
  formData,
  setFormData,
  userId,
  error,
}: {
  formData: AuctionDraftFormData
  setFormData: React.Dispatch<React.SetStateAction<AuctionDraftFormData>>
  userId: string
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)

  const assess = useCallback(async (file: File) => {
    try {
      const fd = new FormData()
      fd.set('file', file)
      const r = await fetch('/api/images/assess', { method: 'POST', body: fd })
      const j = (await r.json()) as { isAcceptable?: boolean }
      return Boolean(j.isAcceptable)
    } catch {
      return true
    }
  }, [])

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = [...files].filter((f) => f.type.startsWith('image/')).slice(0, MAX)
      if (arr.length === 0) return
      setBusy(true)
      try {
        for (const file of arr) {
          const path = `wizard/${userId}/${randomName()}.jpg`
          const url = await uploadImage(file, path)
          if (!url) continue
          const ok = await assess(file)
          setFormData((prev) => {
            if (prev.imageUrls.length >= MAX) return prev
            const quality = { ...prev.imageQuality, [url]: ok ? 'good' : 'poor' }
            return {
              ...prev,
              imageUrls: [...prev.imageUrls, url],
              imagePaths: [...prev.imagePaths, path],
              imageQuality: quality,
            }
          })
        }
      } finally {
        setBusy(false)
      }
    },
    [assess, setFormData, userId]
  )

  const removeAt = async (index: number) => {
    const url = formData.imageUrls[index]
    const path = formData.imagePaths[index] ?? pathFromPublicUrl(url)
    if (path) await deleteImage(path)
    setFormData((prev) => {
      const urls = [...prev.imageUrls]
      const paths = [...prev.imagePaths]
      urls.splice(index, 1)
      paths.splice(index, 1)
      const { [url]: _, ...restQ } = prev.imageQuality
      return { ...prev, imageUrls: urls, imagePaths: paths, imageQuality: restQ }
    })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-lg font-bold text-foreground">صور المزاد</h2>
      <p className="text-sm text-muted-foreground">ارفع حتى {MAX} صور. الأولى تظهر كصورة رئيسية.</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={
          'flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
          (dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/40 hover:border-primary/50')
        }
        onClick={() => inputRef.current?.click()}
      >
        <span className="text-3xl" aria-hidden>
          📸
        </span>
        <p className="mt-2 text-sm font-medium text-foreground">اختر صوراً أو اسحبها هنا</p>
        {busy ? <p className="mt-1 text-xs text-muted-foreground">جاري الرفع…</p> : null}
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      {formData.imageUrls.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {formData.imageUrls.map((url, i) => {
            const q = formData.imageQuality[url]
            return (
              <div key={url + i} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                <Image src={url} alt="" fill className="object-cover" sizes="120px" />
                {i === 0 ? (
                  <span className="absolute start-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    الرئيسية
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void removeAt(i)
                  }}
                  className="absolute end-1 top-1 flex h-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-background/90 text-destructive shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="حذف الصورة"
                >
                  <X className="h-4 w-4" weight="bold" />
                </button>
                {q ? (
                  <p
                    className={
                      'absolute bottom-0 start-0 end-0 px-1 py-0.5 text-center text-[10px] font-medium ' +
                      (q === 'good' ? 'bg-emerald-600/90 text-white' : 'bg-amber-600/90 text-white')
                    }
                  >
                    {q === 'good' ? '✅ صورة ممتازة' : '⚠️ الصورة غير واضحة'}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
