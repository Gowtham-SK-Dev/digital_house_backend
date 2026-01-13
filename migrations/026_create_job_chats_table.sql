-- Backend/migrations/026_create_job_chats_table.sql
-- Direct messaging between employers and job seekers

CREATE TABLE IF NOT EXISTS job_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Conversation Metadata
  conversation_id VARCHAR(255) NOT NULL, -- unique conversation identifier
  
  -- Participants
  employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Related Job (optional, can be NULL for direct messages)
  job_post_id UUID REFERENCES job_posts(id) ON DELETE SET NULL,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  
  -- Message Details
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  sender_type VARCHAR(20) NOT NULL, -- 'employer', 'seeker'
  message_text TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'offer', 'status_update'
  
  -- Media/Attachments
  attachment_urls TEXT[], -- array of file URLs
  has_external_links BOOLEAN DEFAULT FALSE,
  
  -- Message Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason VARCHAR(100), -- 'spam', 'inappropriate', 'suspicious_link', 'harassment'
  flagged_at TIMESTAMP,
  is_hidden BOOLEAN DEFAULT FALSE, -- hidden by moderator
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_conversation ON job_chats(conversation_id);
CREATE INDEX idx_chat_employer ON job_chats(employer_id);
CREATE INDEX idx_chat_seeker ON job_chats(job_seeker_id);
CREATE INDEX idx_chat_job ON job_chats(job_post_id);
CREATE INDEX idx_chat_application ON job_chats(job_application_id);
CREATE INDEX idx_chat_sender ON job_chats(sender_id);
CREATE INDEX idx_chat_is_read ON job_chats(is_read);
CREATE INDEX idx_chat_created_at ON job_chats(created_at DESC);
CREATE INDEX idx_chat_flagged ON job_chats(is_flagged);
CREATE INDEX idx_chat_conversation_time ON job_chats(conversation_id, created_at DESC);

-- Comments
COMMENT ON TABLE job_chats IS 'Messaging between employers and job seekers';
COMMENT ON COLUMN job_chats.conversation_id IS 'Unique identifier grouping messages in same conversation';
COMMENT ON COLUMN job_chats.message_type IS 'Regular messages or special types like offer or status updates';
COMMENT ON COLUMN job_chats.has_external_links IS 'Automatically detected for safety';
COMMENT ON COLUMN job_chats.is_hidden IS 'Admin can hide abusive messages';
