-- Chat Room Table
-- Stores secure, context-aware chat rooms between users
CREATE TABLE IF NOT EXISTS chat_rooms (
  chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  user_id_a UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  user_id_b UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Context (what this chat is about)
  context_type VARCHAR(50) NOT NULL CHECK (context_type IN ('marriage', 'job', 'business', 'help', 'general')),
  context_id UUID, -- Links to marriage profile, job post, business listing, or help post
  
  -- Status Management
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'muted', 'blocked', 'reported', 'closed')),
  
  -- Mute Info (one user can mute without blocking the other)
  muted_by UUID, -- Who muted (can be user_id_a or user_id_b)
  muted_at TIMESTAMP,
  
  -- Block Info
  blocked_by UUID, -- Who blocked (unidirectional block)
  blocked_at TIMESTAMP,
  block_reason VARCHAR(255),
  
  -- Report Info
  reported_by UUID, -- Who reported
  report_reason VARCHAR(255),
  reported_at TIMESTAMP,
  
  -- Metadata
  last_message_id UUID,
  last_message_at TIMESTAMP,
  message_count INT DEFAULT 0,
  unread_count_a INT DEFAULT 0,
  unread_count_b INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID,
  deleted_at TIMESTAMP
);

-- Indexes for fast lookup
CREATE INDEX idx_chat_rooms_users ON chat_rooms(user_id_a, user_id_b);
CREATE INDEX idx_chat_rooms_status ON chat_rooms(status);
CREATE INDEX idx_chat_rooms_context ON chat_rooms(context_type, context_id);
CREATE INDEX idx_chat_rooms_created ON chat_rooms(created_at DESC);
CREATE INDEX idx_chat_rooms_active ON chat_rooms(status) WHERE status != 'closed' AND is_deleted = FALSE;
CREATE INDEX idx_chat_rooms_unread_a ON chat_rooms(unread_count_a) WHERE unread_count_a > 0;
CREATE INDEX idx_chat_rooms_unread_b ON chat_rooms(unread_count_b) WHERE unread_count_b > 0;

-- Verify unique participant pairs
ALTER TABLE chat_rooms ADD CONSTRAINT unique_chat_participants UNIQUE (
  CASE WHEN user_id_a < user_id_b THEN user_id_a ELSE user_id_b END,
  CASE WHEN user_id_a < user_id_b THEN user_id_b ELSE user_id_a END,
  context_type,
  context_id
);
