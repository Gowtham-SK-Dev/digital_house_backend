-- Migration: 007_create_post_comments_table
-- Date: 2024-01-10
-- Description: Create post comments table for comment threads

-- UP
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- DOWN
-- DROP INDEX IF EXISTS idx_post_comments_created_at;
-- DROP INDEX IF EXISTS idx_post_comments_user_id;
-- DROP INDEX IF EXISTS idx_post_comments_post_id;
-- DROP TABLE IF EXISTS post_comments;
