'use client'

import { useEffect, useState } from 'react'
import { showToast } from '@/lib/toast'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      showToast.success('تم استعادة الاتصال')
    }
    const onOffline = () => {
      setIsOnline(false)
      showToast.error('لا يوجد اتصال بالإنترنت')
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return isOnline
}
