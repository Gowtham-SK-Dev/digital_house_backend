-- Backend/migrations/022_create_job_posts_table.sql
-- Job postings published by employers

CREATE TABLE IF NOT EXISTS job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  posted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employer_profile_id UUID NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  
  -- Job Details
  job_title VARCHAR(255) NOT NULL,
  job_description TEXT NOT NULL,
  responsibilities TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  
  -- Company Info
  company_name VARCHAR(255) NOT NULL,
  company_website VARCHAR(500),
  
  -- Job Type & Mode
  job_type VARCHAR(50) NOT NULL, -- 'full-time', 'part-time', 'internship', 'contract'
  work_mode VARCHAR(50) NOT NULL, -- 'onsite', 'hybrid', 'remote'
  
  -- Location
  job_location VARCHAR(255) NOT NULL,
  job_city VARCHAR(100) NOT NULL,
  job_state VARCHAR(100),
  job_country VARCHAR(100),
  
  -- Experience
  experience_min INT NOT NULL DEFAULT 0, -- in years
  experience_max INT NOT NULL DEFAULT 10,
  experience_level VARCHAR(50), -- 'fresher', '1-3', '3-5', '5+'
  
  -- Salary
  salary_min INT,
  salary_max INT,
  salary_currency VARCHAR(10) DEFAULT 'INR',
  salary_period VARCHAR(50) DEFAULT 'annually', -- 'hourly', 'monthly', 'annually'
  
  -- Skills & Requirements
  skills_required TEXT[], -- array of skill names
  key_responsibilities TEXT[], -- array of key points
  nice_to_have_skills TEXT[], -- array of nice-to-have skills
  
  -- Contact & Application
  contact_mode VARCHAR(50) DEFAULT 'chat', -- 'chat', 'email', 'phone'
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  last_date_to_apply DATE NOT NULL,
  
  -- Verification & Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'closed', 'expired'
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Anti-Fraud Measures
  has_external_links BOOLEAN DEFAULT FALSE,
  has_phone_numbers BOOLEAN DEFAULT FALSE,
  has_whatsapp_numbers BOOLEAN DEFAULT FALSE,
  suspicious_content BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  total_applications INT DEFAULT 0,
  total_shortlisted INT DEFAULT 0,
  total_hired INT DEFAULT 0,
  views INT DEFAULT 0,
  
  is_featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_job_posted_by ON job_posts(posted_by_user_id);
CREATE INDEX idx_job_employer ON job_posts(employer_profile_id);
CREATE INDEX idx_job_status ON job_posts(status);
CREATE INDEX idx_job_location ON job_posts(job_city, job_state);
CREATE INDEX idx_job_type ON job_posts(job_type);
CREATE INDEX idx_job_work_mode ON job_posts(work_mode);
CREATE INDEX idx_job_skills ON job_posts USING GIN(skills_required);
CREATE INDEX idx_job_experience ON job_posts(experience_min, experience_max);
CREATE INDEX idx_job_salary ON job_posts(salary_min, salary_max);
CREATE INDEX idx_job_last_date_apply ON job_posts(last_date_to_apply);
CREATE INDEX idx_job_created_at ON job_posts(created_at DESC);
CREATE INDEX idx_job_approved_at ON job_posts(approved_at DESC);
CREATE INDEX idx_job_views ON job_posts(views DESC);
CREATE INDEX idx_job_deleted_at ON job_posts(deleted_at);

-- Comments
COMMENT ON TABLE job_posts IS 'Job postings created by verified employers';
COMMENT ON COLUMN job_posts.status IS 'Only "approved" jobs appear in search results';
COMMENT ON COLUMN job_posts.has_external_links IS 'Set to TRUE if post contains URLs to external sites (fraud detection)';
COMMENT ON COLUMN job_posts.has_phone_numbers IS 'Set to TRUE if post contains phone numbers (fraud detection)';
COMMENT ON COLUMN job_posts.has_whatsapp_numbers IS 'Set to TRUE if post contains WhatsApp numbers (should be auto-blocked)';
