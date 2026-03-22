'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

export function FavoriteHeart({
  auctionId,
  userId,
  className = '',
}: {
  auctionId: string
  userId: string | null
  className?: string
}) {
  const { show } = useToast()
  const [on, setOn] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!userId) {
      setOn(false)
      return
    }
    const res = await fetch(
      '/api/favorites?user_id=' + userId + '&auction_id=' + auctionId
    )
    const d = await res.json()
    setOn(Boolean(d.is_favorite))
  }, [userId, auctionId])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) {
      window.location.href = '/auth/login'
      return
    }
    setLoading(true)
    try {
      if (on) {
        const res = await fetch(
          '/api/favorites?user_id=' + userId + '&auction_id=' + auctionId,
          { method: 'DELETE' }
        )
        if (res.ok) {
          setOn(false)
          show('تمت الإزالة من المفضلة', 'success')
        }
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, auction_id: auctionId }),
        })
        if (res.ok) {
          setOn(true)
          show('أضيف إلى المفضلة', 'success')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return (
      <span
        className={'opacity-40 ' + className}
        aria-hidden
      >
        🤍
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => void toggle(e)}
      disabled={loading}
      className={
        'p-1.5 rounded-full bg-white/90 shadow-sm hover:scale-105 transition-transform disabled:opacity-50 ' +
        className
      }
      aria-label={on ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
    >
      <span className="text-lg">{on ? '❤️' : '🤍'}</span>
    </button>
  )
}
