-- Business Notifications Table
CREATE TABLE IF NOT EXISTS business_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- inquiry|response|review|report|verification|message
    title VARCHAR(255),
    message TEXT,
    action_url VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_recipient_id ON business_notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON business_notifications(is_read);
CREATE INDEX idx_notifications_notification_type ON business_notifications(notification_type);
CREATE INDEX idx_notifications_created_at ON business_notifications(created_at);
CREATE INDEX idx_notifications_deleted_at ON business_notifications(deleted_at);

-- Trigger
CREATE TRIGGER update_business_notifications_updated_at
BEFORE UPDATE ON business_notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
