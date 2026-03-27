/** فحص صورة عبر Hugging Face Inference API — Falconsai/nsfw_image_detection */

export async function huggingFaceNsfwImage(imageUrl: string): Promise<
  | { ok: true; label: string; score: number; raw: unknown }
  | { ok: false; error: string }
> {
  const token = process.env.HF_API_TOKEN
  if (!token) return { ok: false, error: 'HF_API_TOKEN غير مُعرّف' }

  try {
    const res = await fetch(
      'https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: imageUrl }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      const msg =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error: string }).error)
          : res.statusText
      return { ok: false, error: msg }
    }

    if (Array.isArray(data) && data[0] && typeof data[0] === 'object') {
      const scores = data[0] as Record<string, number>
      const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
      const [label, score] = entries[0] || ['unknown', 0]
      const safe = String(label).toLowerCase().includes('normal') || String(label).toLowerCase() === 'safe'
      return {
        ok: true,
        label: safe ? 'safe' : 'nsfw',
        score,
        raw: data,
      }
    }

    return { ok: true, label: 'unknown', score: 0, raw: data }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'فشل الطلب' }
  }
}
