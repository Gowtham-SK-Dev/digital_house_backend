-- Business Reviews Table
CREATE TABLE IF NOT EXISTS business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inquiry_id UUID NOT NULL REFERENCES business_inquiries(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    moderation_status VARCHAR(50) DEFAULT 'pending', -- pending|approved|rejected|hidden
    moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    moderation_reason TEXT,
    moderated_at TIMESTAMP,
    helpful_count INT DEFAULT 0,
    unhelpful_count INT DEFAULT 0,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_reviews_business_id ON business_reviews(business_id);
CREATE INDEX idx_reviews_reviewer_id ON business_reviews(reviewer_id);
CREATE INDEX idx_reviews_rating ON business_reviews(rating);
CREATE INDEX idx_reviews_moderation_status ON business_reviews(moderation_status);
CREATE INDEX idx_reviews_created_at ON business_reviews(created_at);
CREATE INDEX idx_reviews_deleted_at ON business_reviews(deleted_at);

-- Trigger
CREATE TRIGGER update_business_reviews_updated_at
BEFORE UPDATE ON business_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
