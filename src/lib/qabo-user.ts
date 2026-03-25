export type QaboUserLocal = {
  user_id: string
  email?: string
  name?: string
  phone?: string
}

export function readQaboUserFromStorage(): QaboUserLocal | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('qabo_user')
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const user_id = typeof o.user_id === 'string' ? o.user_id : null
    if (!user_id) return null
    return {
      user_id,
      email: typeof o.email === 'string' ? o.email : undefined,
      name: typeof o.name === 'string' ? o.name : undefined,
      phone: typeof o.phone === 'string' ? o.phone : undefined,
    }
  } catch {
    return null
  }
}
