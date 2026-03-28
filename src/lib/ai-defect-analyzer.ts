/**
 * تحليل العيوب بـ Gemini — خادم فقط
 */

import fs from 'fs'
import { GoogleGenAI } from '@google/genai'
import type { Defect, DefectAnalysisResult } from '@/lib/video360-types'

export type { Defect, DefectAnalysisResult }

let lastCallTime = 0

const PROMPT = `أنت خبير فحص منتجات محترف. حلل هذه الصور الست لمنتج معروض للبيع في مزاد.
الصور مأخوذة من زوايا مختلفة (360 درجة).

المطلوب:
1. افحص كل صورة بدقة وابحث عن أي عيوب: خدوش، كسور، صدأ، بهتان لون، انبعاج، شروخ، بقع، أجزاء مفقودة، تآكل.
2. لكل عيب حدد: نوعه، شدته (minor/moderate/major)، موقعه التقريبي في الصورة، ووصف بالعربي.
3. قيّم الحالة العامة للمنتج.

أجب بـ JSON فقط بهذا الشكل بالضبط (بدون أي نص آخر):
{
  "defects": [
    {
      "frame_index": 0,
      "type": "خدش",
      "severity": "minor",
      "location": "الزاوية العلوية اليمنى",
      "description_ar": "خدش سطحي خفيف بطول 2 سم تقريباً",
      "bbox": {"x": 70, "y": 10, "w": 15, "h": 5}
    }
  ],
  "overall_condition": "جيد جداً",
  "condition_score": 82,
  "summary_ar": "المنتج في حالة جيدة جداً مع خدش سطحي بسيط لا يؤثر على الاستخدام"
}

إذا لم تجد عيوب، أرجع defects كمصفوفة فارغة [] مع condition_score 95-100 و overall_condition "ممتاز".
bbox هي نسب مئوية من أبعاد الصورة (x,y = نقطة البداية، w,h = العرض والارتفاع).
frame_index يشير إلى رقم الصورة من 0 إلى 5 بالترتيب الذي أُرسلت به الصور.`

function fallbackResult(): DefectAnalysisResult {
  return {
    defects: [],
    overall_condition: 'غير محدد',
    condition_score: 0,
    summary_ar: 'تعذر تحليل العيوب تلقائياً. يرجى فحص المنتج يدوياً.',
    ai_model: 'fallback',
  }
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch {
        return null
      }
    }
    return null
  }
}

function normalizeDefects(raw: unknown, indexMap: number[]): Defect[] {
  if (!Array.isArray(raw)) return []
  const out: Defect[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const batchIdx = typeof o.frame_index === 'number' ? o.frame_index : Number(o.frame_index)
    const globalIdx =
      Number.isFinite(batchIdx) && batchIdx >= 0 && batchIdx < indexMap.length
        ? indexMap[Math.floor(batchIdx)]
        : 0
    const sev = o.severity === 'major' || o.severity === 'moderate' || o.severity === 'minor' ? o.severity : 'minor'
    const bbox =
      o.bbox && typeof o.bbox === 'object'
        ? (() => {
            const b = o.bbox as Record<string, unknown>
            return {
              x: Number(b.x) || 0,
              y: Number(b.y) || 0,
              w: Number(b.w) || 0,
              h: Number(b.h) || 0,
            }
          })()
        : undefined
    out.push({
      frame_index: globalIdx,
      type: String(o.type || 'عيب'),
      severity: sev,
      location: String(o.location || ''),
      description_ar: String(o.description_ar || ''),
      bbox,
    })
  }
  return out
}

const CONDITION_SET = new Set(['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'سيء'])

export async function analyzeDefects(framePaths: string[]): Promise<DefectAnalysisResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key || framePaths.length === 0) {
    return fallbackResult()
  }

  const n = framePaths.length
  const indexMap: number[] = []
  for (let k = 0; k < 6; k++) {
    const idx = Math.min(n - 1, Math.round((k * Math.max(1, n - 1)) / 5))
    if (!indexMap.includes(idx)) indexMap.push(idx)
  }
  if (indexMap.length === 0) indexMap.push(0)
  const selectedPaths = indexMap.map((i) => framePaths[i])

  const waitTime = Math.max(0, 4000 - (Date.now() - lastCallTime))
  if (waitTime > 0) await new Promise((r) => setTimeout(r, waitTime))

  try {
    const ai = new GoogleGenAI({ apiKey: key })
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: PROMPT }]
    for (const p of selectedPaths) {
      const b64 = fs.readFileSync(p).toString('base64')
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: b64 } })
    }

    lastCallTime = Date.now()

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: 'user', parts }],
    })

    const text = response.text?.trim() || ''
    const parsed = parseJsonFromText(text) as Record<string, unknown> | null
    if (!parsed) {
      return { ...fallbackResult(), ai_model: 'gemini-2.5-flash-lite-parse-fail' }
    }

    const defects = normalizeDefects(parsed.defects, indexMap)
    let overall = String(parsed.overall_condition || 'جيد')
    if (!CONDITION_SET.has(overall)) overall = 'جيد'
    const condition_score = Math.min(100, Math.max(0, Number(parsed.condition_score) || 70))
    const summary_ar = String(parsed.summary_ar || '')

    return {
      defects,
      overall_condition: overall as DefectAnalysisResult['overall_condition'],
      condition_score,
      summary_ar,
      ai_model: 'gemini-2.5-flash-lite',
    }
  } catch {
    lastCallTime = Date.now()
    return fallbackResult()
  }
}

export function conditionForDatabase(
  overall: DefectAnalysisResult['overall_condition']
): 'unknown' | 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'سيء' {
  if (overall === 'غير محدد') return 'unknown'
  if (CONDITION_SET.has(overall)) return overall
  return 'unknown'
}
