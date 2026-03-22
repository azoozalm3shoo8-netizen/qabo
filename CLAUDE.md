# مشروع قبو - منصة مزادات ذكية

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database + Realtime)
- Twilio Verify (OTP SMS)

## Project Structure
- src/app/page.tsx — الصفحة الرئيسية (تعرض المزادات الحية)
- src/app/auth/login/page.tsx — تسجيل الدخول بـ OTP
- src/app/auth/register/page.tsx — التسجيل
- src/app/auction/page.tsx — صفحة المزادات
- src/app/create/page.tsx — إنشاء مزاد جديد
- src/app/profile/page.tsx — الملف الشخصي
- src/app/messages/page.tsx — الرسائل
- src/app/categories/page.tsx — التصنيفات
- src/app/api/auctions/route.ts — API المزادات (GET + POST)
- src/app/api/bids/route.ts — API المزايدات (POST)
- src/app/api/profile/route.ts — API الملف الشخصي
- src/app/api/auth/send-otp/route.ts — إرسال OTP
- src/app/api/auth/verify-otp/route.ts — التحقق من OTP
- src/app/api/auth/dev-login/route.ts — دخول تطوير بدون OTP
- src/lib/auth.ts — دوال المصادقة

## Supabase Tables
- profiles (id, full_name, phone, city, avatar_url, bio, is_verified, rating, total_reviews, wallet_balance, total_sales, total_purchases, created_at, updated_at)
- auctions (id, seller_id, title, description, category, condition, city, images, start_price, current_bid, buy_now_price, bid_increment, bid_count, highest_bidder_id, status, starts_at, ends_at, created_at)
- bids (id, auction_id, bidder_id, amount, created_at)

## Design Rules
- RTL (right-to-left) always — dir="rtl"
- Arabic UI only
- Color scheme: amber-500 (primary), black, white, gray
- Mobile-first responsive design
- All pages must have bottom navigation bar

## Auth
- User data stored in localStorage as 'qabo_user' with {user_id, phone}
- Dev mode available for testing without OTP

## Supabase Config
- Project: kszqxcmqgpvpbwwrkbgt
- ENV vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
