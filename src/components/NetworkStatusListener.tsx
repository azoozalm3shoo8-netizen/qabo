'use client'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export function NetworkStatusListener() {
  useNetworkStatus()
  return null
}
