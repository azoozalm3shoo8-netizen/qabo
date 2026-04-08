-- تمديد مكافحة الاقتناص: عدد مرات التمديد لكل مزاد
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS extension_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN auctions.extension_count IS 'عدد مرات تمديد انتهاء المزاد بسبب مزايدات في اللحظات الأخيرة';
