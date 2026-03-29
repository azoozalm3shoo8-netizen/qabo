/**
 * قوائم فحص حسب فئة المنتج
 */

export interface ChecklistItem {
  id: string
  question_ar: string
  type: 'boolean' | 'select' | 'text' | 'date' | 'file' | 'number'
  required: boolean
  options?: { value: string; label_ar: string }[]
  hint_ar?: string
  icon: string
  validation?: {
    maxAge?: number
    fileTypes?: string[]
    maxFileSize?: number
    min?: number
    max?: number
  }
  showIf?: { itemId: string; value: unknown }
}

export interface CategoryChecklist {
  categoryId: string
  categoryName_ar: string
  icon: string
  color: string
  description_ar: string
  warningBanner_ar?: string
  items: ChecklistItem[]
}

function matchesShowIf(showIf: { itemId: string; value: unknown }, responses: Record<string, unknown>): boolean {
  const v = responses[showIf.itemId]
  if (v === showIf.value) return true
  if (typeof v === 'boolean' && showIf.value === true && v === true) return true
  if (typeof v === 'boolean' && showIf.value === false && v === false) return true
  return String(v) === String(showIf.value)
}

export function isChecklistItemVisible(item: ChecklistItem, responses: Record<string, unknown>): boolean {
  if (!item.showIf) return true
  return matchesShowIf(item.showIf, responses)
}

export const CATEGORY_CHECKLISTS: CategoryChecklist[] = [
  {
    categoryId: 'electronics',
    categoryName_ar: 'إلكترونيات',
    icon: 'DeviceMobile',
    color: '#3B82F6',
    description_ar: 'تأكد من ذكر الملحقات والضمان وحالة الشاشة بدقة.',
    items: [
      {
        id: 'elec_box',
        question_ar: 'هل يوجد الكرتون/العلبة الأصلية؟',
        type: 'boolean',
        required: true,
        icon: 'Package',
      },
      {
        id: 'elec_charger',
        question_ar: 'هل يوجد الشاحن الأصلي؟',
        type: 'boolean',
        required: true,
        icon: 'Lightning',
      },
      {
        id: 'elec_accessories',
        question_ar: 'الملحقات المتوفرة',
        type: 'text',
        required: false,
        hint_ar: 'سماعات، كيبل، حافظة...',
        icon: 'Plugs',
      },
      {
        id: 'elec_warranty',
        question_ar: 'حالة الضمان',
        type: 'select',
        required: true,
        options: [
          { value: 'yes', label_ar: 'نعم' },
          { value: 'no', label_ar: 'لا' },
          { value: 'expired', label_ar: 'منتهي' },
        ],
        icon: 'ShieldCheck',
      },
      {
        id: 'elec_warranty_doc',
        question_ar: 'صورة بطاقة الضمان',
        type: 'file',
        required: false,
        showIf: { itemId: 'elec_warranty', value: 'yes' },
        validation: { fileTypes: ['image/jpeg', 'image/png', 'application/pdf'], maxFileSize: 5 },
        icon: 'FileText',
      },
      {
        id: 'elec_battery',
        question_ar: 'حالة البطارية',
        type: 'select',
        required: false,
        options: [
          { value: 'excellent', label_ar: 'ممتازة 80%+' },
          { value: 'good', label_ar: 'جيدة 60–80%' },
          { value: 'fair', label_ar: 'مقبولة 40–60%' },
          { value: 'poor', label_ar: 'ضعيفة أقل من 40%' },
          { value: 'na', label_ar: 'لا ينطبق' },
        ],
        icon: 'BatteryFull',
      },
      {
        id: 'elec_screen',
        question_ar: 'هل توجد خدوش أو كسور في الشاشة؟',
        type: 'boolean',
        required: true,
        icon: 'Monitor',
      },
      {
        id: 'elec_functional',
        question_ar: 'هل جميع الأزرار والمنافذ تعمل؟',
        type: 'boolean',
        required: true,
        icon: 'Checks',
      },
    ],
  },
  {
    categoryId: 'cars',
    categoryName_ar: 'سيارات',
    icon: 'Car',
    color: '#EF4444',
    description_ar: 'أدخل بيانات الفحص والعداد بدقة لزيادة ثقة المشترين.',
    warningBanner_ar:
      'يُشترط فحص السيارة في مركز معتمد خلال آخر 30 يوم ورفع تقرير الفحص لقبول الإعلان',
    items: [
      {
        id: 'car_inspection',
        question_ar: 'هل تم فحص السيارة في مركز معتمد؟',
        type: 'boolean',
        required: true,
        icon: 'MagnifyingGlass',
      },
      {
        id: 'car_inspection_date',
        question_ar: 'تاريخ آخر فحص',
        type: 'date',
        required: true,
        showIf: { itemId: 'car_inspection', value: true },
        validation: { maxAge: 30 },
        icon: 'Calendar',
      },
      {
        id: 'car_inspection_report',
        question_ar: 'تقرير الفحص',
        type: 'file',
        required: true,
        showIf: { itemId: 'car_inspection', value: true },
        validation: { fileTypes: ['image/jpeg', 'image/png', 'application/pdf'], maxFileSize: 10 },
        hint_ar: 'PDF أو صورة من المركز المعتمد',
        icon: 'FileText',
      },
      {
        id: 'car_inspection_center',
        question_ar: 'اسم مركز الفحص',
        type: 'text',
        required: true,
        showIf: { itemId: 'car_inspection', value: true },
        icon: 'Buildings',
      },
      {
        id: 'car_mileage',
        question_ar: 'عداد الكيلومترات',
        type: 'number',
        required: true,
        validation: { min: 0, max: 999999 },
        icon: 'Gauge',
      },
      {
        id: 'car_mileage_photo',
        question_ar: 'صورة العداد',
        type: 'file',
        required: true,
        validation: { fileTypes: ['image/jpeg', 'image/png'], maxFileSize: 5 },
        icon: 'Camera',
      },
      {
        id: 'car_accidents',
        question_ar: 'حوادث سابقة',
        type: 'select',
        required: true,
        options: [
          { value: 'none', label_ar: 'لا حوادث' },
          { value: 'minor', label_ar: 'بسيط رش-سمكرة' },
          { value: 'major', label_ar: 'كبير هيكلي' },
        ],
        icon: 'WarningCircle',
      },
      {
        id: 'car_paint',
        question_ar: 'هل يوجد رش أو سمكرة؟',
        type: 'boolean',
        required: true,
        icon: 'PaintBrush',
      },
      {
        id: 'car_paint_panels',
        question_ar: 'القطع المرشوشة',
        type: 'text',
        required: false,
        showIf: { itemId: 'car_paint', value: true },
        hint_ar: 'مثال: الباب الأمامي الأيمن، الرفرف الخلفي',
        icon: 'ListBullets',
      },
      {
        id: 'car_tires',
        question_ar: 'حالة الإطارات',
        type: 'select',
        required: true,
        options: [
          { value: 'new', label_ar: 'جديدة' },
          { value: 'good', label_ar: 'جيدة' },
          { value: 'medium', label_ar: 'متوسطة' },
          { value: 'replace', label_ar: 'تحتاج تبديل' },
        ],
        icon: 'CircleDashed',
      },
      {
        id: 'car_istimara',
        question_ar: 'صورة الاستمارة',
        type: 'file',
        required: true,
        validation: { fileTypes: ['image/jpeg', 'image/png', 'application/pdf'], maxFileSize: 5 },
        icon: 'IdentificationCard',
      },
      {
        id: 'car_insurance',
        question_ar: 'تأمين ساري',
        type: 'boolean',
        required: false,
        icon: 'ShieldCheck',
      },
    ],
  },
  {
    categoryId: 'real_estate',
    categoryName_ar: 'عقارات',
    icon: 'House',
    color: '#8B5CF6',
    description_ar: 'وثّق الصك والمساحة والخدمات بشكل واضح.',
    items: [
      {
        id: 're_deed',
        question_ar: 'هل يوجد صكّ مسجّل أو صورة منه؟',
        type: 'boolean',
        required: true,
        icon: 'FileText',
      },
      {
        id: 're_area',
        question_ar: 'المساحة (م²)',
        type: 'number',
        required: true,
        validation: { min: 1, max: 999999 },
        icon: 'Ruler',
      },
      {
        id: 're_rooms',
        question_ar: 'عدد الغرف',
        type: 'number',
        required: true,
        validation: { min: 0, max: 50 },
        icon: 'Bed',
      },
      {
        id: 're_bathrooms',
        question_ar: 'عدد دورات المياه',
        type: 'number',
        required: true,
        validation: { min: 0, max: 30 },
        icon: 'Drop',
      },
      {
        id: 're_age',
        question_ar: 'عمر العقار (سنوات تقريباً)',
        type: 'number',
        required: true,
        validation: { min: 0, max: 200 },
        icon: 'Clock',
      },
      {
        id: 're_renovation',
        question_ar: 'هل تم تجديد أو صيانة كبيرة؟',
        type: 'boolean',
        required: true,
        icon: 'Hammer',
      },
      {
        id: 're_services',
        question_ar: 'الخدمات المتوفرة',
        type: 'text',
        required: false,
        hint_ar: 'مكيف، مصعد، موقف...',
        icon: 'Plugs',
      },
    ],
  },
  {
    categoryId: 'fashion',
    categoryName_ar: 'أزياء',
    icon: 'TShirt',
    color: '#EC4899',
    description_ar: 'اذكر الأصلية والمقاس وعدد مرات الاستخدام بصدق.',
    items: [
      {
        id: 'fash_original',
        question_ar: 'هل المنتج أصلي؟',
        type: 'boolean',
        required: true,
        icon: 'SealCheck',
      },
      {
        id: 'fash_receipt',
        question_ar: 'هل يوجد إيصال شراء؟',
        type: 'boolean',
        required: true,
        icon: 'Receipt',
      },
      {
        id: 'fash_receipt_photo',
        question_ar: 'صورة الإيصال',
        type: 'file',
        required: false,
        showIf: { itemId: 'fash_receipt', value: true },
        validation: { fileTypes: ['image/jpeg', 'image/png', 'application/pdf'], maxFileSize: 5 },
        icon: 'Camera',
      },
      {
        id: 'fash_size',
        question_ar: 'المقاس',
        type: 'text',
        required: true,
        icon: 'Scissors',
      },
      {
        id: 'fash_worn',
        question_ar: 'عدد مرات الاستخدام التقريبي',
        type: 'select',
        required: true,
        options: [
          { value: '0', label_ar: 'لم يُلبَس' },
          { value: '1-5', label_ar: '1–5' },
          { value: '5+', label_ar: 'أكثر من 5' },
        ],
        icon: 'CoatHanger',
      },
      {
        id: 'fash_defects',
        question_ar: 'ملاحظات على البقع أو التلف',
        type: 'text',
        required: false,
        hint_ar: 'اذكر أي بهتان أو بقع',
        icon: 'Warning',
      },
    ],
  },
  {
    categoryId: 'watches',
    categoryName_ar: 'ساعات',
    icon: 'Watch',
    color: '#F59E0B',
    description_ar: 'العلبة والأوراق تزيد من قيمة الساعة في المزاد.',
    items: [
      {
        id: 'watch_original',
        question_ar: 'هل الساعة أصلية؟',
        type: 'boolean',
        required: true,
        icon: 'SealCheck',
      },
      {
        id: 'watch_box',
        question_ar: 'هل توجد العلبة والأوراق؟',
        type: 'boolean',
        required: true,
        icon: 'Package',
      },
      {
        id: 'watch_service',
        question_ar: 'هل خضعت لصيانة مؤخراً؟',
        type: 'boolean',
        required: true,
        icon: 'Wrench',
      },
      {
        id: 'watch_service_date',
        question_ar: 'تاريخ آخر صيانة',
        type: 'date',
        required: false,
        showIf: { itemId: 'watch_service', value: true },
        icon: 'Calendar',
      },
      {
        id: 'watch_crystal',
        question_ar: 'حالة الزجاج',
        type: 'select',
        required: true,
        options: [
          { value: 'perfect', label_ar: 'بدون خدوش' },
          { value: 'light', label_ar: 'خدوش خفيفة' },
          { value: 'damaged', label_ar: 'تلف ظاهر' },
        ],
        icon: 'Circle',
      },
      {
        id: 'watch_accuracy',
        question_ar: 'دقة الحركة (تقريباً)',
        type: 'select',
        required: false,
        options: [
          { value: 'excellent', label_ar: 'ممتازة' },
          { value: 'good', label_ar: 'جيدة' },
          { value: 'unknown', label_ar: 'لم أقس' },
        ],
        icon: 'Clock',
      },
      {
        id: 'watch_serial_photo',
        question_ar: 'صورة الرقم التسلسلي',
        type: 'file',
        required: true,
        validation: { fileTypes: ['image/jpeg', 'image/png'], maxFileSize: 5 },
        icon: 'Camera',
      },
    ],
  },
  {
    categoryId: 'furniture',
    categoryName_ar: 'أثاث',
    icon: 'Armchair',
    color: '#10B981',
    description_ar: 'اذكر المادة والأبعاد التقريبية وخيارات التوصيل.',
    items: [
      {
        id: 'fur_material',
        question_ar: 'المادة الرئيسية',
        type: 'text',
        required: true,
        hint_ar: 'خشب، معدن، قماش...',
        icon: 'Cube',
      },
      {
        id: 'fur_age',
        question_ar: 'عمر الأثاث (سنوات)',
        type: 'number',
        required: true,
        validation: { min: 0, max: 100 },
        icon: 'Clock',
      },
      {
        id: 'fur_assembly',
        question_ar: 'هل يحتاج تركيب؟',
        type: 'boolean',
        required: true,
        icon: 'Wrench',
      },
      {
        id: 'fur_dimensions',
        question_ar: 'الأبعاد التقريبية (سم)',
        type: 'text',
        required: true,
        hint_ar: 'طول × عرض × ارتفاع',
        icon: 'Ruler',
      },
      {
        id: 'fur_stains',
        question_ar: 'هل توجد بقع أو خدوش؟',
        type: 'boolean',
        required: true,
        icon: 'Drop',
      },
      {
        id: 'fur_delivery',
        question_ar: 'هل التوصيل متاح؟',
        type: 'boolean',
        required: true,
        icon: 'Truck',
      },
    ],
  },
  {
    categoryId: 'general',
    categoryName_ar: 'عام / أخرى',
    icon: 'Star',
    color: '#6B7280',
    description_ar: 'قائمة عامة تناسب معظم المنتجات غير المصنّفة.',
    items: [
      {
        id: 'gen_condition',
        question_ar: 'حالة المنتج',
        type: 'select',
        required: true,
        options: [
          { value: 'new_sealed', label_ar: 'جديد مغلف' },
          { value: 'new_open', label_ar: 'جديد مفتوح' },
          { value: 'like_new', label_ar: 'كالجديد' },
          { value: 'good', label_ar: 'جيد' },
          { value: 'fair', label_ar: 'مقبول' },
          { value: 'parts', label_ar: 'للقطع' },
        ],
        icon: 'Package',
      },
      {
        id: 'gen_reason',
        question_ar: 'سبب البيع',
        type: 'text',
        required: false,
        icon: 'ChatText',
      },
      {
        id: 'gen_receipt',
        question_ar: 'هل يوجد إيصال أو فاتورة؟',
        type: 'boolean',
        required: true,
        icon: 'Receipt',
      },
      {
        id: 'gen_notes',
        question_ar: 'ملاحظات إضافية للمشترين',
        type: 'text',
        required: false,
        icon: 'NotePencil',
      },
    ],
  },
]

export function getChecklistForCategory(categoryId: string): CategoryChecklist {
  const general = CATEGORY_CHECKLISTS.find((c) => c.categoryId === 'general')
  if (!general) {
    throw new Error('قائمة عام مفقودة')
  }
  const cat = CATEGORY_CHECKLISTS.find((c) => c.categoryId === categoryId) || general
  if (cat.categoryId === 'general') {
    return { ...cat, items: [...cat.items] }
  }
  const catIds = new Set(cat.items.map((i) => i.id))
  const extra = general.items.filter((i) => !catIds.has(i.id))
  return {
    ...cat,
    items: [...cat.items, ...extra],
  }
}

function daysBetweenDateAndToday(dateStr: string): number {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return Infinity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - d.getTime()) / (86400 * 1000))
}

export function validateChecklistResponses(
  checklist: CategoryChecklist,
  responses: Record<string, unknown>,
  files?: Record<string, File | undefined>
): { valid: boolean; errors: { itemId: string; message_ar: string }[] } {
  const errors: { itemId: string; message_ar: string }[] = []

  for (const item of checklist.items) {
    if (!isChecklistItemVisible(item, responses)) continue

    const val = responses[item.id]
    const file = files?.[item.id]

    if (item.required) {
      if (item.type === 'file') {
        if (!file || file.size === 0) {
          errors.push({ itemId: item.id, message_ar: 'هذا الملف مطلوب' })
        }
      } else if (val === undefined || val === null || val === '') {
        errors.push({ itemId: item.id, message_ar: 'هذا الحقل مطلوب' })
      } else if (item.type === 'boolean' && typeof val !== 'boolean') {
        errors.push({ itemId: item.id, message_ar: 'اختر نعم أو لا' })
      }
    }

    if (item.type === 'number' && val !== undefined && val !== null && val !== '') {
      const n = Number(val)
      if (Number.isNaN(n)) {
        errors.push({ itemId: item.id, message_ar: 'أدخل رقماً صالحاً' })
      } else {
        if (item.validation?.min !== undefined && n < item.validation.min) {
          errors.push({ itemId: item.id, message_ar: `القيمة يجب ألا تقل عن ${item.validation.min}` })
        }
        if (item.validation?.max !== undefined && n > item.validation.max) {
          errors.push({ itemId: item.id, message_ar: `القيمة يجب ألا تتجاوز ${item.validation.max}` })
        }
      }
    }

    if (item.type === 'date' && typeof val === 'string' && val) {
      const days = daysBetweenDateAndToday(val)
      if (item.validation?.maxAge !== undefined) {
        if (days < 0) {
          errors.push({ itemId: item.id, message_ar: 'التاريخ في المستقبل غير مقبول' })
        } else if (days > item.validation.maxAge) {
          errors.push({
            itemId: item.id,
            message_ar: `التاريخ يجب أن يكون خلال آخر ${item.validation.maxAge} يوماً`,
          })
        }
      }
    }

    if (item.type === 'file' && file && file.size > 0) {
      const maxMb = item.validation?.maxFileSize
      if (maxMb && file.size > maxMb * 1024 * 1024) {
        errors.push({ itemId: item.id, message_ar: `حجم الملف يتجاوز ${maxMb} ميجابايت` })
      }
      const allowed = item.validation?.fileTypes
      if (allowed?.length && file.type && !allowed.includes(file.type)) {
        errors.push({ itemId: item.id, message_ar: 'نوع الملف غير مسموح' })
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
