'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteImage, uploadImage } from '@/lib/storage'
import { pathFromPublicUrl } from '@/lib/supabase/storage'

const MAX_FILES = 5
const MAX_BYTES_BEFORE = 10 * 1024 * 1024

type Slot = {
  id: string
  preview: string
  file: File | null
  url: string | null
  uploading: boolean
  error: boolean
  path: string | null
}

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function ImageUploader({
  initialUrls,
  onImagesChange,
  onBusyChange,
}: {
  initialUrls?: string[]
  onImagesChange: (urls: string[]) => void
  onBusyChange?: (busy: boolean) => void
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
      error: false,
      path: null,
    }))
  )

  useEffect(() => {
    const urls = slots.map((s) => s.url).filter((u): u is string => Boolean(u))
    const key = urls.join('\0')
    if (lastNotifiedUrlsKeyRef.current === key) return
    lastNotifiedUrlsKeyRef.current = key
    onImagesChange(urls)
  }, [slots, onImagesChange])

  useEffect(() => {
    onBusyChange?.(slots.some((s) => s.uploading))
  }, [slots, onBusyChange])

  const runUpload = useCallback(async (slotId: string, file: File, preview: string) => {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const url = await uploadImage(file, path)
    if (url) {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, url, uploading: false, file: null, error: false, path: path }
            : s
        )
      )
      queueMicrotask(() => URL.revokeObjectURL(preview))
      return
    }

    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, uploading: false, error: true } : s))
    )
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES_BEFORE) {
        alert('الحد الأقصى قبل الضغط 10 ميجابايت')
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
        return [
          ...prev,
          {
            id: slotId,
            preview,
            file,
            url: null,
            uploading: true,
            error: false,
            path: null,
          },
        ]
      })

      if (!allowed) {
        return
      }

      await runUpload(slotId, file, preview)
    },
    [runUpload]
  )

  const retrySlot = async (slot: Slot) => {
    if (!slot.file) return
    const preview = slot.preview.startsWith('blob:') ? slot.preview : URL.createObjectURL(slot.file)
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, uploading: true, error: false } : s))
    )
    await runUpload(slot.id, slot.file, preview)
  }

  const removeSlot = async (slot: Slot) => {
    if (slot.url) {
      const storagePath = pathFromPublicUrl(slot.url) || slot.path
      if (storagePath) {
        await deleteImage(storagePath)
      }
    }
    if (!slot.url) URL.revokeObjectURL(slot.preview)
    setSlots((prev) => prev.filter((s) => s.id !== slot.id))
  }

  const atMax = slots.length >= MAX_FILES
  const anyUploading = slots.some((s) => s.uploading)

  return (
    <div className="space-y-3" dir="rtl">
      <label className="block text-sm font-medium text-gray-800">صور المنتج</label>
      <p className="text-xs text-gray-500">
        صورة واحدة على الأقل • حتى {MAX_FILES} صور • JPG أو PNG أو WEBP • حتى 10 ميجابايت (يُضغط تلقائياً)
      </p>
      {anyUploading && (
        <p className="text-xs font-semibold text-[#1B7F7A]">جاري رفع الصور...</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
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
            <img src={s.url || s.preview} alt="" className="w-full h-full object-cover" />
            {s.uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {s.error && !s.uploading && (
              <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-1 p-1">
                <span className="text-[10px] text-white text-center font-bold">فشل الرفع</span>
                <button
                  type="button"
                  onClick={() => void retrySlot(s)}
                  className="text-[10px] bg-[#FF8C42] text-white px-2 py-1 rounded-lg font-bold"
                >
                  إعادة
                </button>
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
              <span className="absolute bottom-0 inset-x-0 bg-[#1B7F7A]/95 text-white text-[10px] font-bold text-center py-0.5">
                الصورة الرئيسية
              </span>
            )}
          </div>
        ))}

        {!atMax && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-[#1B7F7A]/40 bg-[#E6F4F3]/50 flex flex-col items-center justify-center gap-0.5 text-[#1B7F7A] hover:bg-[#E6F4F3] transition-colors text-xs font-medium px-1 text-center leading-tight"
          >
            + إضافة صورة
          </button>
        )}
      </div>
    </div>
  )
}
