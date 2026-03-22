-- Orders (winner checkout) and wallet ledger
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  product_amount numeric(14, 2) not null,
  commission_amount numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  total_amount numeric(14, 2) not null,
  tap_charge_id text unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_auction_id_idx on public.orders (auction_id);
create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_tap_charge_id_idx on public.orders (tap_charge_id);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null,
  balance_after numeric(14, 2),
  type text not null,
  description text,
  auction_id uuid references public.auctions (id) on delete set null,
  tap_charge_id text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions (user_id);
