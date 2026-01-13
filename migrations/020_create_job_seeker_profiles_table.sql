-- Backend/migrations/020_create_job_seeker_profiles_table.sql
-- Job seeker profile storage

CREATE TABLE IF NOT EXISTS job_seeker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Personal Information
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  current_location VARCHAR(255),
  current_city VARCHAR(100),
  current_state VARCHAR(100),
  current_country VARCHAR(100),
  
  -- Education & Skills
  education VARCHAR(500),
  skills TEXT[], -- Array of skill tags
  experience_years INT CHECK (experience_years >= 0),
  experience_level VARCHAR(50), -- 'fresher', '1-3', '3-5', '5+'
  
  -- Preferences
  preferred_location VARCHAR(255),
  preferred_cities TEXT[], -- Array of cities
  job_type_preference VARCHAR(50), -- 'full-time', 'part-time', 'internship', 'contract'
  work_mode_preference VARCHAR(50), -- 'onsite', 'hybrid', 'remote'
  expected_salary_min INT,
  expected_salary_max INT,
  
  -- Resume & Visibility
  resume_url VARCHAR(500),
  resume_original_name VARCHAR(255),
  watermarked BOOLEAN DEFAULT TRUE,
  visibility VARCHAR(50) DEFAULT 'community-only', -- 'public', 'community-only'
  
  -- Metadata
  profile_completeness INT DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  views INT DEFAULT 0,
  applications_sent INT DEFAULT 0,
  last_active TIMESTAMP,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_job_seeker_user_id ON job_seeker_profiles(user_id);
CREATE INDEX idx_job_seeker_experience ON job_seeker_profiles(experience_level);
CREATE INDEX idx_job_seeker_location ON job_seeker_profiles(current_city);
CREATE INDEX idx_job_seeker_skills ON job_seeker_profiles USING GIN(skills);
CREATE INDEX idx_job_seeker_created_at ON job_seeker_profiles(created_at DESC);
CREATE INDEX idx_job_seeker_deleted_at ON job_seeker_profiles(deleted_at);

-- Comments
COMMENT ON TABLE job_seeker_profiles IS 'Stores job seeker profiles with skills, experience, and preferences';
COMMENT ON COLUMN job_seeker_profiles.watermarked IS 'Whether resume has watermark for security';
COMMENT ON COLUMN job_seeker_profiles.visibility IS 'Public or community-only visibility';
