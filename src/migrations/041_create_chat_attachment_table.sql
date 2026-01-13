-- Chat Attachment Table
-- Stores secure file uploads with encryption and access control
CREATE TABLE IF NOT EXISTS chat_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  message_id UUID NOT NULL REFERENCES chat_messages(message_id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES chat_rooms(chat_id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(user_id),
  
  -- File Metadata
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100),
  
  -- Storage
  file_path VARCHAR(500) NOT NULL,
  encrypted_file_path VARCHAR(500),
  file_hash VARCHAR(64), -- SHA-256 for integrity verification
  
  -- Security
  is_encrypted BOOLEAN DEFAULT TRUE,
  is_downloaded BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0,
  
  -- Access Control
  download_allowed BOOLEAN DEFAULT FALSE, -- Disabled by default
  expiry_at TIMESTAMP, -- Auto-delete after expiry
  
  -- Safety
  virus_scanned BOOLEAN DEFAULT FALSE,
  virus_status VARCHAR(50), -- 'clean', 'infected', 'suspicious'
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_chat_attachments_message ON chat_attachments(message_id);
CREATE INDEX idx_chat_attachments_chat ON chat_attachments(chat_id);
CREATE INDEX idx_chat_attachments_uploaded ON chat_attachments(uploaded_by);
CREATE INDEX idx_chat_attachments_scanned ON chat_attachments(virus_scanned);
CREATE INDEX idx_chat_attachments_expiry ON chat_attachments(expiry_at) WHERE expiry_at IS NOT NULL;
