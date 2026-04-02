import 'server-only'
import type { MoyasarPayment, MoyasarPayout, MoyasarToken } from '@/lib/types/financial-types'

export const MOYASAR_BASE = 'https://api.moyasar.com/v1'

function secretKey(): string {
  const k = process.env.MOYASAR_SECRET_KEY
  if (!k) throw new Error('MOYASAR_SECRET_KEY غير مضبوط')
  return k
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${secretKey()}:`).toString('base64')}`
}

export async function moyasarRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = path.startsWith('http') ? path : `${MOYASAR_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const init: RequestInit = {
    method,
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }
  if (body != null && method !== 'GET' && method !== 'DELETE') {
    init.body = JSON.stringify(body)
  }
  const res = await fetch(url, init)
  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Moyasar: رد غير JSON (${res.status})`)
  }
  if (!res.ok) {
    const msg =
      typeof json === 'object' && json !== null && 'message' in json
        ? String((json as { message: unknown }).message)
        : text || res.statusText
    throw new Error(`Moyasar ${res.status}: ${msg}`)
  }
  return json as T
}

export async function createAuthorization(params: {
  amount: number
  token: string
  description: string
  callbackUrl: string
  metadata?: Record<string, string>
  idempotencyId?: string
}): Promise<MoyasarPayment> {
  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: 'SAR',
    description: params.description,
    callback_url: params.callbackUrl,
    source: {
      type: 'token',
      token: params.token,
      manual: true,
      '3ds': true,
    },
    metadata: params.metadata ?? {},
  }
  const headers: Record<string, string> = {}
  if (params.idempotencyId) headers['Idempotency-Key'] = params.idempotencyId
  const url = `${MOYASAR_BASE}/payments`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const json = text ? (JSON.parse(text) as MoyasarPayment) : ({} as MoyasarPayment)
  if (!res.ok) {
    throw new Error(`Moyasar ${res.status}: ${text}`)
  }
  return json
}

export async function capturePayment(paymentId: string, amount?: number): Promise<MoyasarPayment> {
  const body: Record<string, unknown> = {}
  if (amount != null) body.amount = amount
  return moyasarRequest<MoyasarPayment>('POST', `/payments/${paymentId}/capture`, body)
}

export async function voidPayment(paymentId: string): Promise<MoyasarPayment> {
  return moyasarRequest<MoyasarPayment>('POST', `/payments/${paymentId}/void`, {})
}

export async function refundPayment(paymentId: string, amount?: number): Promise<MoyasarPayment> {
  const body: Record<string, unknown> = {}
  if (amount != null) body.amount = amount
  return moyasarRequest<MoyasarPayment>('POST', `/payments/${paymentId}/refund`, body)
}

export async function fetchPayment(paymentId: string): Promise<MoyasarPayment> {
  return moyasarRequest<MoyasarPayment>('GET', `/payments/${paymentId}`)
}

export async function createPaymentWithNewCard(params: {
  amount: number
  cardName: string
  cardNumber: string
  month: number
  year: number
  cvc: string
  manual: boolean
  saveCard: boolean
  callbackUrl: string
  description: string
  metadata?: Record<string, string>
}): Promise<MoyasarPayment> {
  return moyasarRequest<MoyasarPayment>('POST', '/payments', {
    amount: params.amount,
    currency: 'SAR',
    description: params.description,
    callback_url: params.callbackUrl,
    save_card: params.saveCard,
    source: {
      type: 'creditcard',
      name: params.cardName,
      number: params.cardNumber,
      month: params.month,
      year: params.year,
      cvc: params.cvc,
      manual: params.manual,
    },
    metadata: params.metadata ?? {},
  })
}

export async function fetchToken(tokenId: string): Promise<MoyasarToken> {
  return moyasarRequest<MoyasarToken>('GET', `/tokens/${tokenId}`)
}

export async function deleteToken(tokenId: string): Promise<void> {
  await moyasarRequest<unknown>('DELETE', `/tokens/${tokenId}`)
}

export async function createPayout(params: {
  sourceId: string
  amount: number
  iban: string
  beneficiaryName: string
  mobile: string
  city?: string
  country?: string
  purpose?: string
  comment: string
  metadata?: Record<string, string>
}): Promise<MoyasarPayout> {
  return moyasarRequest<MoyasarPayout>('POST', '/payouts', {
    source_id: params.sourceId,
    amount: params.amount,
    currency: 'SAR',
    purpose: params.purpose ?? 'payout',
    description: params.comment,
    destination: {
      type: 'iban',
      iban: params.iban,
      name: params.beneficiaryName,
      mobile: params.mobile,
      city: params.city ?? 'الرياض',
      country: params.country ?? 'SA',
    },
    metadata: params.metadata ?? {},
  })
}
