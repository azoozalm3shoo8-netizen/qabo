/**
 * Lightweight category hints from product title (no TensorFlow).
 * classifyImage reads `alt` on the passed element — set `alt` to the title before calling.
 */

const RULES: { keys: string[]; category: string }[] = [
  {
    keys: [
      'آيفون',
      'ايفون',
      'iphone',
      'سامسونج',
      'samsung',
      'لابتوب',
      'laptop',
      'ماك',
      'mac',
      'تابلت',
      'ipad',
      'هاتف',
      'جوال',
      'شاومي',
      'xiaomi',
      'هواوي',
      'huawei',
    ],
    category: 'إلكترونيات',
  },
  {
    keys: ['بي ام', 'bmw', 'مرسيدس', 'تويوتا', 'toyota', 'سيارة', 'سيارات', 'هوندا', 'نيسان', 'لكزس'],
    category: 'سيارات',
  },
  {
    keys: ['شقة', 'فيلا', 'أرض', 'عقار', 'دوبلكس', 'استراحة', 'مكتب', 'محل'],
    category: 'عقارات',
  },
  {
    keys: ['قميص', 'فستان', 'حذاء', 'جاكيت', 'أزياء', 'ملابس', 'شنطة', 'نظارة شمس'],
    category: 'أزياء',
  },
  {
    keys: ['ساعة', 'رولكس', 'rolex', 'كارتير', 'omega', 'ساعات'],
    category: 'ساعات',
  },
  {
    keys: ['كنب', 'طاولة', 'كرسي', 'أثاث', 'سرير', 'خزانة', 'مكتب خشب'],
    category: 'أثاث',
  },
  {
    keys: ['دراجة', 'رياضة', 'كرة', 'جيم', 'dumbbell', 'سكيت', 'tennis', 'سباحة'],
    category: 'رياضة',
  },
  {
    keys: ['كتاب', 'رواية', 'مجلة', 'كتب'],
    category: 'كتب',
  },
]

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export function suggestCategoryFromTitle(title: string): string | null {
  const t = normalize(title)
  if (t.length < 3) return null
  for (const rule of RULES) {
    if (rule.keys.some((k) => t.includes(normalize(k)))) return rule.category
  }
  return null
}

export async function classifyImage(imageElement: HTMLImageElement): Promise<string> {
  const hint = imageElement.alt || ''
  return suggestCategoryFromTitle(hint) ?? ''
}
