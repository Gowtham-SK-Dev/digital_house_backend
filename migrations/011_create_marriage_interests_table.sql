-- Migration: 011_create_marriage_interests_table.sql
-- Description: Create marriage_interests table for interest requests
-- Date: 2024-01-13

-- UP: Create table
CREATE TABLE IF NOT EXISTS marriage_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who sent interest
  sender_profile_id UUID NOT NULL REFERENCES marriage_profiles(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Who received interest
  receiver_profile_id UUID NOT NULL REFERENCES marriage_profiles(id) ON DELETE CASCADE,
  receiver_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Status & Details
  status VARCHAR(50) NOT NULL DEFAULT 'sent', -- 'sent'|'accepted'|'rejected'|'pending_admin_review'
  message TEXT,
  
  -- Response Details
  responded_at TIMESTAMP,
  responded_by UUID REFERENCES users(id),
  
  -- Admin Review
  admin_review_requested BOOLEAN DEFAULT FALSE,
  admin_reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  admin_review_notes TEXT,
  
  -- Contact Details
  contact_details_shared_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(sender_profile_id, receiver_profile_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marriage_interests_receiver_user_id ON marriage_interests(receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_marriage_interests_sender_user_id ON marriage_interests(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_marriage_interests_status ON marriage_interests(status);
CREATE INDEX IF NOT EXISTS idx_marriage_interests_created_at ON marriage_interests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marriage_interests_receiver_profile_id ON marriage_interests(receiver_profile_id);
CREATE INDEX IF NOT EXISTS idx_marriage_interests_sender_profile_id ON marriage_interests(sender_profile_id);

-- DOWN: Drop table (commented out)
-- DROP TABLE IF EXISTS marriage_interests CASCADE;
