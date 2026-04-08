export type ResponsivenessBadge = 'fast' | 'good' | 'slow' | 'none'

export type ResponsivenessData = {
  avgResponseMinutes: number
  responseRate: number
  totalQuestions: number
  answeredQuestions: number
  badge: ResponsivenessBadge
  badge_ar: string
}
