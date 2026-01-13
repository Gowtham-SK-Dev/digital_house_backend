-- Saved Businesses Table
CREATE TABLE IF NOT EXISTS saved_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint
ALTER TABLE saved_businesses ADD CONSTRAINT unique_user_business
UNIQUE (user_id, business_id);

-- Indexes
CREATE INDEX idx_saved_businesses_user_id ON saved_businesses(user_id);
CREATE INDEX idx_saved_businesses_business_id ON saved_businesses(business_id);
CREATE INDEX idx_saved_businesses_saved_at ON saved_businesses(saved_at);
