-- Business Reports Table
CREATE TABLE IF NOT EXISTS business_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- fake_business|scam|inappropriate_content|false_claims|harassment|other
    reason_text TEXT,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'pending', -- pending|investigating|resolved|dismissed
    resolution VARCHAR(500),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    upvote_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_reports_business_id ON business_reports(business_id);
CREATE INDEX idx_reports_reporter_id ON business_reports(reporter_id);
CREATE INDEX idx_reports_report_type ON business_reports(report_type);
CREATE INDEX idx_reports_status ON business_reports(status);
CREATE INDEX idx_reports_created_at ON business_reports(created_at);
CREATE INDEX idx_reports_deleted_at ON business_reports(deleted_at);

-- Trigger
CREATE TRIGGER update_business_reports_updated_at
BEFORE UPDATE ON business_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
