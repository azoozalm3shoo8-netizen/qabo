'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { readQaboUserFromStorage } from '@/lib/qabo-user'

export type ChatMessage = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

type Peer = { id: string; full_name: string; avatar_url: string | null }

export function useChat(conversationId: string) {
  const [userId, setUserId] = useState<string | null>(null)
  const [peer, setPeer] = useState<Peer | null>(null)
  const [auctionId, setAuctionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const loadRef = useRef<() => Promise<void>>(async () => {})

  const load = useCallback(async () => {
    const u = readQaboUserFromStorage()
    if (!u || !conversationId) {
      setLoading(false)
      return
    }
    const uid = u.user_id
    setUserId(uid)
    const res = await fetch('/api/messages/' + conversationId + '?user_id=' + uid + '&mark_read=1')
    const data = (await res.json()) as {
      messages?: ChatMessage[]
      peer?: Peer
      auction_id?: string | null
      error?: string
    }
    if (!res.ok) {
      setLoading(false)
      throw new Error(data.error || 'load failed')
    }
    setMessages(data.messages ?? [])
    if (data.peer) setPeer(data.peer)
    setAuctionId(data.auction_id ?? null)
    setLoading(false)
  }, [conversationId])

  loadRef.current = load

  useEffect(() => {
    void load().catch(() => {
      setLoading(false)
    })
  }, [load])

  useEffect(() => {
    if (!conversationId || !userId) return
    const ch = supabase
      .channel('chat-' + conversationId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'conversation_id=eq.' + conversationId,
        },
        () => void loadRef.current()
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [conversationId, userId])

  const sendText = async (text: string) => {
    const u = readQaboUserFromStorage()
    if (!u || !peer || !conversationId) return
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: u.user_id,
        sender_id: u.user_id,
        receiver_id: peer.id,
        content: text.trim(),
        auction_id: auctionId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'send failed')
    await load()
  }

  return {
    userId,
    peer,
    auctionId,
    messages,
    loading,
    reload: load,
    sendText,
  }
}
