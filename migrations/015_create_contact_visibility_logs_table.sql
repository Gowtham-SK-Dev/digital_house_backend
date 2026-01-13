-- Migration: 015_create_contact_visibility_logs_table.sql
-- Description: Create contact_visibility_logs table for privacy audit trail
-- Date: 2024-01-13

-- UP: Create table
CREATE TABLE IF NOT EXISTS contact_visibility_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who viewed what
  viewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES marriage_interests(id),
  
  -- What was revealed
  info_revealed VARCHAR(100) NOT NULL, -- 'phone'|'email'|'address'|'full_photo'|'horoscope'|'family_details'
  revealed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Context
  context VARCHAR(100), -- 'interest_accepted'|'mutual_approval'|'admin_request'|'direct_contact'
  
  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_visibility_logs_viewer_id ON contact_visibility_logs(viewer_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_visibility_logs_viewed_id ON contact_visibility_logs(viewed_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_visibility_logs_info_revealed ON contact_visibility_logs(info_revealed);
CREATE INDEX IF NOT EXISTS idx_contact_visibility_logs_created_at ON contact_visibility_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_visibility_logs_interest_id ON contact_visibility_logs(interest_id);

-- DOWN: Drop table
-- DROP TABLE IF EXISTS contact_visibility_logs CASCADE;
