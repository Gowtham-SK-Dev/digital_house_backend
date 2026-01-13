-- Migration: 013_create_admin_verifications_table.sql
-- Description: Create admin_verifications table for verification records
-- Date: 2024-01-13

-- UP: Create table
CREATE TABLE IF NOT EXISTS admin_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Profile being verified
  profile_id UUID NOT NULL UNIQUE REFERENCES marriage_profiles(id) ON DELETE CASCADE,
  
  -- Verification Checklist
  id_proof_verified BOOLEAN DEFAULT FALSE,
  horoscope_verified BOOLEAN DEFAULT FALSE,
  photos_verified BOOLEAN DEFAULT FALSE,
  personal_details_verified BOOLEAN DEFAULT FALSE,
  community_proof_verified BOOLEAN DEFAULT FALSE,
  
  -- Duplicate Detection
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_profile_id UUID REFERENCES marriage_profiles(id),
  
  -- Verification Details
  verification_notes TEXT,
  red_flags TEXT,
  
  -- Admin Action
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  decision VARCHAR(50), -- 'approved'|'rejected'|'pending_reupload'
  
  -- Reupload Tracking
  reupload_requested_for VARCHAR(100), -- 'horoscope'|'photos'|'id_proof'
  reupload_count INTEGER DEFAULT 0,
  last_reupload_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_verifications_profile_id ON admin_verifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_admin_verifications_decision ON admin_verifications(decision);
CREATE INDEX IF NOT EXISTS idx_admin_verifications_verified_at ON admin_verifications(verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_verifications_is_duplicate ON admin_verifications(is_duplicate);

-- DOWN: Drop table
-- DROP TABLE IF EXISTS admin_verifications CASCADE;
