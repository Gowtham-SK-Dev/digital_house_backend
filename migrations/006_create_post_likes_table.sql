-- Migration: 006_create_post_likes_table
-- Date: 2024-01-10
-- Description: Create post likes table for tracking likes

-- UP
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- DOWN
-- DROP INDEX IF EXISTS idx_post_likes_user_id;
-- DROP INDEX IF EXISTS idx_post_likes_post_id;
-- DROP TABLE IF EXISTS post_likes;
