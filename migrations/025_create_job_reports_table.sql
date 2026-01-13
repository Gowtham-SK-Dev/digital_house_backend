-- Backend/migrations/025_create_job_reports_table.sql
-- Abuse/fraud reports on jobs and employers

CREATE TABLE IF NOT EXISTS job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What is being reported
  report_type VARCHAR(50) NOT NULL, -- 'job_post', 'employer_profile'
  job_post_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
  employer_profile_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
  
  -- Who reported
  reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  
  -- Report Details
  reason VARCHAR(100) NOT NULL, -- 'fake_job', 'spam', 'inappropriate', 'scam', 'harassment', 'external_links', 'other'
  description TEXT NOT NULL,
  evidence_urls TEXT[], -- URLs or file paths of evidence
  
  -- Status & Resolution
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'under_review', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  action_taken VARCHAR(100), -- 'job_removed', 'employer_verified', 'employer_blocked', 'no_action'
  resolution_notes TEXT,
  
  -- Metadata
  is_spam_report BOOLEAN DEFAULT FALSE, -- if multiple similar reports, mark earlier ones as spam
  upvotes INT DEFAULT 0, -- other users can upvote a report
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_job ON job_reports(job_post_id);
CREATE INDEX idx_reports_employer ON job_reports(employer_profile_id);
CREATE INDEX idx_reports_reported_by ON job_reports(reported_by_user_id);
CREATE INDEX idx_reports_status ON job_reports(status);
CREATE INDEX idx_reports_reason ON job_reports(reason);
CREATE INDEX idx_reports_created_at ON job_reports(created_at DESC);
CREATE INDEX idx_reports_type ON job_reports(report_type);

-- Comments
COMMENT ON TABLE job_reports IS 'Abuse and fraud reports on jobs and employers';
COMMENT ON COLUMN job_reports.reason IS 'Predefined reasons: fake_job, spam, inappropriate, scam, harassment, external_links, other';
COMMENT ON COLUMN job_reports.action_taken IS 'Actions taken after review: job_removed, employer_verified, employer_blocked, no_action';
