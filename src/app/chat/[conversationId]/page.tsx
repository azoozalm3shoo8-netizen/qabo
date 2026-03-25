'use client'

import { useParams } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { ChatWindow } from '@/components/ChatWindow'

export default function ChatRoutePage() {
  const params = useParams()
  const conversationId = typeof params.conversationId === 'string' ? params.conversationId : ''

  if (!conversationId) return null

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F4F6] dark:bg-slate-900">
      <ChatWindow conversationId={conversationId} />
      <BottomNav active="home" />
    </div>
  )
}
