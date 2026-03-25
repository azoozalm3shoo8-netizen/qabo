'use client'

import type { QaboUserLocal } from '@/lib/qabo-user'
import { readQaboUserFromStorage } from '@/lib/qabo-user'
import { supabase } from '@/lib/supabase/client'

export type { QaboUserLocal }

export function getCurrentUser(): QaboUserLocal | null {
  return readQaboUserFromStorage()
}

export function isLoggedIn(): boolean {
  return Boolean(readQaboUserFromStorage()?.user_id)
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('qabo_user')
  window.location.href = '/auth/login'
}

export async function getSupabaseUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}
