/**
 * إشعارات المزايدة والصفقات (تجاوز، فوز، إغلاق، دفع، شحن…) — طبقة موحّدة فوق `insertFinancialNotification`.
 * إشعارات مالية خام أخرى (ضمان، استرداد) يمكن الإبقاء عليها من `financial-notifications` مباشرة حيث يلزم.
 */
import 'server-only'

import { insertFinancialNotification } from '@/lib/server/financial-notifications'
import { createClient } from '@/lib/supabase-server'

export async function createNotification(params: {
  userId: string
  type: string
  title: string
  body?: string
  link?: string
  auctionId?: string
  dealId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = createClient()
  const data: Record<string, unknown> = { ...(params.metadata ?? {}) }
  if (params.link) data.link = params.link
  await insertFinancialNotification(supabase, {
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? '',
    auction_id: params.auctionId,
    deal_id: params.dealId,
    data: Object.keys(data).length ? data : undefined,
  })
}

export async function notifyOutbid(userId: string, auctionId: string, auctionTitle: string) {
  return createNotification({
    userId,
    type: 'outbid',
    title: `تم تجاوزك في «${auctionTitle.slice(0, 80)}»`,
    body: 'زايد مرة أخرى للبقاء في المقدمة',
    link: `/auction/${auctionId}`,
    auctionId,
  })
}

export async function notifyWin(userId: string, auctionId: string, auctionTitle: string) {
  return createNotification({
    userId,
    type: 'win',
    title: `🎉 مبروك! فزت بـ «${auctionTitle.slice(0, 80)}»`,
    body: 'ادفع الآن لإتمام الصفقة',
    link: `/auction/${auctionId}`,
    auctionId,
  })
}

export async function notifyPaymentReceived(
  sellerId: string,
  dealId: string,
  auctionId?: string
) {
  return createNotification({
    userId: sellerId,
    type: 'payment',
    title: 'تم استلام الدفعة',
    body: 'يرجى شحن القطعة خلال 3 أيام',
    link: `/orders/${dealId}`,
    auctionId,
    dealId,
  })
}

export async function notifyShipped(
  buyerId: string,
  dealId: string,
  trackingNumber: string,
  auctionId?: string
) {
  return createNotification({
    userId: buyerId,
    type: 'shipping',
    title: 'تم شحن قطعتك!',
    body: `رقم التتبع: ${trackingNumber}`,
    link: `/orders/${dealId}`,
    auctionId,
    dealId,
  })
}

export async function notifyInspection(userId: string, dealId: string, body?: string) {
  return createNotification({
    userId,
    type: 'inspection',
    title: 'فترة الفحص',
    body: body ?? 'لديك وقت لفحص القطعة وفق سياسة قبو',
    link: `/orders/${dealId}`,
    dealId,
  })
}

export async function notifyDisputeOpened(userId: string, dealId: string, body?: string) {
  return createNotification({
    userId,
    type: 'dispute',
    title: 'تم فتح نزاع',
    body: body ?? 'طلبك قيد المراجعة',
    link: `/orders/${dealId}`,
    dealId,
  })
}
