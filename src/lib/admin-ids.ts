/** استبدل المعرف بمعرف المشرف الحقيقي في Supabase */
export const ADMIN_USER_IDS: string[] = ['5bed5267-d662-4d29-91bb-f25276112d63']

export const ADMIN_IDS = new Set<string>(ADMIN_USER_IDS)

export function isAdminUserId(userId: string | null | undefined): boolean {
  return Boolean(userId && ADMIN_IDS.has(userId))
}
