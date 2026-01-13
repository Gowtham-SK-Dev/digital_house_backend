-- Business Inquiries Table
CREATE TABLE IF NOT EXISTS business_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    inquirer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES business_services(id) ON DELETE SET NULL,
    inquiry_type VARCHAR(50), -- call|chat|email|whatsapp
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending|responded|completed|closed
    response_message TEXT,
    responded_at TIMESTAMP,
    conversation_data JSONB DEFAULT '{}'::jsonb,
    contact_shared BOOLEAN DEFAULT false,
    can_review BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_inquiries_business_id ON business_inquiries(business_id);
CREATE INDEX idx_inquiries_inquirer_id ON business_inquiries(inquirer_id);
CREATE INDEX idx_inquiries_status ON business_inquiries(status);
CREATE INDEX idx_inquiries_created_at ON business_inquiries(created_at);
CREATE INDEX idx_inquiries_deleted_at ON business_inquiries(deleted_at);

-- Trigger
CREATE TRIGGER update_business_inquiries_updated_at
BEFORE UPDATE ON business_inquiries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
