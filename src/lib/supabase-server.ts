import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/** عميل Supabase بصلاحية الخدمة — للاستخدام في مسارات API فقط (يتجاوز RLS). */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createSupabaseClient(url, key)
}
