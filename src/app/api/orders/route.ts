import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUserId } from '@/lib/server/require-user'
import { round2 } from '@/lib/payment-breakdown'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type OrderRow = Record<string, unknown>

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: 'معرّف المستخدم غير صالح' }, { status: 400 })
  }

  const orderIdParam = req.nextUrl.searchParams.get('order_id')
  if (orderIdParam) {
    const { data: singleOrder, error: singleErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderIdParam)
      .maybeSingle()

    if (singleErr) {
      return NextResponse.json({ error: 'تعذر تحميل الطلب: ' + singleErr.message }, { status: 500 })
    }
    if (!singleOrder) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    }
    if (singleOrder.buyer_id !== userId && singleOrder.seller_id !== userId) {
      return NextResponse.json({ error: 'غير مصرّح بعرض هذا الطلب' }, { status: 403 })
    }

    const { data: auctionRow, error: auctionErr } = await supabase
      .from('auctions')
      .select('id, title, images, city, category, condition')
      .eq('id', singleOrder.auction_id as string)
      .maybeSingle()

    if (auctionErr) {
      return NextResponse.json({ error: 'تعذر تحميل المزاد: ' + auctionErr.message }, { status: 500 })
    }

    const { data: sellerProf, error: spErr } = await supabase
      .from('profiles')
      .select('full_name, city')
      .eq('id', singleOrder.seller_id as string)
      .maybeSingle()

    if (spErr) {
      return NextResponse.json({ error: 'تعذر تحميل بيانات البائع: ' + spErr.message }, { status: 500 })
    }

    const { data: buyerProf, error: bpErr } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', singleOrder.buyer_id as string)
      .maybeSingle()

    if (bpErr) {
      return NextResponse.json({ error: 'تعذر تحميل بيانات المشتري: ' + bpErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ...singleOrder,
      auction: auctionRow ?? null,
      seller_profile: sellerProf
        ? { full_name: sellerProf.full_name as string, city: (sellerProf.city as string | null) ?? null }
        : null,
      buyer_profile: buyerProf ? { full_name: buyerProf.full_name as string } : null,
    })
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'تعذر تحميل الطلبات: ' + error.message }, { status: 500 })
  }

  const list = orders ?? []
  const auctionIds = [...new Set(list.map((o) => o.auction_id as string))]

  let auctionMap = new Map<string, Record<string, unknown>>()
  if (auctionIds.length) {
    const { data: aucs, error: aErr } = await supabase
      .from('auctions')
      .select('id, title, images, city, category')
      .in('id', auctionIds)

    if (aErr) {
      return NextResponse.json({ error: 'تعذر تحميل بيانات المزادات: ' + aErr.message }, { status: 500 })
    }
    auctionMap = new Map((aucs ?? []).map((a) => [a.id as string, a as Record<string, unknown>]))
  }

  const enriched = list.map((o) => ({
    ...o,
    auction: auctionMap.get(o.auction_id as string) ?? null,
  }))

  return NextResponse.json(enriched)
}

export async function PATCH(req: NextRequest) {
  let body: {
    order_id?: string
    user_id?: string
    action?: string
    tracking_number?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const { order_id, user_id, action, tracking_number } = body
  if (!order_id || !isValidUserId(user_id) || !action) {
    return NextResponse.json({ error: 'بيانات ناقصة أو غير صالحة' }, { status: 400 })
  }

  const { data: order, error: fErr } = await supabase.from('orders').select('*').eq('id', order_id).maybeSingle()

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

  const status = String(order.status)

  if (action === 'mark_shipped') {
    if (order.seller_id !== user_id) {
      return NextResponse.json({ error: 'فقط البائع يمكنه تأكيد الشحن' }, { status: 403 })
    }
    if (!['captured', 'paid'].includes(status)) {
      return NextResponse.json({ error: 'لا يمكن الشحن إلا بعد اكتمال الدفع' }, { status: 400 })
    }

    const { data: updated, error: uErr } = await supabase
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: tracking_number?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .select()
      .single()

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    const { data: auc } = await supabase.from('auctions').select('title').eq('id', order.auction_id).maybeSingle()
    const title = (auc?.title && String(auc.title).trim()) || 'مزاد'

    await supabase.from('notifications').insert({
      user_id: order.buyer_id,
      type: 'order_shipped',
      title: 'تم شحن طلبك',
      message: `تم شحن طلبك: ${title}`,
      auction_id: order.auction_id,
    })

    return NextResponse.json(updated)
  }

  if (action === 'confirm_delivery') {
    if (order.buyer_id !== user_id) {
      return NextResponse.json({ error: 'فقط المشتري يمكنه تأكيد الاستلام' }, { status: 403 })
    }
    if (status !== 'shipped') {
      return NextResponse.json({ error: 'الطلب ليس في حالة شحن' }, { status: 400 })
    }

    const { data: existingPayout } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', order.seller_id)
      .eq('auction_id', order.auction_id)
      .eq('type', 'credit')
      .ilike('description', 'إيرادات مزاد%')
      .maybeSingle()

    if (!existingPayout) {
      const { data: seller, error: sErr } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', order.seller_id)
        .maybeSingle()

      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

      const { data: auc } = await supabase.from('auctions').select('title').eq('id', order.auction_id).maybeSingle()
      const auctionTitle = (auc?.title && String(auc.title).trim()) || 'مزاد'
      const credit = round2(Number(order.product_amount))
      const prevBal = round2(Number(seller?.wallet_balance ?? 0))
      const newBal = round2(prevBal + credit)

      const { error: tErr } = await supabase.from('wallet_transactions').insert({
        user_id: order.seller_id,
        amount: credit,
        balance_after: newBal,
        type: 'credit',
        description: `إيرادات مزاد: ${auctionTitle}`,
        auction_id: order.auction_id,
      })

      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })

      const { error: wErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBal })
        .eq('id', order.seller_id)

      if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })
    }

    const { data: updated, error: u2Err } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .select()
      .single()

    if (u2Err) return NextResponse.json({ error: u2Err.message }, { status: 500 })

    const { data: auc2 } = await supabase.from('auctions').select('title').eq('id', order.auction_id).maybeSingle()
    const title2 = (auc2?.title && String(auc2.title).trim()) || 'مزاد'

    await supabase.from('notifications').insert({
      user_id: order.seller_id,
      type: 'order_delivered',
      title: 'تم تأكيد الاستلام',
      message: `تم تأكيد استلام الطلب: ${title2}`,
      auction_id: order.auction_id,
    })

    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
}
