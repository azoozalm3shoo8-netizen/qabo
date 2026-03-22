'use client'

import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { pathFromPublicUrl } from '@/lib/supabase/storage'

const MAX_FILES = 5
const MAX_BYTES = 5 * 1024 * 1024

type Slot = {
  id: string
  preview: string
  file: File | null
  url: string | null
  uploading: boolean
}

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function ImageUploader({
  initialUrls,
  onImagesChange,
}: {
  /** Restored when the step remounts (e.g. back from pricing) */
  initialUrls?: string[]
  onImagesChange: (urls: string[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastNotifiedUrlsKeyRef = useRef<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>(() =>
    (initialUrls ?? []).map((url) => ({
      id: randomId(),
      preview: url,
      file: null,
      url,
      uploading: false,
    }))
  )

  useEffect(() => {
    const urls = slots.map((s) => s.url).filter((u): u is string => Boolean(u))
    const key = urls.join('\0')
    if (lastNotifiedUrlsKeyRef.current === key) return
    lastNotifiedUrlsKeyRef.current = key
    onImagesChange(urls)
  }, [slots, onImagesChange])

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_BYTES) {
      alert('الحد الأقصى 5 ميجابايت')
      return
    }

    const preview = URL.createObjectURL(file)
    const slotId = randomId()

    let allowed = false
    setSlots((prev) => {
      if (prev.length >= MAX_FILES) {
        URL.revokeObjectURL(preview)
        return prev
      }
      allowed = true
      return [...prev, { id: slotId, preview, file, url: null, uploading: true }]
    })

    if (!allowed) {
      return
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.storage.from('auction-images').upload(path, file)

    console.log('Upload result:', data, error)

    if (!error) {
      const { data: urlData } = supabase.storage.from('auction-images').getPublicUrl(path)
      console.log('Public URL:', urlData.publicUrl)

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, url: urlData.publicUrl, uploading: false, file: null }
            : s
        )
      )
      queueMicrotask(() => URL.revokeObjectURL(preview))
      return
    }

    URL.revokeObjectURL(preview)
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
    alert(error.message || 'فشل رفع الصورة')
  }, [])

  const removeSlot = async (slot: Slot) => {
    if (slot.url) {
      const storagePath = pathFromPublicUrl(slot.url)
      if (storagePath) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        await supabase.storage.from('auction-images').remove([storagePath])
      }
    }
    if (!slot.url) URL.revokeObjectURL(slot.preview)
    setSlots((prev) => prev.filter((s) => s.id !== slot.id))
  }

  const atMax = slots.length >= MAX_FILES

  return (
    <div className="space-y-3" dir="rtl">
      <label className="block text-sm font-medium text-gray-800">صور المنتج</label>
      <p className="text-xs text-gray-500">
        صورة واحدة على الأقل • حتى {MAX_FILES} صور • 5 ميجابايت لكل صورة
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          console.log('File selected:', file.name, file.size, file.type)
          void handleFile(file)
          e.target.value = ''
        }}
      />

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {slots.map((s, index) => (
          <div
            key={s.id}
            className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url || s.preview}
              alt=""
              className="w-full h-full object-cover"
            />
            {s.uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!s.uploading && (
              <button
                type="button"
                onClick={() => void removeSlot(s)}
                className="absolute top-1 left-1 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center hover:bg-black/80"
                aria-label="حذف"
              >
                ✕
              </button>
            )}
            {index === 0 && (
              <span className="absolute bottom-0 inset-x-0 bg-amber-500/95 text-white text-[10px] font-bold text-center py-0.5">
                الصورة الرئيسية
              </span>
            )}
          </div>
        ))}

        {!atMax && (
          <button
            type="button"
            onClick={() => {
              console.log('Add image clicked')
              fileInputRef.current?.click()
            }}
            className="aspect-square rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center gap-0.5 text-amber-700 hover:bg-amber-50 transition-colors text-xs font-medium px-1 text-center leading-tight"
          >
            + إضافة صورة
          </button>
        )}
      </div>
    </div>
  )
}
