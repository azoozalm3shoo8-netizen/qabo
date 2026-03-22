/** Stable comparison for auth user id vs DB uuid (string casing / formatting) */
export function sameUserId(a: string | null | undefined, b: string | null | undefined) {
  if (a == null || b == null) return false
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
}
