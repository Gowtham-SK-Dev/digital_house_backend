-- Backend/migrations/024_create_saved_jobs_table.sql
-- Job bookmarks/saved jobs by seekers

CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  job_seeker_id UUID NOT NULL REFERENCES job_seeker_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Metadata
  notes TEXT, -- personal notes about the job
  is_interested BOOLEAN DEFAULT TRUE,
  is_applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique constraint: one seeker can save a job only once
ALTER TABLE saved_jobs ADD CONSTRAINT uk_saved_jobs_seeker_job UNIQUE(job_seeker_id, job_post_id);

-- Indexes
CREATE INDEX idx_saved_jobs_seeker ON saved_jobs(job_seeker_id);
CREATE INDEX idx_saved_jobs_job ON saved_jobs(job_post_id);
CREATE INDEX idx_saved_jobs_user ON saved_jobs(user_id);
CREATE INDEX idx_saved_jobs_created_at ON saved_jobs(created_at DESC);
CREATE INDEX idx_saved_jobs_applied ON saved_jobs(is_applied);

-- Comments
COMMENT ON TABLE saved_jobs IS 'Bookmarks for job posts saved by seekers';
COMMENT ON COLUMN saved_jobs.is_applied IS 'Set to TRUE when seeker applies to this saved job';
