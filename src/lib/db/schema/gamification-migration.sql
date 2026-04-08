-- تلعيب المشترين: نقاط خبرة، مستويات، شارات
CREATE TABLE IF NOT EXISTS public.buyer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  level_name TEXT NOT NULL DEFAULT 'مستكشف',
  total_bids INT NOT NULL DEFAULT 0,
  auctions_won INT NOT NULL DEFAULT 0,
  auctions_watched INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_bid_date DATE,
  last_activity_date DATE,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_profiles_user ON public.buyer_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_level ON public.buyer_profiles (level DESC, xp DESC);

ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bp_select ON public.buyer_profiles;
DROP POLICY IF EXISTS bp_insert ON public.buyer_profiles;
DROP POLICY IF EXISTS bp_update ON public.buyer_profiles;

CREATE POLICY bp_select ON public.buyer_profiles FOR SELECT USING (true);
CREATE POLICY bp_insert ON public.buyer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY bp_update ON public.buyer_profiles FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON COLUMN public.buyer_profiles.last_activity_date IS 'آخر يوم حُسبت فيه مكافأة النشاط اليومي (UTC)';
