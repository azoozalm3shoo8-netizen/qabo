// هذا الملف يشرح كيفية إعداد Cron — لا يحتاج تشغيل في المتصفح

/**
 * لإغلاق المزادات المنتهية تلقائياً، يجب إعداد Cron Job
 * يستدعي: GET /api/cron/close-auctions
 *
 * الخيارات:
 * 1. Vercel Cron (في vercel.json)
 * 2. External Cron (cron-job.org أو UptimeRobot)
 * 3. Supabase pg_cron
 *
 * الـ Header المطلوب: Authorization: Bearer {CRON_SECRET}
 */

export const CRON_ENDPOINT = '/api/cron/close-auctions'
export const CRON_INTERVAL = '* * * * *' // كل دقيقة
