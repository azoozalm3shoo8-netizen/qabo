-- Qabo Video 360° — Database Schema v1
-- تنفيذ يدوي في Supabase SQL Editor

-- جدول وظائف معالجة الفيديو
CREATE TABLE IF NOT EXISTS video_360_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','uploading','extracting','filtering','analyzing','annotating','done','failed')),
  video_storage_path TEXT,
  video_duration_sec NUMERIC(6,2) DEFAULT 0,
  total_extracted INT DEFAULT 0,
  valid_frames INT DEFAULT 0,
  rejected_frames INT DEFAULT 0,
  frames_folder TEXT,
  frame_urls TEXT[] DEFAULT '{}',
  annotated_urls TEXT[] DEFAULT '{}',
  closeup_urls TEXT[] DEFAULT '{}',
  defects JSONB DEFAULT '[]',
  overall_condition TEXT DEFAULT 'unknown'
    CHECK (overall_condition IN ('unknown','ممتاز','جيد جداً','جيد','مقبول','سيء')),
  condition_score INT DEFAULT 0 CHECK (condition_score >= 0 AND condition_score <= 100),
  condition_summary_ar TEXT DEFAULT '',
  hotspots JSONB DEFAULT '[]',
  ai_model_used TEXT DEFAULT '',
  processing_time_ms INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v360_auction ON video_360_jobs(auction_id);
CREATE INDEX IF NOT EXISTS idx_v360_user ON video_360_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_v360_status ON video_360_jobs(status);

-- RLS: المستخدم يرى وظائفه فقط + الأدمن يرى الكل
ALTER TABLE video_360_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON video_360_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON video_360_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON video_360_jobs
  FOR ALL USING (true) WITH CHECK (true);
