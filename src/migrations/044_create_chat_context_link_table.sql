-- Chat Context Link Table
-- Links chat rooms to their context (marriage profile, job post, etc.)
-- Enables audit trails and context-aware moderation
CREATE TABLE IF NOT EXISTS chat_context_links (
  context_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Chat Reference
  chat_id UUID NOT NULL REFERENCES chat_rooms(chat_id) ON DELETE CASCADE,
  
  -- Context Reference
  context_type VARCHAR(50) NOT NULL CHECK (context_type IN ('marriage', 'job', 'business', 'help', 'general')),
  context_id UUID NOT NULL,
  
  -- Source (what initiated this chat)
  initiated_from VARCHAR(100), -- 'marriage_interest', 'job_shortlist', 'business_inquiry', etc.
  
  -- Approval Status (for marriage/job contexts)
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP,
  approved_by UUID,
  
  -- Expiry (context may expire, closing chat)
  expires_at TIMESTAMP,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_chat_context_link_chat ON chat_context_links(chat_id);
CREATE INDEX idx_chat_context_link_context ON chat_context_links(context_type, context_id);
CREATE INDEX idx_chat_context_link_active ON chat_context_links(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_chat_context_link_approval ON chat_context_links(requires_approval, approved_at);
CREATE INDEX idx_chat_context_link_expiry ON chat_context_links(expires_at) WHERE expires_at IS NOT NULL;
