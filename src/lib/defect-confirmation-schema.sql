-- تأكيد/رفض عيوب البائع — نفّذ في Supabase (أو استخدم features-v2-schema.sql)

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
