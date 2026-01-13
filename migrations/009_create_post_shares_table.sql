-- Migration: 009_create_post_shares_table
-- Date: 2024-01-10
-- Description: Create post shares table for tracking shares

-- UP
CREATE TABLE IF NOT EXISTS post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_shares_original_post_id ON post_shares(original_post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON post_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_created_at ON post_shares(created_at DESC);

-- DOWN
-- DROP INDEX IF EXISTS idx_post_shares_created_at;
-- DROP INDEX IF EXISTS idx_post_shares_user_id;
-- DROP INDEX IF EXISTS idx_post_shares_original_post_id;
-- DROP TABLE IF EXISTS post_shares;
