import 'server-only'

import { createClient } from '@/lib/supabase-server'
import type { ResponsivenessData } from '@/lib/types/seller-responsiveness'

export async function calculateSellerResponsiveness(sellerId: string): Promise<ResponsivenessData> {
  const empty: ResponsivenessData = {
    avgResponseMinutes: 0,
    responseRate: 0,
    totalQuestions: 0,
    answeredQuestions: 0,
    badge: 'none',
    badge_ar: '',
  }

  const supabase = createClient()
  try {
    const { data: auctions, error: aErr } = await supabase
      .from('auctions')
      .select('id')
      .eq('seller_id', sellerId)

    if (aErr) {
      console.error('[calculateSellerResponsiveness] auctions', aErr.message)
      return empty
    }

    const ids = (auctions ?? []).map((r) => r.id as string).filter(Boolean)
    if (!ids.length) return empty

    const { data: questions, error: qErr } = await supabase
      .from('auction_questions')
      .select('id, created_at, answer, answered_at')
      .in('auction_id', ids)

    if (qErr) {
      console.error('[calculateSellerResponsiveness] questions', qErr.message)
      return empty
    }

    const rows = questions ?? []
    const totalQuestions = rows.length
    if (totalQuestions === 0) return empty

    const answered = rows.filter(
      (q) => q.answer != null && String(q.answer).trim() !== '' && q.answered_at
    )
    const answeredQuestions = answered.length
    const responseRate = answeredQuestions / totalQuestions

    let sumMin = 0
    let n = 0
    for (const q of answered) {
      const t0 = q.created_at ? new Date(String(q.created_at)).getTime() : NaN
      const t1 = q.answered_at ? new Date(String(q.answered_at)).getTime() : NaN
      if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 < t0) continue
      sumMin += (t1 - t0) / 60000
      n += 1
    }
    const avgResponseMinutes = n > 0 ? sumMin / n : 0

    let badge: ResponsivenessData['badge'] = 'none'
    let badge_ar = ''
    if (responseRate >= 0.9 && avgResponseMinutes < 60) {
      badge = 'fast'
      badge_ar = '⚡ بائع سريع الرد'
    } else if (responseRate >= 0.7 && avgResponseMinutes < 360) {
      badge = 'good'
      badge_ar = '✅ بائع متجاوب'
    } else if (responseRate >= 0.5) {
      badge = 'slow'
      badge_ar = 'بائع'
    }

    return {
      avgResponseMinutes: Math.round(avgResponseMinutes * 10) / 10,
      responseRate: Math.round(responseRate * 1000) / 1000,
      totalQuestions,
      answeredQuestions,
      badge,
      badge_ar,
    }
  } catch (e) {
    console.error('[calculateSellerResponsiveness]', e)
    return empty
  }
}
