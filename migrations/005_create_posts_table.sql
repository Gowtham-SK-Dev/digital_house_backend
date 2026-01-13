-- Migration: 005_create_posts_table
-- Date: 2024-01-10
-- Description: Create posts table for main feed content

-- UP
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content JSONB NOT NULL,
  category VARCHAR(50) NOT NULL,
  location_circle_id UUID REFERENCES location_circles(id),
  visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_location_circle_id ON posts(location_circle_id);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);

-- DOWN
-- DROP INDEX IF EXISTS idx_posts_visibility;
-- DROP INDEX IF EXISTS idx_posts_location_circle_id;
-- DROP INDEX IF EXISTS idx_posts_created_at;
-- DROP INDEX IF EXISTS idx_posts_category;
-- DROP INDEX IF EXISTS idx_posts_user_id;
-- DROP TABLE IF EXISTS posts;
