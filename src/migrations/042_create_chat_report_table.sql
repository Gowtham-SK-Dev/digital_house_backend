-- Chat Report Table
-- Tracks all user reports on messages and chats for moderation
CREATE TABLE IF NOT EXISTS chat_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  chat_id UUID NOT NULL REFERENCES chat_rooms(chat_id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(message_id) ON DELETE CASCADE,
  
  -- Reporter
  reported_by UUID NOT NULL REFERENCES users(user_id),
  
  -- Reportee (who's being reported)
  reported_user UUID NOT NULL REFERENCES users(user_id),
  
  -- Report Details
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
    'abuse', 'harassment', 'scam', 'hate_speech', 'sexual_content', 
    'spam', 'fraud', 'impersonation', 'other'
  )),
  
  description TEXT NOT NULL,
  
  -- Evidence
  screenshot_url VARCHAR(500),
  evidence_data JSONB, -- Additional structured evidence
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  
  -- Admin Actions
  reviewed_by UUID REFERENCES users(user_id),
  review_notes TEXT,
  action_taken VARCHAR(100), -- 'warning', 'mute', 'ban', 'none'
  resolved_at TIMESTAMP,
  
  -- Escalation
  escalated_to_legal BOOLEAN DEFAULT FALSE,
  legal_notes TEXT,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_chat_reports_chat ON chat_reports(chat_id);
CREATE INDEX idx_chat_reports_message ON chat_reports(message_id);
CREATE INDEX idx_chat_reports_reported_by ON chat_reports(reported_by);
CREATE INDEX idx_chat_reports_reported_user ON chat_reports(reported_user);
CREATE INDEX idx_chat_reports_status ON chat_reports(status);
CREATE INDEX idx_chat_reports_type ON chat_reports(report_type);
CREATE INDEX idx_chat_reports_pending ON chat_reports(status, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_chat_reports_user_reports ON chat_reports(reported_user, created_at DESC);
