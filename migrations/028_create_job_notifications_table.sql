-- Backend/migrations/028_create_job_notifications_table.sql
-- Job-related notifications for users

CREATE TABLE IF NOT EXISTS job_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Related Entities
  job_post_id UUID REFERENCES job_posts(id) ON DELETE SET NULL,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Notification Details
  notification_type VARCHAR(50) NOT NULL, -- 'job_approved', 'new_application', 'application_shortlisted', 'message_received', 'job_match', 'job_expiring', 'saved_job_updated'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500), -- URL to navigate when notification clicked
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notification_user ON job_notifications(user_id);
CREATE INDEX idx_notification_job ON job_notifications(job_post_id);
CREATE INDEX idx_notification_application ON job_notifications(job_application_id);
CREATE INDEX idx_notification_type ON job_notifications(notification_type);
CREATE INDEX idx_notification_is_read ON job_notifications(is_read);
CREATE INDEX idx_notification_created_at ON job_notifications(created_at DESC);
CREATE INDEX idx_notification_user_read ON job_notifications(user_id, is_read);

-- Comments
COMMENT ON TABLE job_notifications IS 'In-app notifications for job board activities';
COMMENT ON COLUMN job_notifications.notification_type IS 'Types: job_approved, new_application, application_shortlisted, message_received, job_match, job_expiring, saved_job_updated';
