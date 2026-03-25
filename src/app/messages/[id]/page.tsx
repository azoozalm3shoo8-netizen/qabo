'use client'

import { useParams } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { ChatWindow } from '@/components/ChatWindow'

export default function MessagesThreadPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  if (!id) return null

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F4F6] pb-20 dark:bg-slate-900">
      <ChatWindow conversationId={id} backHref="/messages" />
      <BottomNav active="home" />
    </div>
  )
}
