/**
 * تحليل إعلان بقواعد بسيطة — بدون API خارجي.
 */

export type ListingFeedback = {
  titleScore: number
  descriptionScore: number
  overallScore: number
  tips: string[]
  autoImprovements: { field: string; original: string; improved: string; reason: string }[]
}

export function analyzeListing(params: {
  title: string
  description: string
  category: string
  condition: string
  photoCount: number
  hasVideo360: boolean
  startingBidHalalas: number
}): ListingFeedback {
  const tips: string[] = []
  const autoImprovements: ListingFeedback['autoImprovements'] = []
  let titleScore = 100
  let descScore = 100

  if (params.title.length < 10) {
    titleScore -= 30
    tips.push('العنوان قصير — أضف الماركة والحالة')
  }
  if (params.title.length > 80) {
    titleScore -= 10
    tips.push('العنوان طويل — اختصره ليكون أوضح')
  }

  const cleanTitle = params.title.replace(/[!]{2,}/g, '!').replace(/\s{2,}/g, ' ').trim()
  if (cleanTitle !== params.title) {
    autoImprovements.push({
      field: 'title',
      original: params.title,
      improved: cleanTitle,
      reason: 'تنقية علامات الترقيم والمسافات',
    })
  }

  if (params.description.length < 30) {
    descScore -= 40
    tips.push('الوصف قصير — أضف الحالة والملحقات')
  } else if (params.description.length < 100) {
    descScore -= 15
    tips.push('أوصاف أطول تزيد ثقة المزايدين')
  }

  if (params.photoCount < 3) {
    tips.push(`لديك ${params.photoCount} صور — أضف زوايا متعددة`)
    descScore -= 10
  }

  if (params.hasVideo360) {
    tips.push('فيديو 360° يعزز الثقة')
  } else {
    tips.push('فيديو 360° يزيد وضوح المنتج')
  }

  if (params.startingBidHalalas <= 0) {
    tips.push('تأكد من سعر بداية صالح')
  }

  if (params.condition === 'poor' || params.condition === 'fair') {
    tips.push('اذكر العيوب بوضوح لتقليل النزاعات')
  }

  const overallScore = Math.round((titleScore + descScore) / 2)

  return {
    titleScore,
    descriptionScore: descScore,
    overallScore,
    tips,
    autoImprovements,
  }
}
