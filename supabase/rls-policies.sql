-- ⚠️ مسارات API تستخدم مفتاح service_role الذي يتجاوز RLS.
-- هذه السياسات تحمي فقط ضد الوصول المباشر من عميل Supabase (anon).
-- نفّذ هذا الملف مرة واحدة في محرر SQL في Supabase.

-- إسقاط كل السياسات الحالية ثم إعادة إنشائها لكل جدول

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_public ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'auctions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.auctions', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY auctions_select_public ON public.auctions FOR SELECT USING (true);
CREATE POLICY auctions_insert_seller ON public.auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY auctions_update_seller ON public.auctions FOR UPDATE USING (auth.uid() = seller_id);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bids'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.bids', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY bids_select_public ON public.bids FOR SELECT USING (true);
CREATE POLICY bids_insert_bidder ON public.bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversations_select_participants ON public.conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY conversations_insert_auth ON public.conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select_participants ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
  )
);
CREATE POLICY messages_insert_sender ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorites'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.favorites', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY favorites_select_own ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY favorites_insert_own ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY favorites_delete_own ON public.favorites FOR DELETE USING (auth.uid() = user_id);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_insert_all ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.orders', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_select_parties ON public.orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY orders_insert_all ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY orders_update_parties ON public.orders FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_transactions'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.wallet_transactions', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_tx_select_own ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wallet_tx_insert_all ON public.wallet_transactions FOR INSERT WITH CHECK (true);

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', pol.policyname); END LOOP;
END $$;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select_public ON public.reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert_reviewer ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
