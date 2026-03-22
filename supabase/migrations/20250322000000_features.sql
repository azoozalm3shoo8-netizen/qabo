-- Run in Supabase SQL Editor if migrations are not applied automatically.
-- Extensions
create extension if not exists "pgcrypto";

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1 uuid not null references public.profiles (id) on delete cascade,
  participant_2 uuid not null references public.profiles (id) on delete cascade,
  auction_id uuid references public.auctions (id) on delete set null,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_participants_order check (participant_1 < participant_2)
);

create unique index if not exists conversations_participants_auction_uidx
  on public.conversations (participant_1, participant_2, (coalesce(auction_id, '00000000-0000-0000-0000-000000000000'::uuid)));

create index if not exists conversations_p1_idx on public.conversations (participant_1);
create index if not exists conversations_p2_idx on public.conversations (participant_2);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  auction_id uuid references public.auctions (id) on delete set null,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists messages_receiver_unread_idx on public.messages (receiver_id) where is_read = false;

-- Favorites
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  auction_id uuid not null references public.auctions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, auction_id)
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  auction_id uuid references public.auctions (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where is_read = false;

-- Optional: in Supabase Dashboard → Database → Replication, enable messages & conversations for Realtime.
