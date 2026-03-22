export function getUser() {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem('qabo_user')
  if (!data) return null
  try { return JSON.parse(data) } catch { return null }
}

export function logout() {
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
