-- Migration: 002_create_user_profiles_table
-- Date: 2024-01-05
-- Description: Create user profiles table with extended user information

-- UP
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  profile_picture VARCHAR(500),
  bio TEXT,
  location VARCHAR(255),
  work_info JSONB,
  marital_status VARCHAR(50),
  interests TEXT[],
  skills TEXT[],
  business_info JSONB,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  verification_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(verified);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- DOWN
-- DROP INDEX IF EXISTS idx_user_profiles_created_at;
-- DROP INDEX IF EXISTS idx_user_profiles_location;
-- DROP INDEX IF EXISTS idx_user_profiles_verified;
-- DROP INDEX IF EXISTS idx_user_profiles_user_id;
-- DROP TABLE IF EXISTS user_profiles;
