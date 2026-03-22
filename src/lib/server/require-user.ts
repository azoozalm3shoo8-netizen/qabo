import { NextResponse } from 'next/server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUserId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && UUID_RE.test(id.trim())
}

export function unauthorized() {
  return NextResponse.json({ error: 'يجب تسجيل الدخول' }, { status: 401 })
}
