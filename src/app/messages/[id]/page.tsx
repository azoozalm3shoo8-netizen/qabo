'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomNav } from '@/components/BottomNav'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'

type Msg = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

type ChatPayload = {
  messages: Msg[]
  peer: { id: string; full_name: string; avatar_url: string | null }
  auction_id: string | null
}

export default function ChatPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const { show } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [peer, setPeer] = useState<{ id: string; full_name: string } | null>(null)
  const [auctionId, setAuctionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const load = useCallback(async () => {
    const stored = localStorage.getItem('qabo_user')
    if (!stored || !id) return
    const uid = JSON.parse(stored).user_id as string
    setUserId(uid)
    const res = await fetch('/api/messages/' + id + '?user_id=' + uid + '&mark_read=1')
    const data = (await res.json()) as ChatPayload & { error?: string }
    if (!res.ok) {
      show(data.error || 'تعذر التحميل', 'error')
      setLoading(false)
      return
    }
    setMessages(data.messages ?? [])
    setPeer(data.peer)
    setAuctionId(data.auction_id ?? null)
    setLoading(false)
    setTimeout(scrollBottom, 80)
  }, [id, show])

  useEffect(() => {
    if (!id) return
    const stored = localStorage.getItem('qabo_user')
    if (!stored) {
      window.location.href = '/auth/login'
      return
    }
    void load()
  }, [id, load])

  useEffect(() => {
    if (!id || !userId) return
    const ch = supabase
      .channel('msg-' + id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.' + id,
        },
        () => void load()
      )
      .subscribe()
    const poll = setInterval(() => void load(), 5000)
    return () => {
      void supabase.removeChannel(ch)
      clearInterval(poll)
    }
  }, [id, userId, load])

  useEffect(() => {
    scrollBottom()
  }, [messages.length])

  const send = async () => {
    if (!text.trim() || !userId || !id || !peer) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          sender_id: userId,
          receiver_id: peer.id,
          content: text.trim(),
          auction_id: auctionId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال')
      setText('')
      show('تم إرسال الرسالة', 'success')
      await load()
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : 'خطأ', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col pb-20" dir="rtl">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-3 py-3 flex items-center gap-3 shadow-sm">
        <Link
          href="/messages"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg"
        >
          →
        </Link>
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl shrink-0 border border-gray-200">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm truncate">{peer?.full_name ?? '...'}</h2>
          <p className="text-xs text-gray-500">متصل</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-10 h-10 border-4 border-[#1B7F7A] border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">ابدأ المحادثة بكتابة رسالة</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId
            return (
              <div key={m.id} className={'flex ' + (mine ? 'justify-start' : 'justify-end')}>
                <div
                  className={
                    'max-w-[82%] px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ' +
                    (mine
                      ? 'rounded-br-md bg-[#1B7F7A] text-white'
                      : 'rounded-bl-md bg-gray-200 text-gray-900')
                  }
                >
                  <p>{m.content}</p>
                  <p
                    className={
                      'mt-1 text-[10px] ' + (mine ? 'text-teal-100' : 'text-gray-500')
                    }
                  >
                    {format(new Date(m.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-16 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 p-3 flex gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالة..."
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full outline-none text-sm focus:ring-2 focus:ring-[#1B7F7A]"
          onKeyDown={(e) => e.key === 'Enter' && void send()}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !text.trim() || !peer}
          className="w-11 h-11 rounded-full bg-[#1B7F7A] text-white flex items-center justify-center shadow-md disabled:opacity-40"
        >
          ➤
        </button>
      </div>

      <BottomNav active="messages" />
    </div>
  )
}
