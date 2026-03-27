import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requirePermission, clientIp } from '@/lib/admin-guard'
import { logAdminAction } from '@/lib/audit'
import { geminiGenerateSummary } from '@/lib/ai-daily-report'

function startOfTodayUtc() {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function localArabicSummary(stats: {
  new_auctions_today: number
  new_users_today: number
  revenue_today: number
  pending_reports: number
}) {
  const parts = [
    `تقرير اليوم: ${stats.new_auctions_today} مزاداً جديداً`,
    `${stats.new_users_today} مستخدمين جدد`,
    `إيرادات تقريبية ${stats.revenue_today.toLocaleString('ar-SA')} ر.س`,
    stats.pending_reports > 0
      ? `${stats.pending_reports} بلاغات معلّقة تحتاج متابعة`
      : 'لا توجد بلاغات معلّقة',
    'المنصة تعمل بشكل طبيعي.',
  ]
  return parts.join('، ') + '.'
}

export async function GET(req: NextRequest) {
  const actorId = req.nextUrl.searchParams.get('user_id')
  const gate = await requirePermission(actorId, 'dashboard')
  if (!gate.ok) return gate.res

  const supabase = createClient()
  const sod = startOfTodayUtc()

  const [
    { count: new_auctions_today },
    { count: new_users_today },
    { count: pending_reports },
    { data: deliveredToday },
    { count: total_auctions },
    { count: active_auctions },
    { count: total_users },
    { count: total_orders },
  ] = await Promise.all([
    supabase.from('auctions').select('*', { count: 'exact', head: true }).gte('created_at', sod),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sod),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('product_amount').eq('status', 'delivered').gte('created_at', sod),
    supabase.from('auctions').select('*', { count: 'exact', head: true }),
    supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
  ])

  const revenue_today = (deliveredToday ?? []).reduce(
    (s, r) => s + Number((r as { product_amount: number }).product_amount ?? 0),
    0
  )

  const stats = {
    new_auctions_today: new_auctions_today ?? 0,
    new_users_today: new_users_today ?? 0,
    revenue_today: Math.round(revenue_today * 100) / 100,
    pending_reports: pending_reports ?? 0,
    total_auctions: total_auctions ?? 0,
    active_auctions: active_auctions ?? 0,
    total_users: total_users ?? 0,
    total_orders: total_orders ?? 0,
  }

  const statsBlock = `
مزادات جديدة اليوم: ${stats.new_auctions_today}
مستخدمون جدد اليوم: ${stats.new_users_today}
إيرادات اليوم (طلبات مكتملة): ${stats.revenue_today} ر.س
بلاغات معلّقة: ${stats.pending_reports}
إجمالي المزادات: ${stats.total_auctions} | نشطة: ${stats.active_auctions}
إجمالي المستخدمين: ${stats.total_users} | الطلبات: ${stats.total_orders}
`.trim()

  const prompt = `أنت محلل منصة مزادات عربية اسمها قبو. اكتب ملخصاً تنفيذياً قصيراً بالعربية (جملة أو جملتان) بناءً على الأرقام التالية. كن مهنياً وإيجابياً:\n\n${statsBlock}`

  const gen = await geminiGenerateSummary(prompt)
  const ai_summary = gen.ok ? gen.text : localArabicSummary(stats)

  await logAdminAction({
    actorId: actorId!,
    action: 'admin.ai.daily_report',
    ipAddress: clientIp(req),
  })

  return NextResponse.json({
    stats,
    ai_summary,
    ai_partial: !gen.ok,
  })
}
