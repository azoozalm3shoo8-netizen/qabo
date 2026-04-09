-- ═══════════════════════════════════════════════════════════════════════════
-- قبو — Phase 4: webhooks، نزاعات، شحن، تقييمات، مزايدة تلقائية (جدول)
-- نفّذ يدوياً في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ Webhook Events ═══
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payment_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON public.webhook_events(payment_id);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhook_events_service_only ON public.webhook_events;
CREATE POLICY webhook_events_service_only ON public.webhook_events FOR ALL USING (false);

-- ═══ auto_bids (إن لم يكن موجوداً) ═══
CREATE TABLE IF NOT EXISTS public.auto_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions (id) ON DELETE CASCADE,
  max_amount NUMERIC(14, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT auto_bids_user_auction UNIQUE (user_id, auction_id)
);
CREATE INDEX IF NOT EXISTS idx_auto_bids_auction ON public.auto_bids (auction_id, is_active);

-- ═══ disputes — أعمدة إضافية ═══
DO $$
BEGIN
  ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS auto_resolution_at TIMESTAMPTZ;
  ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS seller_response_deadline TIMESTAMPTZ;
  ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS buyer_opened_reason TEXT;
  ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS ai_suggested_resolution TEXT;
  ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION;
  ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolution_type TEXT;
  ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS refund_amount BIGINT DEFAULT 0;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ═══ deals — شحن + تواريخ دفع ═══
DO $$
BEGIN
  ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS tracking_number TEXT;
  ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS shipping_provider TEXT;
  ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
  ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;
  ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ═══ reviews — صفقة + كشف مزدوج ═══
DO $$
BEGIN
  ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals (id) ON DELETE SET NULL;
  ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_buyer_review BOOLEAN;
  ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN DEFAULT false;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ═══ bids — حالة دفع إضافية (Webhook) ═══
DO $$
BEGIN
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS moyasar_payment_id TEXT;
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS is_auto_bid BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON TABLE public.webhook_events IS 'أحداث Moyasar — معالجة idempotent من الخادم';
