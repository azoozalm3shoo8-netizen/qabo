'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export type AuctionQuestionRow = {
  id: string
  auction_id: string
  asker_id: string
  question: string
  answer: string | null
  answered_by: string | null
  answered_at: string | null
  created_at: string
}

export function useAuctionQuestions(auctionId: string) {
  const [rows, setRows] = useState<AuctionQuestionRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!auctionId) return
    setLoading(true)
    try {
      const res = await fetch('/api/auction-questions?auction_id=' + encodeURIComponent(auctionId))
      const data = await res.json()
      if (Array.isArray(data)) setRows(data as AuctionQuestionRow[])
      else setRows([])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!auctionId) return
    const ch = supabase
      .channel('aq-' + auctionId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auction_questions',
          filter: 'auction_id=eq.' + auctionId,
        },
        () => void load()
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [auctionId, load])

  const ask = async (userId: string, question: string) => {
    const res = await fetch('/api/auction-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, auction_id: auctionId, question }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'فشل إرسال السؤال')
    await load()
    return data
  }

  const answer = async (userId: string, questionId: string, answerText: string) => {
    const res = await fetch('/api/auction-questions/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, question_id: questionId, answer: answerText }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'فشل الإجابة')
    await load()
    return data
  }

  return { rows, loading, reload: load, ask, answer }
}
