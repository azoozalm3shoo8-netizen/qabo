'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CheckoutIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]" dir="rtl">
      <div className="animate-spin w-10 h-10 border-4 border-[#1B7F7A] border-t-transparent rounded-full" />
    </div>
  )
}
