'use client'

import { Eraser, Sun } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/Toast'
import {
  addWatermark,
  blobToJpegFile,
  compressImage,
  enhanceBrightness,
  generateImageHash,
  hashSimilarity,
  removeBackground,
} from '@/lib/image-processing'
import { useLocale } from '@/lib/locale-context'
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
  dna: string | null
  workingBlob: Blob | null
  preEnhancePreview: string | null
  removingBg: boolean
  removeBgProgress: number
}

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function ImageUploader({
  initialUrls,
  onImagesChange,
  onBusyChange,
  watermarkSellerLabel,
}: {
  initialUrls?: string[]
  onImagesChange: (urls: string[]) => void
  onBusyChange?: (busy: boolean) => void
  /** يُعرض في العلامة المائية: «قبو | الاسم» */
  watermarkSellerLabel?: string
}) {
  const { t } = useLocale()
  const { show } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [slots, setSlots] = useState<Slot[]>(() =>
    (initialUrls ?? []).map((url) => ({
      id: randomId(),
      preview: url,
      file: null,
      url,
      uploading: false,
      error: false,
      path: null,
      dna: null,
      workingBlob: null,
      preEnhancePreview: null,
      removingBg: false,
      removeBgProgress: 0,
    }))
  )
  const lastNotifiedUrlsKeyRef = useRef<string | null>(null)
  const slotsRef = useRef(slots)

  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  useEffect(() => {
    const urls = slots.map((s) => s.url).filter((u): u is string => Boolean(u))
    const key = urls.join('\0')
    if (lastNotifiedUrlsKeyRef.current === key) return
    lastNotifiedUrlsKeyRef.current = key
    onImagesChange(urls)
  }, [slots, onImagesChange])

  useEffect(() => {
    onBusyChange?.(slots.some((s) => s.uploading || s.removingBg))
  }, [slots, onBusyChange])

  const runUpload = useCallback(async (slotId: string, file: File, preview: string) => {
    const ext = 'jpg'
    const path = `temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    try {
      const compressed = await compressImage(file)
      const dna = await generateImageHash(compressed)
      for (const s of slotsRef.current) {
        if (s.id === slotId || !s.dna) continue
        if (hashSimilarity(dna, s.dna) > 0.9) {
          show('صورة مشابهة موجودة — تحقق قبل المتابعة', 'info')
          break
        }
      }
      const wmLabel = watermarkSellerLabel?.trim()
        ? `قبو | ${watermarkSellerLabel.trim()}`
        : 'قبو'
      const watermarked = await addWatermark(compressed, {
        label: wmLabel,
        angleDeg: -30,
        centerOpacity: 0.15,
      })
      const jpegFile = await blobToJpegFile(watermarked, file.name)
      const url = await uploadImage(jpegFile, path, { skipCompression: true })
      if (url) {
        setSlots((prev) =>
          prev.map((s) => {
            if (s.id !== slotId) return s
            if (s.preEnhancePreview) URL.revokeObjectURL(s.preEnhancePreview)
            return {
              ...s,
              url,
              uploading: false,
              file: null,
              error: false,
              path,
              dna,
              workingBlob: null,
              preEnhancePreview: null,
              removingBg: false,
              removeBgProgress: 0,
            }
          })
        )
        queueMicrotask(() => URL.revokeObjectURL(preview))
        return
      }
    } catch {
      /* fall through */
    }

    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, uploading: false, error: true, removingBg: false } : s))
    )
  }, [show, watermarkSellerLabel])

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES_BEFORE) {
        alert(t('imageUploader_hint'))
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
            dna: null,
            workingBlob: file,
            preEnhancePreview: null,
            removingBg: false,
            removeBgProgress: 0,
          },
        ]
      })

      if (!allowed) {
        return
      }

      await runUpload(slotId, file, preview)
    },
    [runUpload, t]
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
    if (slot.preEnhancePreview) URL.revokeObjectURL(slot.preEnhancePreview)
    if (!slot.url) URL.revokeObjectURL(slot.preview)
    setSlots((prev) => prev.filter((s) => s.id !== slot.id))
  }

  const onEnhance = async (slot: Slot) => {
    const base = slot.file
    if (!base || slot.uploading || slot.url || slot.removingBg) return
    try {
      const blob = slot.workingBlob ?? base
      const enhanced = await enhanceBrightness(blob, 1.15)
      const nextFile = await blobToJpegFile(enhanced, base.name)
      const newPreview = URL.createObjectURL(enhanced)
      const keepCompare = slot.preview.startsWith('blob:') ? slot.preview : null
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id
            ? {
                ...s,
                preEnhancePreview: keepCompare,
                preview: newPreview,
                file: nextFile,
                workingBlob: enhanced,
                uploading: true,
                error: false,
              }
            : s
        )
      )
      await runUpload(slot.id, nextFile, newPreview)
    } catch {
      show(t('common_error'), 'error')
    }
  }

  const onRemoveBg = async (slot: Slot) => {
    const base = slot.file
    if (!base || slot.uploading || slot.url || slot.removingBg) return
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, removingBg: true, removeBgProgress: 0 } : s))
    )
    try {
      const blob = slot.workingBlob ?? base
      const cutout = await removeBackground(blob, (p) => {
        setSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, removeBgProgress: Math.round(p * 100) } : s))
        )
      })
      const jpeg = await compressImage(cutout, 1200, 0.9)
      const wmLabel = watermarkSellerLabel?.trim()
        ? `قبو | ${watermarkSellerLabel.trim()}`
        : 'قبو'
      const watermarked = await addWatermark(jpeg, {
        label: wmLabel,
        angleDeg: -30,
        centerOpacity: 0.15,
      })
      const nextFile = await blobToJpegFile(watermarked, base.name)
      const newPreview = URL.createObjectURL(watermarked)
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id
            ? {
                ...s,
                preview: newPreview,
                file: nextFile,
                workingBlob: watermarked,
                uploading: true,
                error: false,
                removingBg: false,
                removeBgProgress: 0,
              }
            : s
        )
      )
      await runUpload(slot.id, nextFile, newPreview)
    } catch {
      show(t('common_error'), 'error')
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, removingBg: false, removeBgProgress: 0 } : s))
      )
    }
  }

  const atMax = slots.length >= MAX_FILES
  const anyUploading = slots.some((s) => s.uploading)
  const anyRemoving = slots.some((s) => s.removingBg)

  return (
    <div className="space-y-3" dir="rtl">
      <label className="block text-sm font-medium text-[#1F2937] dark:text-slate-200">
        {t('imageUploader_label')}
      </label>
      <p className="text-xs text-gray-500 dark:text-slate-400">{t('imageUploader_hint')}</p>
      {anyUploading && (
        <p className="text-xs font-semibold text-[#1B7F7A] dark:text-slate-200">
          {t('imageUploader_uploading')}
        </p>
      )}
      {anyRemoving && (
        <p className="text-xs font-semibold text-[#FF8C42] dark:text-slate-200">
          {t('imageUploader_removingBg')} {slots.find((s) => s.removingBg)?.removeBgProgress ?? 0}%
        </p>
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

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f?.type.startsWith('image/')) void handleFile(f)
        }}
        onClick={() => !atMax && fileInputRef.current?.click()}
        className={
          'flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1B7F7A]/35 bg-[#E6F4F3]/40 px-4 py-8 text-center transition-colors hover:bg-[#E6F4F3]/70 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:bg-slate-800 ' +
          (atMax ? 'pointer-events-none opacity-50' : '')
        }
      >
        <span className="text-sm font-bold text-[#1B7F7A] dark:text-slate-200">{t('imageUploader_drop')}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {slots.map((s, index) => (
          <div
            key={s.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url || s.preview}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {s.preEnhancePreview && !s.url && (
              <div className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[9px] text-white">
                {t('imageUploader_compare')}
              </div>
            )}
            {s.uploading && !s.removingBg && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
              </div>
            )}
            {s.removingBg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 p-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                <p className="text-center text-[10px] font-bold text-white">
                  {t('imageUploader_removingBg')}
                </p>
                <p className="text-[10px] font-semibold text-white/90">{s.removeBgProgress}%</p>
              </div>
            )}
            {s.error && !s.uploading && !s.removingBg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 p-1">
                <span className="text-center text-[10px] font-bold text-white">
                  {t('imageUploader_fail')}
                </span>
                <button
                  type="button"
                  onClick={() => void retrySlot(s)}
                  className="rounded-lg bg-[#FF8C42] px-2 py-1 text-[10px] font-bold text-white"
                >
                  {t('common_retry')}
                </button>
              </div>
            )}
            {!s.uploading && !s.removingBg && s.file && !s.url && (
              <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void onEnhance(s)}
                    className="flex flex-1 items-center justify-center gap-0.5 rounded-lg bg-[#1B7F7A]/90 py-1 text-[10px] font-bold text-white"
                  >
                    <Sun className="h-3.5 w-3.5" weight="bold" />
                    {t('imageUploader_enhance')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onRemoveBg(s)}
                    className="flex flex-1 items-center justify-center gap-0.5 rounded-lg bg-[#FF8C42]/95 py-1 text-[10px] font-bold text-white"
                  >
                    <Eraser className="h-3.5 w-3.5" weight="bold" />
                    {t('imageUploader_removeBg')}
                  </button>
                </div>
              </div>
            )}
            {!s.uploading && !s.removingBg && (
              <button
                type="button"
                onClick={() => void removeSlot(s)}
                className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
                aria-label={t('common_delete')}
              >
                ✕
              </button>
            )}
            {index === 0 && (
              <span className="absolute inset-x-0 bottom-0 bg-[#1B7F7A]/95 py-0.5 text-center text-[10px] font-bold text-white">
                {t('imageUploader_main')}
              </span>
            )}
            {s.dna && s.url && (
              <span
                className="absolute bottom-7 inset-x-0 truncate bg-black/50 px-1 text-[8px] text-white/90"
                title={s.dna}
              >
                {t('imageUploader_dna')}: {s.dna.slice(0, 8)}…
              </span>
            )}
          </div>
        ))}

        {!atMax && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-[#1B7F7A]/40 bg-[#E6F4F3]/50 px-1 text-center text-xs font-medium leading-tight text-[#1B7F7A] transition-colors hover:bg-[#E6F4F3] dark:border-slate-500 dark:bg-slate-800/50 dark:text-slate-200"
          >
            + {t('imageUploader_add')}
          </button>
        )}
      </div>
    </div>
  )
}
