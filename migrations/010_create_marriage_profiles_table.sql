-- Migration: 010_create_marriage_profiles_table.sql
-- Description: Create marriage_profiles table for matrimonial profiles
-- Date: 2024-01-13
-- Author: DigitalConnect Team

-- UP: Create table
CREATE TABLE IF NOT EXISTS marriage_profiles (
  -- System Fields
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_by VARCHAR(50) NOT NULL DEFAULT 'self', -- 'self'|'parent'|'guardian'
  created_by_user_id UUID REFERENCES users(id),
  
  -- Verification
  verification_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending'|'verified'|'rejected'|'pending_reupload'
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  
  -- Personal Details
  name VARCHAR(255) NOT NULL,
  gender VARCHAR(20) NOT NULL, -- 'male'|'female'
  date_of_birth DATE NOT NULL,
  age INTEGER,
  
  -- Physical Details
  height VARCHAR(50),
  weight VARCHAR(50),
  complexion VARCHAR(50), -- 'fair'|'wheatish'|'dark'
  
  -- Education & Career
  education VARCHAR(255),
  profession VARCHAR(255),
  income VARCHAR(50),
  
  -- Location
  native_place VARCHAR(255),
  current_location VARCHAR(255),
  
  -- Astrological Details
  caste VARCHAR(100),
  sub_caste VARCHAR(100),
  gothram VARCHAR(100),
  raasi VARCHAR(50),
  natchathiram VARCHAR(100),
  dosham_details JSONB, -- {type: 'mangal'|'rajju'|'none'|'other', severity: 'none'|'mild'|'moderate'|'severe', description: ''}
  time_of_birth TIME,
  place_of_birth VARCHAR(255),
  
  -- Marital Status
  marital_status VARCHAR(50),
  
  -- Family & Expectations
  family_details JSONB, -- {fatherName, fatherProfession, motherName, motherProfession, siblingsCount, ...}
  expectations JSONB, -- {ageRange, heightRange, education[], profession[], ...}
  
  -- Media
  photos JSONB, -- [{id, url, uploadedAt, isBlurred, watermarked}, ...]
  horoscope_file JSONB, -- {id, documentUrl, fileType, uploadedAt, verified}
  id_proof_file JSONB, -- {id, documentUrl, documentType, uploadedAt, verified}
  community_proof_file JSONB, -- {id, documentUrl, uploadedAt}
  
  -- Privacy & Contact
  contact_visibility VARCHAR(50) DEFAULT 'after_accept', -- 'hidden'|'after_accept'
  
  -- Metadata
  profile_completeness INTEGER DEFAULT 0,
  match_score INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  interests_received INTEGER DEFAULT 0,
  last_active TIMESTAMP DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marriage_profiles_user_id ON marriage_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_marriage_profiles_verification_status ON marriage_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_marriage_profiles_gender_age_location ON marriage_profiles(gender, age, current_location);
CREATE INDEX IF NOT EXISTS idx_marriage_profiles_created_at ON marriage_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marriage_profiles_match_score ON marriage_profiles(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_marriage_profiles_caste ON marriage_profiles(caste);
CREATE INDEX IF NOT EXISTS idx_marriage_profiles_raasi ON marriage_profiles(raasi);
CREATE INDEX IF NOT EXISTS idx_marriage_profiles_deleted_at ON marriage_profiles(deleted_at);

-- DOWN: Drop table (commented out, uncomment to rollback)
-- DROP TABLE IF EXISTS marriage_profiles CASCADE;
