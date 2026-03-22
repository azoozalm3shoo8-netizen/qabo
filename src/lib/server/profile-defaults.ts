/** JSON shape for GET /api/profile when no row exists */
export function defaultProfileForApi(userId: string) {
  return {
    id: userId,
    full_name: null as string | null,
    phone: null as string | null,
    city: null as string | null,
    bio: null as string | null,
    avatar_url: null as string | null,
    is_verified: false,
    rating: null as number | null,
    total_reviews: 0,
    wallet_balance: 0,
    total_sales: 0,
    total_purchases: 0,
    created_at: null as string | null,
    updated_at: null as string | null,
  }
}

/** Base row for upsert when merging with partial PUT body */
export function baseProfileRowForUpsert(
  userId: string,
  existing: Record<string, unknown> | null
) {
  const e = existing ?? {}
  return {
    id: userId,
    full_name: (e.full_name as string | null | undefined) ?? 'مستخدم',
    phone: (e.phone as string | null | undefined) ?? null,
    city: (e.city as string | null | undefined) ?? '',
    bio: (e.bio as string | null | undefined) ?? '',
    avatar_url: (e.avatar_url as string | null | undefined) ?? null,
    is_verified: Boolean(e.is_verified),
    rating: (e.rating as number | null | undefined) ?? null,
    total_reviews: Number(e.total_reviews ?? 0),
    wallet_balance: Number(e.wallet_balance ?? 0),
    total_sales: Number(e.total_sales ?? 0),
    total_purchases: Number(e.total_purchases ?? 0),
    updated_at: new Date().toISOString(),
    ...(e.created_at ? { created_at: e.created_at } : {}),
  }
}

export function omitUndefined<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}
