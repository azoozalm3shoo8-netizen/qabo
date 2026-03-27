/** ملخص نصي عبر Gemini (Google AI) */

export async function geminiGenerateSummary(prompt: string): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const key = process.env.GOOGLE_AI_KEY
  if (!key) return { ok: false, error: 'GOOGLE_AI_KEY غير مُعرّف' }

  try {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' +
      encodeURIComponent(key)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt.slice(0, 12000) }] }],
      }),
    })

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      error?: { message?: string }
    }

    if (!res.ok) {
      return { ok: false, error: data.error?.message || res.statusText }
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) return { ok: false, error: 'لا يوجد نص في الرد' }

    return { ok: true, text }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل الطلب' }
  }
}
