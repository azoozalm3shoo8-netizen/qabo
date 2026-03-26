/** استبدل المعرف بمعرف المشرف الحقيقي في Supabase */
export const ADMIN_USER_IDS: string[] = ['c426f83d-0674-40ba-a902-0198aafcb634']

export const ADMIN_IDS = new Set<string>(ADMIN_USER_IDS)

export function isAdminUserId(userId: string | null | undefined): boolean {
  return Boolean(userId && ADMIN_IDS.has(userId))
}
