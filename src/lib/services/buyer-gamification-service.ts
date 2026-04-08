import 'server-only'

import { createClient } from '@/lib/supabase-server'
import type { Badge, BuyerProfile, LeaderboardEntry, XPEvent } from '@/lib/types/buyer-gamification'

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysBetweenUtc(a: string, b: string): number {
  const t0 = Date.parse(a + 'T00:00:00.000Z')
  const t1 = Date.parse(b + 'T00:00:00.000Z')
  return Math.round((t1 - t0) / 86400000)
}

function levelFromXp(xp: number): { level: number; level_name: string } {
  if (xp >= 3000) return { level: 6, level_name: 'أسطورة' }
  if (xp >= 1500) return { level: 5, level_name: 'خبير' }
  if (xp >= 700) return { level: 4, level_name: 'محترف' }
  if (xp >= 300) return { level: 3, level_name: 'منافس' }
  if (xp >= 100) return { level: 2, level_name: 'مزايد' }
  return { level: 1, level_name: 'مستكشف' }
}

function parseBadges(raw: unknown): Badge[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((b) => b && typeof b === 'object' && typeof (b as Badge).id === 'string') as Badge[]
}

function hasBadge(badges: Badge[], id: string): boolean {
  return badges.some((b) => b.id === id)
}

function anonymizedName(userId: string): string {
  const h = userId.replace(/-/g, '')
  return `مزايد #${h.slice(-4).toUpperCase()}`
}

export async function getOrCreateBuyerProfile(userId: string): Promise<BuyerProfile> {
  const supabase = createClient()
  try {
    const { data: row, error } = await supabase.from('buyer_profiles').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error
    if (row) {
      return {
        ...row,
        badges: parseBadges(row.badges),
      } as BuyerProfile
    }
    const { data: created, error: insErr } = await supabase
      .from('buyer_profiles')
      .insert({ user_id: userId })
      .select('*')
      .single()
    if (insErr) throw insErr
    return { ...created, badges: parseBadges(created.badges) } as BuyerProfile
  } catch (e) {
    console.error('[getOrCreateBuyerProfile]', e)
    throw e instanceof Error ? e : new Error('فشل تحميل ملف المشتري')
  }
}

export async function updateStreak(userId: string): Promise<{ currentStreak: number; streakBroken: boolean }> {
  try {
    const profile = await getOrCreateBuyerProfile(userId)
    const today = utcDateString(new Date())
    const last = profile.last_activity_date
    let streak = profile.current_streak
    let broken = false
    if (!last) {
      streak = 1
    } else if (last === today) {
      /* unchanged */
    } else {
      const diff = daysBetweenUtc(last, today)
      if (diff === 1) streak += 1
      else {
        broken = diff > 1
        streak = 1
      }
    }
    return { currentStreak: streak, streakBroken: broken }
  } catch (e) {
    console.error('[updateStreak]', e)
    return { currentStreak: 0, streakBroken: false }
  }
}

/** يحسب الشارات الجديدة فقط — دون كتابة لقاعدة البيانات (تُدمج في awardXP). */
export async function checkAndAwardBadges(
  userId: string,
  event: XPEvent,
  metadata?: Record<string, unknown>,
  ctx?: {
    totalBidsAfter: number
    auctionsWonAfter: number
    badgesBefore: Badge[]
    streakAfter: number
  }
): Promise<Badge[]> {
  const supabase = createClient()
  const earned: Badge[] = []
  const now = new Date().toISOString()
  try {
    if (!ctx) return earned
    const badges = ctx.badgesBefore

    const push = (id: string, name_ar: string, icon: string) => {
      if (hasBadge(badges, id) || earned.some((e) => e.id === id)) return
      earned.push({ id, name_ar, icon, earned_at: now })
    }

    if (event === 'bid' && ctx.totalBidsAfter === 1) {
      push('first_bid', 'المزايد الأول', '🎯')
    }
    if (event === 'bid' && ctx.totalBidsAfter === 10) {
      push('active_bidder', 'مزايد نشط', '⚡')
    }
    if (event === 'win' && ctx.auctionsWonAfter === 1) {
      push('first_win', 'الفائز الأول', '🏆')
    }
    const saleHalalas = metadata?.salePriceHalalas != null ? Number(metadata.salePriceHalalas) : 0
    if (event === 'win' && saleHalalas >= 1_000_000) {
      push('big_spender', 'المستثمر الكبير', '💎')
    }
    if (event === 'deal_complete') {
      push('deal_closer', 'منجز الصفقات', '🤝')
    }
    if (ctx.streakAfter >= 7) {
      push('weekly_streak', 'أسبوع متواصل', '🔥')
    }

    const cat = metadata?.category != null ? String(metadata.category) : ''
    if (event === 'win' && cat) {
      const expertId = `category_expert_${cat}`
      if (!hasBadge(badges, expertId) && !earned.some((e) => e.id === expertId)) {
        const { count } = await supabase
          .from('auctions')
          .select('id', { count: 'exact', head: true })
          .eq('winner_id', userId)
          .eq('category', cat)
          .eq('status', 'sold')
        if ((count ?? 0) + 1 >= 3) {
          push(expertId, `خبير ${cat}`, '🎓')
        }
      }
    }

    return earned
  } catch (e) {
    console.error('[checkAndAwardBadges]', e)
    return earned
  }
}

export async function awardXP(
  userId: string,
  event: XPEvent,
  metadata?: Record<string, unknown>
): Promise<{
  xpGained: number
  newTotal: number
  leveledUp: boolean
  newLevel?: number
  newLevelName?: string
  badgesEarned: Badge[]
}> {
  const supabase = createClient()
  let xpGained = 0
  const badgesEarned: Badge[] = []

  try {
    const profile = await getOrCreateBuyerProfile(userId)
    let badges = [...profile.badges]
    const today = utcDateString(new Date())
    let streak = profile.current_streak
    let longest = profile.longest_streak
    let lastAct = profile.last_activity_date

    if (lastAct !== today) {
      if (!lastAct) {
        streak = 1
        xpGained += 15
      } else {
        const diff = daysBetweenUtc(lastAct, today)
        if (diff === 1) {
          streak += 1
          xpGained += 15
        } else {
          streak = 1
          xpGained += 15
        }
      }
      lastAct = today
      longest = Math.max(longest, streak)
    }

    let totalBids = profile.total_bids
    let auctionsWon = profile.auctions_won
    let auctionsWatched = profile.auctions_watched
    let lastBidDate = profile.last_bid_date

    if (event === 'bid') {
      xpGained += 10
      if (totalBids === 0) xpGained += 100
      totalBids += 1
      if (totalBids === 10) xpGained += 50
      lastBidDate = today
    } else if (event === 'win') {
      xpGained += 50
      if (auctionsWon === 0) xpGained += 100
      auctionsWon += 1
    } else if (event === 'deal_complete') {
      xpGained += 30
    } else if (event === 'watch') {
      xpGained += 5
      auctionsWatched += 1
    }

    if (streak >= 7 && !hasBadge(badges, 'weekly_streak')) {
      xpGained += 100
    }

    const newXp = profile.xp + xpGained
    const { level, level_name } = levelFromXp(newXp)
    const leveledUp = level > profile.level

    const newBadges = await checkAndAwardBadges(userId, event, metadata, {
      totalBidsAfter: totalBids,
      auctionsWonAfter: auctionsWon,
      badgesBefore: badges,
      streakAfter: streak,
    })
    for (const b of newBadges) {
      badges.push(b)
      badgesEarned.push(b)
    }

    const { error: upErr } = await supabase
      .from('buyer_profiles')
      .update({
        xp: newXp,
        level,
        level_name: level_name,
        total_bids: totalBids,
        auctions_won: auctionsWon,
        auctions_watched: auctionsWatched,
        current_streak: streak,
        longest_streak: longest,
        last_bid_date: lastBidDate,
        last_activity_date: lastAct,
        badges,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (upErr) {
      console.error('[awardXP] update', upErr.message)
      return { xpGained: 0, newTotal: profile.xp, leveledUp: false, badgesEarned: [] }
    }

    return {
      xpGained,
      newTotal: newXp,
      leveledUp,
      newLevel: leveledUp ? level : undefined,
      newLevelName: leveledUp ? level_name : undefined,
      badgesEarned,
    }
  } catch (e) {
    console.error('[awardXP]', e)
    return { xpGained: 0, newTotal: 0, leveledUp: false, badgesEarned: [] }
  }
}

export async function getBuyerLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const supabase = createClient()
  const cap = Math.min(100, Math.max(1, limit))
  try {
    const { data, error } = await supabase
      .from('buyer_profiles')
      .select('user_id, xp, level, level_name')
      .order('xp', { ascending: false })
      .limit(cap)

    if (error) {
      console.error('[getBuyerLeaderboard]', error.message)
      return []
    }

    return (data ?? []).map((row, i) => ({
      rank: i + 1,
      displayName: anonymizedName(row.user_id as string),
      xp: Number(row.xp ?? 0),
      level: Number(row.level ?? 1),
      levelName: String(row.level_name ?? 'مستكشف'),
    }))
  } catch (e) {
    console.error('[getBuyerLeaderboard]', e)
    return []
  }
}
