/** Google Perspective API — سمية النص */

export async function perspectiveAnalyze(text: string): Promise<
  | {
      ok: true
      scores: Record<string, number>
      raw: unknown
    }
  | { ok: false; error: string }
> {
  const key = process.env.PERSPECTIVE_API_KEY
  if (!key) return { ok: false, error: 'PERSPECTIVE_API_KEY غير مُعرّف' }

  try {
    const url =
      'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=' + encodeURIComponent(key)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: { text: text.slice(0, 3000) },
        languages: ['ar', 'en'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          PROFANITY: {},
          THREAT: {},
          IDENTITY_ATTACK: {},
        },
      }),
    })

    const data = (await res.json()) as {
      attributeScores?: Record<string, { summaryScore?: { value?: number } }>
      error?: { message?: string }
    }

    if (!res.ok) {
      return { ok: false, error: data.error?.message || res.statusText }
    }

    const scores: Record<string, number> = {}
    for (const [attr, v] of Object.entries(data.attributeScores ?? {})) {
      scores[attr] = v.summaryScore?.value ?? 0
    }

    return { ok: true, scores, raw: data }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل الطلب' }
  }
}
