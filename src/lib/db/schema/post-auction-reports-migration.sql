-- تقارير ما بعد المزاد للبائع (JSON كامل)
CREATE TABLE IF NOT EXISTS public.post_auction_reports (
  auction_id UUID PRIMARY KEY REFERENCES public.auctions (id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_auction_reports_seller ON public.post_auction_reports (seller_id, created_at DESC);

ALTER TABLE public.post_auction_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS par_select ON public.post_auction_reports;
CREATE POLICY par_select ON public.post_auction_reports FOR SELECT USING (auth.uid() = seller_id);
