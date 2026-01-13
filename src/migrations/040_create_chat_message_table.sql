-- Chat Message Table
-- Stores encrypted messages with spam/abuse detection flags
CREATE TABLE IF NOT EXISTS chat_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  chat_id UUID NOT NULL REFERENCES chat_rooms(chat_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Message Content
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
  content TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  reply_to_id UUID REFERENCES chat_messages(message_id) ON DELETE SET NULL,
  
  -- Safety Flags
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason VARCHAR(255),
  flagged_by VARCHAR(50), -- 'system' or 'admin'
  contains_phone BOOLEAN DEFAULT FALSE,
  contains_email BOOLEAN DEFAULT FALSE,
  contains_upi BOOLEAN DEFAULT FALSE,
  contains_external_link BOOLEAN DEFAULT FALSE,
  contains_suspicious_keyword BOOLEAN DEFAULT FALSE,
  
  -- Moderation
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID,
  deleted_at TIMESTAMP,
  
  -- Soft delete (user deletion, not moderation)
  is_hidden BOOLEAN DEFAULT FALSE, -- Hidden from sender's view
  is_retracted BOOLEAN DEFAULT FALSE, -- Message recalled/retracted
  
  -- Reporting
  report_count INT DEFAULT 0,
  
  -- Timestamps
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  edited_at TIMESTAMP
);

-- Indexes for fast lookup
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id, sent_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id, sent_at DESC);
CREATE INDEX idx_chat_messages_flagged ON chat_messages(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_chat_messages_unread ON chat_messages(chat_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_chat_messages_suspicious ON chat_messages(chat_id) WHERE 
  (contains_phone = TRUE OR contains_email = TRUE OR contains_upi = TRUE OR 
   contains_external_link = TRUE OR contains_suspicious_keyword = TRUE);
CREATE INDEX idx_chat_messages_created ON chat_messages(sent_at DESC);
