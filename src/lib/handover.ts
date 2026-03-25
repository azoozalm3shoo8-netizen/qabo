import { v4 as uuidv4 } from 'uuid'

export type HandoverStatus = 'pending' | 'scanned' | 'confirmed' | 'disputed'

export interface HandoverSession {
  id: string
  auction_id: string
  seller_id: string
  buyer_id: string
  verification_code: string
  qr_data: string
  status: HandoverStatus
  created_at: string
}

export function generateHandoverCode(): { code: string; qrData: string } {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const qrData = uuidv4()
  return { code, qrData }
}
