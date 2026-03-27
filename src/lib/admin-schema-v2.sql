-- تشغيل يدوي في Supabase SQL Editor — إصدار v2 للوحة الإدارة
-- إذا كان جدول platform_settings موجوداً ببنية مختلفة (عمود id)، انقل البيانات يدوياً أو أضف الأعمدة الناقصة.

-- إعدادات المنصة (مفتاح نصي كـ PK كما في المواصفات)
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_updated ON platform_settings(updated_at DESC);

-- إعدادات افتراضية (قيم JSONB — أرقام كنصوص أو boolean)
INSERT INTO platform_settings (key, value) VALUES
  ('commission_rate', '"5"'),
  ('min_starting_price', '"10"'),
  ('max_auction_days', '"30"'),
  ('maintenance_mode', 'false'),
  ('commission_percent', '{"value": 5}'),
  ('auction_min_price', '{"value": 10}'),
  ('auction_max_price', '{"value": 10000000}'),
  ('default_auction_duration_hours', '{"value": 72}'),
  ('telegram_bot_token', '{"value": ""}'),
  ('telegram_chat_id', '{"value": ""}')
ON CONFLICT (key) DO NOTHING;

-- فهارس سجل التدقيق
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- إحصائيات يومية (للرسوم والتقارير لاحقاً)
CREATE TABLE IF NOT EXISTS daily_stats (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  new_auctions INT DEFAULT 0,
  new_users INT DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  active_users INT DEFAULT 0,
  new_reports INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
