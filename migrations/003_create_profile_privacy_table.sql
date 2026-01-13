-- Migration: 003_create_profile_privacy_table
-- Date: 2024-01-05
-- Description: Create privacy settings table for user profiles

-- UP
CREATE TABLE IF NOT EXISTS profile_privacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  profile_picture_level VARCHAR(20) DEFAULT 'public',
  bio_level VARCHAR(20) DEFAULT 'public',
  location_level VARCHAR(20) DEFAULT 'public',
  work_info_level VARCHAR(20) DEFAULT 'public',
  marital_status_level VARCHAR(20) DEFAULT 'public',
  interests_level VARCHAR(20) DEFAULT 'public',
  skills_level VARCHAR(20) DEFAULT 'public',
  business_info_level VARCHAR(20) DEFAULT 'public',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_privacy_user_id ON profile_privacy(user_id);

-- DOWN
-- DROP INDEX IF EXISTS idx_profile_privacy_user_id;
-- DROP TABLE IF EXISTS profile_privacy;
