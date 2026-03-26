This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

rebuild

<!-- Supabase schema snippets (run in SQL editor as needed) -->

```sql
-- 1. توكنات الإشعارات
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. المحادثات
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES auctions(id),
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. الرسائل
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. جلسات التسليم
CREATE TABLE IF NOT EXISTS handover_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES auctions(id),
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  verification_code TEXT NOT NULL,
  qr_data TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. الأسئلة والأجوبة
CREATE TABLE IF NOT EXISTS auction_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES auctions(id),
  asker_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. تعديلات على جداول موجودة
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS extension_count INT DEFAULT 0;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'flexible';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'الرياض';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS min_increment NUMERIC;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS ai_description_accepted BOOLEAN DEFAULT false;
ALTER TABLE auction_images ADD COLUMN IF NOT EXISTS image_hash TEXT;
ALTER TABLE handover_sessions ADD COLUMN IF NOT EXISTS skipped_qr BOOLEAN DEFAULT false;
```
