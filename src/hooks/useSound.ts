'use client'

import { useCallback, useRef } from 'react'

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const play = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new Audio(src)
      audioRef.current.currentTime = 0
      void audioRef.current.play().catch(() => {})
    } catch {
      /* ignore */
    }
  }, [src])
  return { play }
}
