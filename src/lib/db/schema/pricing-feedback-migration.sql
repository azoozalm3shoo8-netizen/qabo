CREATE TABLE IF NOT EXISTS public.pricing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions (id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  condition TEXT,
  suggested_starting_bid BIGINT,
  actual_starting_bid BIGINT,
  final_price BIGINT,
  total_bids INT NOT NULL DEFAULT 0,
  unique_bidders INT NOT NULL DEFAULT 0,
  had_bids BOOLEAN NOT NULL DEFAULT false,
  price_ratio NUMERIC(8, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_feedback_category ON public.pricing_feedback (category, created_at DESC);
