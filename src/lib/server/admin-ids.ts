/** استبدل المعرف بمعرف المشرف الحقيقي في Supabase */
export const ADMIN_USER_IDS: string[] = ['00000000-0000-0000-0000-000000000000']

export const ADMIN_IDS = new Set<string>(ADMIN_USER_IDS)

export function isAdminUserId(userId: string | null | undefined): boolean {
  return Boolean(userId && ADMIN_IDS.has(userId))
}
