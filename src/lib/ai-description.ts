const BANNED_AR = [
  'حرام',
  'مخدرات',
  'خمر',
  'قمار',
  'سلاح',
  'ذخيرة',
  'مسدس',
  'بندقية',
  'متفجرات',
  'مسروق',
  'مزور',
  'مقلد',
  'عري',
  'إباحي',
  'جنسي',
  'تحرش',
  'عنصري',
  'إرهاب',
  'احتيال',
  'نصب',
  'غش',
]

const BANNED_EN = [
  'drug',
  'weapon',
  'gun',
  'bomb',
  'stolen',
  'fake',
  'counterfeit',
  'nude',
  'porn',
  'sex',
  'terrorist',
  'scam',
  'fraud',
]

export function containsBannedWords(text: string): boolean {
  const t = text.toLowerCase()
  if (BANNED_AR.some((w) => text.includes(w))) return true
  if (BANNED_EN.some((w) => t.includes(w))) return true
  return false
}

function localFallback(title: string, condition: string): string {
  const cond =
    condition === 'new'
      ? 'جديد'
      : condition === 'refurbished'
        ? 'مجدد'
        : 'مستعمل'
  return `${title.trim()} — حالة السلعة: ${cond}. يرجى مراجعة الصور والتفاصيل قبل المزايدة. السلعة المعروضة للبيع كما هي دون ضمان من المنصة.`
}

export async function generateProductDescription(input: {
  title: string
  condition: string
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const title = input.title.trim()
  if (title.length < 3) return { ok: false, error: 'العنوان قصير جداً' }
  if (!input.condition) return { ok: false, error: 'اختر الحالة أولاً' }
  if (containsBannedWords(title)) return { ok: false, error: 'العنوان يحتوي على كلمات غير مسموحة' }

  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    return { ok: true, text: localFallback(title, input.condition) }
  }

  const prompt = `اكتب وصفاً للبيع بالعربية لسلعة بعنوان: "${title}" وحالتها: ${input.condition}.
قواعد: 3 إلى 5 أسطر فقط، لغة موضوعية، بدون أسعار، بدون مبالغة، بدون وعود قانونية.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://qabboo.com',
        'X-Title': 'Qabboo',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 400,
      }),
    })
    if (!res.ok) {
      return { ok: true, text: localFallback(title, input.condition) }
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const text = data.choices?.[0]?.message?.content?.trim() || ''
    if (!text) return { ok: true, text: localFallback(title, input.condition) }
    if (containsBannedWords(text)) {
      return { ok: false, error: 'الناتج يحتوي كلمات غير مسموحة — جرّب صياغة أخرى' }
    }
    return { ok: true, text }
  } catch {
    return { ok: true, text: localFallback(title, input.condition) }
  }
}
