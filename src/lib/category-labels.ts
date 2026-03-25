import type { TranslationKey } from '@/lib/translations'

export const CATEGORY_OPTIONS: { api: string; key: TranslationKey }[] = [
  { api: 'الكل', key: 'cat_all' },
  { api: 'إلكترونيات', key: 'cat_electronics' },
  { api: 'سيارات', key: 'cat_cars' },
  { api: 'عقارات', key: 'cat_realestate' },
  { api: 'أزياء', key: 'cat_fashion' },
  { api: 'ساعات', key: 'cat_watches' },
  { api: 'أثاث', key: 'cat_furniture' },
  { api: 'رياضة', key: 'cat_sports' },
  { api: 'كتب', key: 'cat_books' },
  { api: 'أخرى', key: 'cat_other' },
]
