/** فحص محتوى نصي/صوري/سمية — OpenAI + Hugging Face + Perspective مع fallback محلي */

import { containsBannedWords } from '@/lib/ai-description'
import { huggingFaceNsfwImage } from '@/lib/ai-image-check'
import { perspectiveAnalyze } from '@/lib/ai-perspective'

export type ModerationCategory = {
  category: string
  score: number
  flagged: boolean
}

export async function openAiModerateText(text: string): Promise<
  | { ok: true; flagged: boolean; categories: ModerationCategory[]; raw: unknown }
  | { ok: false; error: string }
> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { ok: false, error: 'OPENAI_API_KEY غير مُعرّف' }

  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: text.slice(0, 32000),
      }),
    })

    const data = (await res.json()) as {
      results?: Array<{
        flagged?: boolean
        categories?: Record<string, boolean>
        category_scores?: Record<string, number>
      }>
      error?: { message?: string }
    }

    if (!res.ok) {
      return { ok: false, error: data.error?.message || res.statusText }
    }

    const r = data.results?.[0]
    if (!r) return { ok: false, error: 'لا توجد نتيجة' }

    const categories: ModerationCategory[] = []
    const scores = r.category_scores ?? {}
    const flags = r.categories ?? {}
    for (const [category, score] of Object.entries(scores)) {
      categories.push({
        category,
        score,
        flagged: Boolean(flags[category]),
      })
    }

    return {
      ok: true,
      flagged: Boolean(r.flagged),
      categories: categories.sort((a, b) => b.score - a.score),
      raw: data,
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل الطلب' }
  }
}

export type ModerateTextResult = {
  flagged: boolean
  categories: ModerationCategory[]
  scores: Record<string, number>
  source: 'openai' | 'local'
}

/** OpenAI Moderation أو قائمة كلمات محظورة محلياً */
export async function moderateText(text: string): Promise<ModerateTextResult> {
  const trimmed = text.slice(0, 32000)
  const o = await openAiModerateText(trimmed)
  if (o.ok) {
    const scores: Record<string, number> = {}
    for (const c of o.categories) scores[c.category] = c.score
    return {
      flagged: o.flagged,
      categories: o.categories,
      scores,
      source: 'openai',
    }
  }
  const banned = containsBannedWords(trimmed)
  return {
    flagged: banned,
    categories: [
      {
        category: 'banned_keywords',
        score: banned ? 1 : 0,
        flagged: banned,
      },
    ],
    scores: { banned_keywords: banned ? 1 : 0 },
    source: 'local',
  }
}

export type ImageSafetyResult = {
  safe: boolean
  nsfw: boolean
  confidence: number
  source: 'huggingface' | 'none'
  message?: string
}

/** Hugging Face NSFW أو رسالة عند غياب المفتاح */
export async function checkImageSafety(imageUrl: string): Promise<ImageSafetyResult> {
  if (!process.env.HF_API_TOKEN) {
    return {
      safe: true,
      nsfw: false,
      confidence: 0,
      source: 'none',
      message: 'أضف HF_API_TOKEN في متغيرات البيئة',
    }
  }
  try {
    const r = await huggingFaceNsfwImage(imageUrl)
    if (!r.ok) {
      return {
        safe: true,
        nsfw: false,
        confidence: 0,
        source: 'none',
        message: r.error,
      }
    }
    const isSafe = r.label === 'safe'
    return {
      safe: isSafe,
      nsfw: !isSafe,
      confidence: r.score,
      source: 'huggingface',
    }
  } catch (e: unknown) {
    return {
      safe: true,
      nsfw: false,
      confidence: 0,
      source: 'none',
      message: e instanceof Error ? e.message : 'فشل الفحص',
    }
  }
}

export type ToxicityResult = {
  attributes: Record<string, number>
  source: 'perspective' | 'none'
  message?: string
}

/** Perspective API أو قيم فارغة */
export async function analyzeToxicity(text: string): Promise<ToxicityResult> {
  try {
    const r = await perspectiveAnalyze(text.slice(0, 3000))
    if (!r.ok) {
      return {
        attributes: {},
        source: 'none',
        message: r.error,
      }
    }
    return { attributes: r.scores, source: 'perspective' }
  } catch (e: unknown) {
    return {
      attributes: {},
      source: 'none',
      message: e instanceof Error ? e.message : 'فشل التحليل',
    }
  }
}
