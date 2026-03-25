'use client'

import { MapPin, PaperPlaneRight } from '@phosphor-icons/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/Toast'
import { useChat } from '@/hooks/useChat'
import { RIYADH_SAFE_POINTS, suggestMeetingPoint } from '@/lib/delivery-options'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { format } from 'date-fns'

export function ChatWindow({
  conversationId,
  productTitle,
  deliveryStatus,
  backHref = '/messages',
}: {
  conversationId: string
  productTitle?: string
  deliveryStatus?: string
  backHref?: string
}) {
  const { show } = useToast()
  const { userId, peer, auctionId, messages, loading, sendText } = useChat(conversationId)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const onSend = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await sendText(text)
      setText('')
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setSending(false)
    }
  }

  const shareLocation = () => {
    if (!navigator.geolocation) {
      show('المتصفح لا يدعم الموقع', 'error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`
        setText((t) => (t ? t + '\n' : '') + '📍 موقعي: ' + url)
      },
      () => show('تعذر الحصول على الموقع', 'error')
    )
  }

  const suggestMeet = () => {
    const seller = RIYADH_SAFE_POINTS[3]
    const buyer = RIYADH_SAFE_POINTS[5]
    const p = suggestMeetingPoint(seller.lat, seller.lng, buyer.lat, buyer.lng)
    const url = `https://www.google.com/maps?q=${p.lat},${p.lng}`
    setText(`نقطة تقاء مقترحة: ${p.name}\n${url}`)
  }

  if (loading || !peer) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-gray-500 dark:text-slate-400">
        جاري التحميل...
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#F3F4F6] dark:bg-slate-900" dir="rtl">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <p className="font-bold text-[#1F2937] dark:text-slate-100">{peer.full_name}</p>
        {productTitle ? <p className="text-xs text-gray-500 dark:text-slate-400">{productTitle}</p> : null}
        {deliveryStatus ? (
          <p className="mt-1 text-xs font-semibold text-[#1B7F7A] dark:text-slate-300">{deliveryStatus}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className="text-xs font-semibold text-[#1B7F7A] dark:text-slate-300"
            >
              ← رجوع
            </Link>
          ) : null}
          <Link href="/" className="text-xs font-semibold text-[#1B7F7A] dark:text-slate-300">
            الرئيسية
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((m) => {
          const mine = userId && m.sender_id === userId
          return (
            <div key={m.id} className={'flex ' + (mine ? 'justify-start' : 'justify-end')}>
              <div
                className={
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm ' +
                  (mine
                    ? 'rounded-br-sm bg-[#1B7F7A] text-white'
                    : 'rounded-bl-sm bg-white text-[#1F2937] shadow-sm dark:bg-slate-800 dark:text-slate-100')
                }
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={'mt-1 text-[10px] ' + (mine ? 'text-white/70' : 'text-gray-400')}>
                  {format(new Date(m.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={shareLocation}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-[#1F2937] dark:bg-slate-700 dark:text-slate-200"
          >
            <MapPin className="h-3.5 w-3.5" weight="bold" />
            موقع
          </button>
          <button
            type="button"
            onClick={suggestMeet}
            className="rounded-lg bg-[#E6F4F3] px-2 py-1 text-xs font-semibold text-[#1B7F7A] dark:bg-[#134e4a]/50 dark:text-slate-200"
          >
            اقتراح نقطة التقاء
          </button>
          {auctionId ? (
            <Link
              href={'/handover/' + encodeURIComponent(auctionId)}
              className="rounded-lg bg-[#FF8C42] px-2 py-1 text-xs font-bold text-white"
            >
              📦 بدء التسليم
            </Link>
          ) : null}
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void onSend()
              }
            }}
            placeholder="اكتب رسالة..."
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-[#F3F4F6] px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={sending || !text.trim()}
            onClick={() => void onSend()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B7F7A] text-white disabled:opacity-50"
            aria-label="إرسال"
          >
            <PaperPlaneRight className="h-5 w-5" weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}
