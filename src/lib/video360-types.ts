/** أنواع مشتركة لواجهة 360° — آمنة للاستيراد من العميل */

export type DefectSeverity = 'minor' | 'moderate' | 'major'

export interface Defect {
  frame_index: number
  type: string
  severity: DefectSeverity
  location: string
  description_ar: string
  bbox?: { x: number; y: number; w: number; h: number }
}

export interface DefectAnalysisResult {
  defects: Defect[]
  overall_condition: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'سيء' | 'غير محدد'
  condition_score: number
  summary_ar: string
  ai_model: string
}

export interface CI360Hotspot {
  id: string
  label: string
  orientation: 'x'
  containerSize: [number, number]
  positions: Record<number, { x: number; y: number }>
  content: string
}

export interface Video360Result {
  job_id: string
  status: string
  total_frames: number
  valid_frames: number
  defects_count: number
  overall_condition: string
  condition_score: number
  summary: string
  frame_urls: string[]
  annotated_urls: string[]
  hotspots: CI360Hotspot[]
  defects: Defect[]
}
