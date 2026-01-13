-- Business Verification Documents Table
CREATE TABLE IF NOT EXISTS business_verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- id_proof|business_proof|location_proof|community_proof
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'pending', -- pending|verified|rejected
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    verified_at TIMESTAMP,
    fraud_flags JSONB DEFAULT '[]'::jsonb,
    is_watermarked BOOLEAN DEFAULT false,
    watermarked_url VARCHAR(500),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_verification_documents_business_id ON business_verification_documents(business_id);
CREATE INDEX idx_verification_documents_document_type ON business_verification_documents(document_type);
CREATE INDEX idx_verification_documents_status ON business_verification_documents(verification_status);
CREATE INDEX idx_verification_documents_created_at ON business_verification_documents(created_at);

-- Trigger
CREATE TRIGGER update_verification_documents_updated_at
BEFORE UPDATE ON business_verification_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
