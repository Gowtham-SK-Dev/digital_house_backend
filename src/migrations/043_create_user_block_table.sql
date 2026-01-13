-- User Block Table
-- Tracks user blocks for privacy and safety
CREATE TABLE IF NOT EXISTS user_blocks (
  block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Blocker (who's doing the blocking)
  blocker_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Blocked User
  blocked_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Block Details
  block_reason VARCHAR(255),
  block_type VARCHAR(50) DEFAULT 'manual' CHECK (block_type IN ('manual', 'admin', 'automatic')),
  
  -- Temporary vs Permanent
  is_permanent BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP, -- For temporary blocks
  
  -- Admin Actions (if auto-blocked or admin-blocked)
  blocked_by_admin UUID REFERENCES users(user_id),
  admin_reason TEXT,
  
  -- Soft delete (unblock)
  is_active BOOLEAN DEFAULT TRUE,
  unblocked_at TIMESTAMP,
  unblocked_by UUID,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX idx_user_blocks_active ON user_blocks(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_blocks_pair ON user_blocks(blocker_id, blocked_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_blocks_expired ON user_blocks(expires_at) WHERE expires_at IS NOT NULL AND is_active = TRUE;

-- Ensure can't block self
ALTER TABLE user_blocks ADD CONSTRAINT no_self_block CHECK (blocker_id != blocked_id);

-- Prevent duplicate active blocks
CREATE UNIQUE INDEX idx_user_blocks_unique_active ON user_blocks(blocker_id, blocked_id) 
WHERE is_active = TRUE;
