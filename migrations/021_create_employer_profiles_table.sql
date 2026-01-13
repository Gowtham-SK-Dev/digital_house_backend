-- Backend/migrations/021_create_employer_profiles_table.sql
-- Employer/company profile storage

CREATE TABLE IF NOT EXISTS employer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Company Information
  company_name VARCHAR(255) NOT NULL,
  company_email VARCHAR(255) NOT NULL,
  company_phone VARCHAR(20),
  company_website VARCHAR(500),
  linkedin_profile VARCHAR(500),
  company_description TEXT,
  company_size VARCHAR(50), -- 'startup', 'small', 'medium', 'large', 'enterprise'
  industry VARCHAR(100),
  
  -- Location
  office_location VARCHAR(255),
  office_city VARCHAR(100),
  office_state VARCHAR(100),
  office_country VARCHAR(100),
  
  -- Documents & Verification
  company_registration_doc_url VARCHAR(500),
  id_proof_url VARCHAR(500),
  id_proof_type VARCHAR(50), -- 'aadhar', 'pan', 'driving_license', 'passport'
  id_proof_name VARCHAR(255),
  
  -- Verification Status
  verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  
  -- Metadata
  total_jobs_posted INT DEFAULT 0,
  total_applications INT DEFAULT 0,
  total_hires INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0.0,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  blocked_at TIMESTAMP,
  blocked_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_employer_user_id ON employer_profiles(user_id);
CREATE INDEX idx_employer_verification_status ON employer_profiles(verification_status);
CREATE INDEX idx_employer_company_name ON employer_profiles(company_name);
CREATE INDEX idx_employer_is_blocked ON employer_profiles(is_blocked);
CREATE INDEX idx_employer_rating ON employer_profiles(rating DESC);
CREATE INDEX idx_employer_created_at ON employer_profiles(created_at DESC);

-- Comments
COMMENT ON TABLE employer_profiles IS 'Stores employer/company profiles with verification status';
COMMENT ON COLUMN employer_profiles.verification_status IS 'Must be verified before posting jobs';
COMMENT ON COLUMN employer_profiles.is_blocked IS 'Blocks all activity if TRUE';
