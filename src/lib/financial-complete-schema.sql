-- تشغيل يدوي في Supabase SQL Editor — إكمال الإعدادات المالية والفترة المجانية
-- لا يحذف جداولاً موجودة؛ يضيف مفاتيح platform_settings وحقولاً اختيارية للمزادات عند الحاجة.

-- أعمدة اختيارية للمزادات (رسوم الإدراج — تُستخدم عند تفعيل المنطق في API)
ALTER TABLE IF EXISTS auctions ADD COLUMN IF NOT EXISTS reserve_fee_halalas BIGINT DEFAULT 0;
ALTER TABLE IF EXISTS auctions ADD COLUMN IF NOT EXISTS relisting_fee_halalas BIGINT DEFAULT 0;
ALTER TABLE IF EXISTS auctions ADD COLUMN IF NOT EXISTS seller_deposit_halalas BIGINT DEFAULT 10000;
ALTER TABLE IF EXISTS auctions ADD COLUMN IF NOT EXISTS listing_count INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS auctions ADD COLUMN IF NOT EXISTS platform_metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS deals ADD COLUMN IF NOT EXISTS free_period BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS deals ADD COLUMN IF NOT EXISTS platform_metadata JSONB DEFAULT '{}'::jsonb;

INSERT INTO platform_settings (key, value) VALUES
  ('free_period_enabled', '{"value": true}'),
  ('free_period_ends_at', '{"value": "2026-08-01T00:00:00Z"}'),
  ('free_period_warning_days', '{"value": 14}'),
  ('post_free_seller_rates', '{"micro": 0.05, "small": 0.04, "medium": 0.03, "large": 0.025, "premium": 0.02}'),
  ('post_free_buyer_rates', '{"micro_flat": 500, "standard": 0.02, "cap": 50000}'),
  ('free_period_message_ar', '{"value": "🎉 المنصة مجانية حالياً! لا عمولة ولا رسوم — فقط استمتع بالتجربة الآمنة"}'),
  ('free_period_ending_message_ar', '{"value": "⚠️ الفترة المجانية تنتهي قريباً — ستُفعَّل العمولة بتاريخ {date}. اطّلع على التفاصيل"}'),
  ('free_period_cron_notifications', '{"sent": {}}'),
  ('free_period_analytics', '{"value": {"free_deals_count": 0, "moyasar_fees_absorbed_halalas": 0}}')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
