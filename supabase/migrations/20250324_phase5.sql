-- Phase 5: payments, wallets, wallet_transactions extensions, escrows, orders columns

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id text NOT NULL,
  auction_id uuid REFERENCES public.auctions (id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text DEFAULT 'SAR',
  status text DEFAULT 'initiated' CHECK (status IN ('initiated', 'paid', 'failed', 'refunded')),
  moyasar_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_auction ON public.payments (auction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_moyasar_id ON public.payments (payment_id);

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  available_balance numeric DEFAULT 0 CHECK (available_balance >= 0),
  frozen_balance numeric DEFAULT 0 CHECK (frozen_balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES public.wallets (id) ON DELETE SET NULL;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS reference text;

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions (user_id);

CREATE TABLE IF NOT EXISTS public.escrows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id uuid REFERENCES public.auctions (id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text DEFAULT 'held' CHECK (status IN ('held', 'released', 'disputed', 'refunded')),
  wallet_backed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  released_at timestamptz,
  disputed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_escrows_auction ON public.escrows (auction_id);
CREATE INDEX IF NOT EXISTS idx_escrows_buyer ON public.escrows (buyer_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_amount numeric(14, 2) DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS moyasar_payment_id text;

CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_wallet ON public.profiles;

CREATE TRIGGER trigger_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.create_wallet_for_user();
