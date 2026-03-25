import { readQaboUserFromStorage, type QaboUserLocal } from '@/lib/qabo-user'

export type { QaboUserLocal }

export function getUser(): QaboUserLocal | null {
  return readQaboUserFromStorage()
}

export function logout() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('qabo_user')
  window.location.href = '/auth/login'
}

export function requireAuth() {
  const user = getUser()
  if (!user) {
    window.location.href = '/auth/login'
    return null
  }
  return user
}
