type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of store) {
      if (v.resetAt <= now) store.delete(k)
    }
  }, 60_000)
}

export function checkRateLimit(
  key: string,
  windowMs: number,
  max: number
): { allowed: boolean; retryAfter?: number } {
  ensureCleanup()
  const now = Date.now()
  let e = store.get(key)
  if (!e || e.resetAt <= now) {
    e = { count: 1, resetAt: now + windowMs }
    store.set(key, e)
    return { allowed: true }
  }
  if (e.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((e.resetAt - now) / 1000) }
  }
  e.count += 1
  return { allowed: true }
}
