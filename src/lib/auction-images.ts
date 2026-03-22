/** Normalize auction.images from API (array, null, or rare string forms) into URL strings */
export function normalizeAuctionImages(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean)
  }
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return []
    if (t.startsWith('[')) {
      try {
        const p = JSON.parse(t) as unknown
        if (Array.isArray(p)) return p.map((x) => String(x).trim()).filter(Boolean)
      } catch {
        /* fall through */
      }
    }
    if (t.startsWith('{') && t.endsWith('}')) {
      const inner = t.slice(1, -1).trim()
      if (!inner) return []
      return inner
        .split(',')
        .map((s) => s.replace(/^"(.*)"$/, '$1').trim())
        .filter(Boolean)
    }
    return [t]
  }
  return []
}
