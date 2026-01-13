-- Backend/migrations/023_create_job_applications_table.sql
-- Job applications submitted by seekers

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  job_seeker_id UUID NOT NULL REFERENCES job_seeker_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- job seeker's user_id for quick access
  
  -- Resume & Message
  resume_url VARCHAR(500) NOT NULL,
  resume_file_name VARCHAR(255),
  cover_message TEXT, -- optional message from candidate
  
  -- Status
  application_status VARCHAR(50) DEFAULT 'applied', -- 'applied', 'shortlisted', 'rejected', 'offered', 'hired', 'withdrawn'
  shortlisted_at TIMESTAMP,
  shortlisted_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Employer Actions
  viewed_at TIMESTAMP,
  viewed_by UUID REFERENCES users(id),
  rating_by_employer DECIMAL(3, 2),
  feedback_by_employer TEXT,
  
  -- Applicant Actions
  is_withdrawn BOOLEAN DEFAULT FALSE,
  withdrawn_at TIMESTAMP,
  
  -- Metadata
  match_score INT DEFAULT 0, -- 0-100, based on skills match
  days_since_applied INT GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (NOW() - applied_at))::INT
  ) STORED,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_application_job ON job_applications(job_post_id);
CREATE INDEX idx_application_seeker ON job_applications(job_seeker_id);
CREATE INDEX idx_application_user ON job_applications(user_id);
CREATE INDEX idx_application_status ON job_applications(application_status);
CREATE INDEX idx_application_shortlisted ON job_applications(shortlisted_at);
CREATE INDEX idx_application_created_at ON job_applications(created_at DESC);
CREATE INDEX idx_application_match_score ON job_applications(match_score DESC);
CREATE INDEX idx_application_job_status ON job_applications(job_post_id, application_status);

-- Comments
COMMENT ON TABLE job_applications IS 'Tracks job applications from seekers to job posts';
COMMENT ON COLUMN job_applications.match_score IS 'Auto-calculated based on skill match (0-100)';
COMMENT ON COLUMN job_applications.days_since_applied IS 'Calculated field for sorting by recency';
