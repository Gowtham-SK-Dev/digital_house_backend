-- Backend/migrations/027_create_job_requirements_table.sql
-- Reusable job requirements/skills library

CREATE TABLE IF NOT EXISTS job_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Requirement Details
  requirement_name VARCHAR(255) NOT NULL,
  requirement_type VARCHAR(50) NOT NULL, -- 'skill', 'qualification', 'experience'
  category VARCHAR(100), -- 'programming', 'soft_skill', 'education', 'certification'
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INT DEFAULT 0, -- how many jobs use this requirement
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique constraint
ALTER TABLE job_requirements ADD CONSTRAINT uk_requirement_name UNIQUE(requirement_name);

-- Indexes
CREATE INDEX idx_requirement_type ON job_requirements(requirement_type);
CREATE INDEX idx_requirement_category ON job_requirements(category);
CREATE INDEX idx_requirement_active ON job_requirements(is_active);
CREATE INDEX idx_requirement_usage ON job_requirements(usage_count DESC);

-- Pre-populate common skills and requirements
INSERT INTO job_requirements (requirement_name, requirement_type, category) VALUES
  ('JavaScript', 'skill', 'programming'),
  ('Python', 'skill', 'programming'),
  ('React', 'skill', 'programming'),
  ('Node.js', 'skill', 'programming'),
  ('SQL', 'skill', 'programming'),
  ('Communication', 'skill', 'soft_skill'),
  ('Leadership', 'skill', 'soft_skill'),
  ('Problem Solving', 'skill', 'soft_skill'),
  ('Bachelor''s Degree', 'qualification', 'education'),
  ('Master''s Degree', 'qualification', 'education'),
  ('MBA', 'qualification', 'education')
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE job_requirements IS 'Library of reusable skills, qualifications, and requirements';
