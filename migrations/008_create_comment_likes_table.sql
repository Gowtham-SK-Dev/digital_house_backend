-- Migration: 008_create_comment_likes_table
-- Date: 2024-01-10
-- Description: Create comment likes table for like tracking on comments

-- UP
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- DOWN
-- DROP INDEX IF EXISTS idx_comment_likes_user_id;
-- DROP INDEX IF EXISTS idx_comment_likes_comment_id;
-- DROP TABLE IF EXISTS comment_likes;
