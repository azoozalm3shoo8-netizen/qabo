import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const mwRateStore = new Map<string, { count: number; resetAt: number }>()

function checkMwLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  let e = mwRateStore.get(key)
  if (!e || e.resetAt <= now) {
    mwRateStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (e.count >= max) return false
  e.count += 1
  return true
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.moyasar.com https://*.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://cdn.moyasar.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' https: data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.moyasar.com https://*.googleapis.com https://firebase.googleapis.com https://*.firebaseio.com",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')

  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  const path = req.nextUrl.pathname
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const rules: { prefix: string; max: number; windowMs: number }[] = [
    { prefix: '/api/auth/email-otp/send', max: 3, windowMs: 300_000 },
    { prefix: '/api/auth/email-otp/verify', max: 10, windowMs: 300_000 },
    { prefix: '/api/auth/verify-otp', max: 5, windowMs: 300_000 },
    { prefix: '/api/payments/create', max: 5, windowMs: 600_000 },
    { prefix: '/api/payments/create-charge', max: 5, windowMs: 600_000 },
  ]

  for (const r of rules) {
    if (path === r.prefix || path.startsWith(r.prefix + '/')) {
      if (!checkMwLimit(`mw:${r.prefix}:${ip}`, r.max, r.windowMs)) {
        return NextResponse.json(
          { error: 'طلبات كثيرة. حاول بعد قليل.', error_en: 'Too many requests' },
          { status: 429 }
        )
      }
      break
    }
  }

  if (mwRateStore.size > 12_000) {
    const now = Date.now()
    for (const [k, v] of mwRateStore) {
      if (now > v.resetAt) mwRateStore.delete(k)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)'],
}
