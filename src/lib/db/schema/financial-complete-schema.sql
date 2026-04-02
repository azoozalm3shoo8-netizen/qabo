-- ═══════════════════════════════════════════════════════════════════════════
-- قبو Qabboo — مخطط مالي ووظائف مزادات كامل
-- تنفيذ في Supabase SQL Editor (يدعم إعادة التشغيل بفضل IF NOT EXISTS)
-- يفترض وجود: extension pgcrypto، وجدول public.profiles مرتبطاً بـ auth.users إن وُجد
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. saved_cards
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  moyasar_token TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'unknown',
  funding TEXT NOT NULL DEFAULT 'credit',
  last_four TEXT NOT NULL DEFAULT '0000',
  holder_name TEXT,
  exp_month SMALLINT NOT NULL DEFAULT 12 CHECK (exp_month >= 1 AND exp_month <= 12),
  exp_year SMALLINT NOT NULL CHECK (exp_year >= 2020 AND exp_year <= 2100),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_cards_user_token_unique UNIQUE (user_id, moyasar_token)
);

CREATE INDEX IF NOT EXISTS idx_saved_cards_user ON public.saved_cards (user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. commission_tiers
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  min_amount BIGINT NOT NULL CHECK (min_amount >= 0),
  max_amount BIGINT CHECK (max_amount IS NULL OR max_amount >= min_amount),
  seller_rate NUMERIC(8, 6) NOT NULL CHECK (seller_rate >= 0 AND seller_rate <= 1),
  buyer_protection_rate NUMERIC(8, 6) NOT NULL DEFAULT 0 CHECK (buyer_protection_rate >= 0 AND buyer_protection_rate <= 1),
  buyer_protection_cap BIGINT CHECK (buyer_protection_cap IS NULL OR buyer_protection_cap >= 0),
  buyer_flat_fee BIGINT NOT NULL DEFAULT 0 CHECK (buyer_flat_fee >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commission_tiers_name_unique UNIQUE (tier_name),
  CONSTRAINT commission_tiers_range CHECK (max_amount IS NULL OR max_amount >= min_amount)
);

CREATE INDEX IF NOT EXISTS idx_commission_tiers_active_min ON public.commission_tiers (is_active, min_amount);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. seller_profiles
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  trust_score INT NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 200),
  trust_level TEXT NOT NULL DEFAULT 'watch'
    CHECK (trust_level IN ('gold', 'silver', 'watch', 'banned')),
  total_sales INT NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
  successful_sales INT NOT NULL DEFAULT 0 CHECK (successful_sales >= 0),
  cancelled_sales INT NOT NULL DEFAULT 0 CHECK (cancelled_sales >= 0),
  unjustified_cancellations INT NOT NULL DEFAULT 0 CHECK (unjustified_cancellations >= 0),
  total_revenue BIGINT NOT NULL DEFAULT 0,
  commission_discount NUMERIC(8, 6) NOT NULL DEFAULT 0 CHECK (commission_discount >= 0 AND commission_discount <= 1),
  is_pro_subscriber BOOLEAN NOT NULL DEFAULT false,
  pro_expires_at TIMESTAMPTZ,
  iban TEXT,
  iban_holder_name TEXT,
  iban_verified BOOLEAN NOT NULL DEFAULT false,
  payout_mobile TEXT,
  payout_city TEXT,
  payout_country TEXT DEFAULT 'SA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_trust ON public.seller_profiles (trust_level, trust_score DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. auctions
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'new',
  city TEXT NOT NULL DEFAULT 'الرياض',
  start_price NUMERIC(14, 2) NOT NULL CHECK (start_price > 0),
  current_bid NUMERIC(14, 2),
  current_price BIGINT,
  buy_now_price NUMERIC(14, 2),
  bid_increment NUMERIC(14, 2) NOT NULL DEFAULT 1,
  min_increment NUMERIC(14, 2),
  reserve_price BIGINT,
  auction_type TEXT NOT NULL DEFAULT 'open' CHECK (auction_type IN ('open', 'reserve')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'sold', 'cancelled', 'expired', 'failed', 'draft')),
  ends_at TIMESTAMPTZ NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  delivery_method TEXT DEFAULT 'flexible',
  ai_description_accepted BOOLEAN NOT NULL DEFAULT false,
  bid_count INT DEFAULT 0 CHECK (bid_count >= 0),
  total_bids INT DEFAULT 0 CHECK (total_bids >= 0),
  highest_bidder_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  winner_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  winning_bid_id UUID,
  reserve_fee_halalas BIGINT NOT NULL DEFAULT 0 CHECK (reserve_fee_halalas >= 0),
  relisting_fee_halalas BIGINT NOT NULL DEFAULT 0 CHECK (relisting_fee_halalas >= 0),
  seller_deposit_halalas BIGINT DEFAULT 10000 CHECK (seller_deposit_halalas IS NULL OR seller_deposit_halalas >= 0),
  seller_deposit_payment_id TEXT,
  seller_deposit_status TEXT CHECK (
    seller_deposit_status IS NULL OR seller_deposit_status IN ('pending', 'authorized', 'voided', 'forfeited', 'captured')
  ),
  listing_count INT NOT NULL DEFAULT 0 CHECK (listing_count >= 0),
  platform_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  cancellation_reason TEXT,
  cancellation_category TEXT,
  cancellation_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auctions_seller ON public.auctions (seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status_ends ON public.auctions (status, ends_at);
CREATE INDEX IF NOT EXISTS idx_auctions_city_cat ON public.auctions (city, category);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. bids
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions (id) ON DELETE CASCADE,
  listing_id UUID,
  bidder_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  guarantee_amount BIGINT CHECK (guarantee_amount IS NULL OR guarantee_amount >= 0),
  guarantee_payment_id TEXT,
  guarantee_status TEXT CHECK (
    guarantee_status IS NULL OR guarantee_status IN ('pending', 'authorized', 'voided', 'captured', 'failed')
  ),
  is_winning BOOLEAN NOT NULL DEFAULT false,
  is_auto_bid BOOLEAN NOT NULL DEFAULT false,
  max_auto_bid BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_auction ON public.bids (auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON public.bids (bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON public.bids (auction_id, amount DESC);

-- FK winning_bid_id على auctions + listing_id على bids (بعد إنشاء bids)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'auctions_winning_bid_id_fkey'
  ) THEN
    ALTER TABLE public.auctions
      ADD CONSTRAINT auctions_winning_bid_id_fkey
      FOREIGN KEY (winning_bid_id) REFERENCES public.bids (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bids_listing_id_fkey'
  ) THEN
    ALTER TABLE public.bids
      ADD CONSTRAINT bids_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES public.auctions (id) ON DELETE SET NULL;
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. deals
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions (id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  sale_price BIGINT NOT NULL CHECK (sale_price > 0),
  total_buyer_charge BIGINT NOT NULL CHECK (total_buyer_charge > 0),
  seller_payout_amount BIGINT NOT NULL,
  full_payment_id TEXT,
  full_payment_status TEXT,
  winning_bid_id UUID REFERENCES public.bids (id) ON DELETE SET NULL,
  delivery_method TEXT,
  delivery_status TEXT CHECK (
    delivery_status IS NULL OR delivery_status IN ('pending', 'shipped', 'delivered', 'completed', 'cancelled')
  ),
  handover_code TEXT,
  safe_zone_id UUID,
  inspection_starts_at TIMESTAMPTZ,
  inspection_ends_at TIMESTAMPTZ,
  inspection_status TEXT CHECK (
    inspection_status IS NULL OR inspection_status IN ('pending', 'accepted', 'rejected', 'auto_accepted')
  ),
  buyer_accepted_at TIMESTAMPTZ,
  handover_confirmed_at TIMESTAMPTZ,
  seller_payout_id TEXT,
  seller_payout_status TEXT,
  seller_payout_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'in_progress', 'completed', 'cancelled', 'disputed')),
  free_period BOOLEAN NOT NULL DEFAULT false,
  platform_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT deals_auction_unique UNIQUE (auction_id)
);

CREATE INDEX IF NOT EXISTS idx_deals_buyer ON public.deals (buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_seller ON public.deals (seller_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals (status);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. disputes
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated', 'closed')),
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT disputes_deal_unique UNIQUE (deal_id)
);

CREATE INDEX IF NOT EXISTS idx_disputes_deal ON public.disputes (deal_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. dispute_messages
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON public.dispute_messages (dispute_id, created_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. financial_transactions
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  auction_id UUID REFERENCES public.auctions (id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  moyasar_payment_id TEXT,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_tx_user ON public.financial_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_tx_auction ON public.financial_transactions (auction_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_type ON public.financial_transactions (type);

-- ───────────────────────────────────────────────────────────────────────────
-- 10. safe_zones
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.safe_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  address TEXT,
  district TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  operating_hours TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT safe_zones_lat_lng_check CHECK (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_safe_zones_active ON public.safe_zones (is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS safe_zones_name_unique ON public.safe_zones (name);

-- FK اختياري من deals.safe_zone_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_safe_zone_id_fkey') THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_safe_zone_id_fkey
      FOREIGN KEY (safe_zone_id) REFERENCES public.safe_zones (id) ON DELETE SET NULL;
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 11. webhook_events
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'moyasar',
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_provider_event_unique UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON public.webhook_events (created_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 12. platform_settings
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_updated ON public.platform_settings (updated_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 13. seller_cancellation_log
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_cancellation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reason_category TEXT NOT NULL,
  evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  justified BOOLEAN NOT NULL DEFAULT false,
  trust_delta INT NOT NULL DEFAULT 0,
  deposit_forfeited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_cancel_seller ON public.seller_cancellation_log (seller_id, created_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- 14. product_fingerprints
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  auction_id UUID REFERENCES public.auctions (id) ON DELETE SET NULL,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_fp_seller_hash ON public.product_fingerprints (seller_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_product_fp_created ON public.product_fingerprints (created_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 15. notifications
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  auction_id UUID REFERENCES public.auctions (id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id) WHERE is_read = false;

-- ═══════════════════════════════════════════════════════════════════════════
-- بيانات أساسية: commission_tiers (5 شرائح)
-- المبالغ بالهللات. micro: رسم مسطح للمشتري؛ الباقي: نسبة + سقف
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.commission_tiers (
  tier_name, min_amount, max_amount, seller_rate, buyer_protection_rate, buyer_protection_cap, buyer_flat_fee, is_active, sort_order
) VALUES
  ('micro', 0, 100000, 0.05, 0, NULL, 500, true, 1),
  ('small', 100001, 1000000, 0.04, 0.02, 50000, 0, true, 2),
  ('medium', 1000001, 5000000, 0.03, 0.02, 50000, 0, true, 3),
  ('large', 5000001, 20000000, 0.025, 0.02, 50000, 0, true, 4),
  ('premium', 20000001, NULL, 0.02, 0.02, 50000, 0, true, 5)
ON CONFLICT (tier_name) DO UPDATE SET
  min_amount = EXCLUDED.min_amount,
  max_amount = EXCLUDED.max_amount,
  seller_rate = EXCLUDED.seller_rate,
  buyer_protection_rate = EXCLUDED.buyer_protection_rate,
  buyer_protection_cap = EXCLUDED.buyer_protection_cap,
  buyer_flat_fee = EXCLUDED.buyer_flat_fee,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- safe_zones — 5 نقاط في الرياض (إحداثيات تقريبية)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.safe_zones (name, name_en, address, district, lat, lng, operating_hours, is_active)
VALUES
  ('الرياض بارك', 'Riyadh Park', 'طريق الملك عبدالله', 'الملز', 24.7112, 46.6745, '10:00–22:00', true),
  ('غرناطة مول', 'Granada Mall', 'حي الشهداء', 'الشرق', 24.7801, 46.7214, '10:00–23:00', true),
  ('خريص مول', 'Khirais Mall', 'طريق الخرج', 'الخرج طريق', 24.6234, 46.7128, '10:00–22:00', true),
  ('النخيل مول', 'Nakheel Mall', 'طريق الملك فهد', 'المروج', 24.7245, 46.6312, '09:30–23:00', true),
  ('الحمراء مول', 'Al Hamra Mall', 'حي الحمراء', 'الحمراء', 24.7689, 46.6156, '10:00–22:00', true)
ON CONFLICT (name) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  address = EXCLUDED.address,
  district = EXCLUDED.district,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  operating_hours = EXCLUDED.operating_hours,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- platform_settings — إعدادات المنصة والفترة المجانية والتحليلات
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.platform_settings (key, value) VALUES
  ('commission_rate', '"5"'),
  ('min_starting_price', '"10"'),
  ('max_auction_days', '"30"'),
  ('maintenance_mode', 'false'),
  ('commission_percent', '{"value": 5}'),
  ('auction_min_price', '{"value": 10}'),
  ('auction_max_price', '{"value": 10000000}'),
  ('default_auction_duration_hours', '{"value": 72}'),
  ('telegram_bot_token', '{"value": ""}'),
  ('telegram_chat_id', '{"value": ""}'),
  ('free_period_enabled', '{"value": true}'),
  ('free_period_ends_at', '{"value": "2026-08-01T00:00:00Z"}'),
  ('free_period_warning_days', '{"value": 14}'),
  ('post_free_seller_rates', '{"micro": 0.05, "small": 0.04, "medium": 0.03, "large": 0.025, "premium": 0.02}'),
  ('post_free_buyer_rates', '{"micro_flat": 500, "standard": 0.02, "cap": 50000}'),
  ('free_period_message_ar', '{"value": "🎉 المنصة مجانية حالياً! لا عمولة ولا رسوم — فقط استمتع بالتجربة الآمنة"}'),
  ('free_period_ending_message_ar', '{"value": "⚠️ الفترة المجانية تنتهي قريباً — ستُفعَّل العمولة بتاريخ {date}. اطّلع على التفاصيل"}'),
  ('free_period_cron_notifications', '{"sent": {}}'),
  ('free_period_analytics', '{"value": {"free_deals_count": 0, "moyasar_fees_absorbed_halalas": 0}}'),
  ('seller_deposit_tiers', '{"tiers": [{"maxHalalas": 100000, "depositHalalas": 5000}, {"maxHalalas": 1000000, "depositHalalas": 10000}, {"maxHalalas": 5000000, "depositHalalas": 25000}, {"maxHalalas": 999999999999, "depositHalalas": 50000}]}'),
  ('trust_score_rules', '{"value": {"sale_success": 5, "cancel_unjustified": -20, "cancel_justified": -5}}')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security + Policies
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- saved_cards
DROP POLICY IF EXISTS saved_cards_select_own ON public.saved_cards;
DROP POLICY IF EXISTS saved_cards_insert_own ON public.saved_cards;
DROP POLICY IF EXISTS saved_cards_update_own ON public.saved_cards;
DROP POLICY IF EXISTS saved_cards_delete_own ON public.saved_cards;
CREATE POLICY saved_cards_select_own ON public.saved_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY saved_cards_insert_own ON public.saved_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY saved_cards_update_own ON public.saved_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY saved_cards_delete_own ON public.saved_cards FOR DELETE USING (auth.uid() = user_id);

-- seller_profiles
DROP POLICY IF EXISTS seller_profiles_select_all ON public.seller_profiles;
DROP POLICY IF EXISTS seller_profiles_insert_own ON public.seller_profiles;
DROP POLICY IF EXISTS seller_profiles_update_own ON public.seller_profiles;
CREATE POLICY seller_profiles_select_all ON public.seller_profiles FOR SELECT USING (true);
CREATE POLICY seller_profiles_insert_own ON public.seller_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY seller_profiles_update_own ON public.seller_profiles FOR UPDATE USING (auth.uid() = user_id);

-- auctions
DROP POLICY IF EXISTS auctions_select_public ON public.auctions;
DROP POLICY IF EXISTS auctions_insert_seller ON public.auctions;
DROP POLICY IF EXISTS auctions_update_seller ON public.auctions;
CREATE POLICY auctions_select_public ON public.auctions FOR SELECT USING (true);
CREATE POLICY auctions_insert_seller ON public.auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY auctions_update_seller ON public.auctions FOR UPDATE USING (auth.uid() = seller_id);

-- bids
DROP POLICY IF EXISTS bids_select_public ON public.bids;
DROP POLICY IF EXISTS bids_insert_bidder ON public.bids;
CREATE POLICY bids_select_public ON public.bids FOR SELECT USING (true);
CREATE POLICY bids_insert_bidder ON public.bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- deals
DROP POLICY IF EXISTS deals_select_parties ON public.deals;
CREATE POLICY deals_select_parties ON public.deals FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- disputes
DROP POLICY IF EXISTS disputes_select_parties ON public.disputes;
CREATE POLICY disputes_select_parties ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = disputes.deal_id
        AND (auth.uid() = d.buyer_id OR auth.uid() = d.seller_id)
    )
  );

-- notifications
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_service ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_insert_service ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ملاحظة: مسارات API تستخدم service_role وتتجاوز RLS.
-- ═══════════════════════════════════════════════════════════════════════════
