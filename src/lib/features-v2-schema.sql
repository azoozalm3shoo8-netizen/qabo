-- Qabo — ميزات v2: عيوب البائع + قوائم الفحص + حالات فيديو 360 + nobg

-- تحديث قيد حالة المهمة ليشمل enhancing و removing-bg
ALTER TABLE video_360_jobs DROP CONSTRAINT IF EXISTS video_360_jobs_status_check;
ALTER TABLE video_360_jobs ADD CONSTRAINT video_360_jobs_status_check
  CHECK (status IN (
    'pending','uploading','extracting','filtering','enhancing','removing-bg',
    'analyzing','annotating','done','failed'
  ));

ALTER TABLE video_360_jobs
  ADD COLUMN IF NOT EXISTS nobg_urls TEXT[] DEFAULT '{}';

-- جدول ردود البائع على العيوب
CREATE TABLE IF NOT EXISTS defect_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  auction_id UUID,
  seller_id UUID NOT NULL,
  defect_index INT NOT NULL,
  defect_type TEXT NOT NULL,
  defect_severity TEXT NOT NULL,
  ai_description TEXT NOT NULL,
  seller_confirmed BOOLEAN NOT NULL,
  seller_comment TEXT DEFAULT '',
  responded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, defect_index)
);

CREATE INDEX IF NOT EXISTS idx_dr_job ON defect_responses(job_id);
CREATE INDEX IF NOT EXISTS idx_dr_auction ON defect_responses(auction_id);

ALTER TABLE video_360_jobs
  ADD COLUMN IF NOT EXISTS seller_response_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS seller_confirmed_defects INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_denied_defects INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_responsibility_acknowledged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_response_date TIMESTAMPTZ;

-- قوائم الفحص لكل إعلان
CREATE TABLE IF NOT EXISTS auction_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL UNIQUE,
  category_id TEXT NOT NULL,
  seller_id UUID NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  file_urls JSONB DEFAULT '{}',
  validation_passed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acl_auction ON auction_checklists(auction_id);
