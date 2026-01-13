-- Migration: 014_create_marriage_reports_table.sql
-- Description: Create marriage_reports table for abuse reports
-- Date: 2024-01-13

-- UP: Create table
CREATE TABLE IF NOT EXISTS marriage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Report Details
  reported_profile_id UUID NOT NULL REFERENCES marriage_profiles(id) ON DELETE CASCADE,
  reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Report Type
  report_type VARCHAR(100) NOT NULL, -- 'fake_profile'|'inappropriate_behavior'|'spam'|'fraud'|'wrong_info'|'scam'
  details TEXT,
  screenshots JSONB, -- [{url, uploadedAt}, ...]
  
  -- Report Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending'|'investigating'|'resolved'|'false_report'
  admin_notes TEXT,
  
  -- Admin Response
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  
  -- Action Taken
  action_taken VARCHAR(100), -- 'none'|'warn'|'ban'|'profile_deleted'|'user_suspended'
  action_taken_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marriage_reports_reported_profile_id ON marriage_reports(reported_profile_id);
CREATE INDEX IF NOT EXISTS idx_marriage_reports_reported_by_user_id ON marriage_reports(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_marriage_reports_status ON marriage_reports(status);
CREATE INDEX IF NOT EXISTS idx_marriage_reports_created_at ON marriage_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marriage_reports_report_type ON marriage_reports(report_type);

-- DOWN: Drop table
-- DROP TABLE IF EXISTS marriage_reports CASCADE;
