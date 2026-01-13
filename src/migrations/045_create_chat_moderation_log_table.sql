-- Chat Moderation Log Table
-- Tracks all admin moderation actions for accountability and pattern detection
CREATE TABLE IF NOT EXISTS chat_moderation_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Admin
  admin_id UUID NOT NULL REFERENCES users(user_id),
  
  -- Target
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('chat_room', 'message', 'user')),
  target_id UUID NOT NULL, -- chat_id, message_id, or user_id
  
  -- Action
  action VARCHAR(100) NOT NULL CHECK (action IN (
    'chat_warning', 'chat_mute', 'chat_close', 'message_delete', 'message_hide',
    'user_warn', 'user_mute', 'user_ban', 'user_unban', 'content_remove', 
    'report_resolve', 'report_dismiss', 'report_escalate'
  )),
  
  -- Details
  reason TEXT NOT NULL,
  duration_minutes INT, -- For temporary actions
  notes TEXT,
  
  -- Context
  related_report_id UUID REFERENCES chat_reports(report_id),
  related_chat_id UUID REFERENCES chat_rooms(chat_id),
  related_message_id UUID REFERENCES chat_messages(message_id),
  
  -- User Strikes (for tracking escalation)
  user_strike_count INT DEFAULT 1,
  
  -- Appeal
  appeal_allowed BOOLEAN DEFAULT TRUE,
  appeal_deadline TIMESTAMP,
  appealed_at TIMESTAMP,
  appeal_decision VARCHAR(50), -- 'upheld', 'overturned'
  appeal_reviewed_by UUID REFERENCES users(user_id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_chat_moderation_logs_admin ON chat_moderation_logs(admin_id, created_at DESC);
CREATE INDEX idx_chat_moderation_logs_target ON chat_moderation_logs(target_type, target_id, created_at DESC);
CREATE INDEX idx_chat_moderation_logs_action ON chat_moderation_logs(action, created_at DESC);
CREATE INDEX idx_chat_moderation_logs_appeal ON chat_moderation_logs(appeal_allowed, created_at DESC) WHERE appeal_allowed = TRUE;
CREATE INDEX idx_chat_moderation_logs_user_strikes ON chat_moderation_logs(target_id, created_at DESC) WHERE target_type = 'user';
CREATE INDEX idx_chat_moderation_logs_chat ON chat_moderation_logs(related_chat_id, created_at DESC);
