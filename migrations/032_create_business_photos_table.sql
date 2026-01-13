-- Business Photos Table
CREATE TABLE IF NOT EXISTS business_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    watermarked_url VARCHAR(500),
    photo_type VARCHAR(50), -- profile|gallery|document|verification
    caption VARCHAR(500),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    is_watermarked BOOLEAN DEFAULT false,
    verification_flag VARCHAR(50), -- clean|suspicious|rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_business_photos_business_id ON business_photos(business_id);
CREATE INDEX idx_business_photos_is_primary ON business_photos(is_primary);
CREATE INDEX idx_business_photos_photo_type ON business_photos(photo_type);
CREATE INDEX idx_business_photos_created_at ON business_photos(created_at);
CREATE INDEX idx_business_photos_deleted_at ON business_photos(deleted_at);

-- Trigger
CREATE TRIGGER update_business_photos_updated_at
BEFORE UPDATE ON business_photos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
