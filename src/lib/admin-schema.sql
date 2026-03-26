-- تشغيل يدوي في Supabase SQL Editor — مرجع مخطط الإدارة (RBAC + Audit + حظر + إحصائيات)

-- 1. جدول الأدوار
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'support', 'viewer')),
  permissions JSONB DEFAULT '{}',
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_roles_select ON admin_roles FOR SELECT USING (true);
CREATE POLICY admin_roles_modify ON admin_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND role IN ('super_admin'))
);

-- 2. جدول سجل النشاط (Audit Log)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (true);

-- 3. جدول الحظر المتدرج
CREATE TABLE IF NOT EXISTS user_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ban_level INT DEFAULT 1 CHECK (ban_level BETWEEN 1 AND 5),
  reason TEXT NOT NULL,
  banned_by UUID NOT NULL,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY bans_select ON user_bans FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
);
CREATE POLICY bans_insert ON user_bans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
);

-- 4. جدول إحصائيات يومية
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_auctions INT DEFAULT 0,
  new_auctions INT DEFAULT 0,
  ended_auctions INT DEFAULT 0,
  total_bids INT DEFAULT 0,
  total_users INT DEFAULT 0,
  new_users INT DEFAULT 0,
  gmv NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  total_reports INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY stats_select ON daily_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid())
);

-- 5. دالة التحقق من الدور
CREATE OR REPLACE FUNCTION check_admin_role(uid UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = uid AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bans_user ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles(user_id);

-- 7. تعليق الحساب (لـ PATCH في لوحة الإدارة)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;
