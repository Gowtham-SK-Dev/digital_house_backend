-- Business Profiles Table
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL REFERENCES business_categories(id),
    description TEXT,
    experience_years INT DEFAULT 0,
    address VARCHAR(500),
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    location_coordinates JSONB, -- {"latitude": 0, "longitude": 0}
    working_hours JSONB, -- {"monday": {"open": "09:00", "close": "18:00"}}
    contact_mode VARCHAR(50), -- "call|chat|email"
    phone VARCHAR(20),
    email VARCHAR(255),
    whatsapp VARCHAR(20),
    website VARCHAR(500),
    price_range VARCHAR(50), -- "affordable|mid-range|premium|luxury"
    service_area VARCHAR(500), -- comma-separated cities/areas
    home_delivery BOOLEAN DEFAULT false,
    verification_status VARCHAR(50) DEFAULT 'pending', -- pending|verified|rejected
    verification_date TIMESTAMP,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    total_inquiries INT DEFAULT 0,
    total_reviews INT DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    fraud_flags JSONB DEFAULT '[]'::jsonb, -- array of fraud detection flags
    is_blocked BOOLEAN DEFAULT false,
    blocked_reason TEXT,
    blocked_at TIMESTAMP,
    last_active TIMESTAMP,
    visibility VARCHAR(50) DEFAULT 'public', -- public|private
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_business_profiles_owner_id ON business_profiles(owner_id);
CREATE INDEX idx_business_profiles_category_id ON business_profiles(category_id);
CREATE INDEX idx_business_profiles_city ON business_profiles(city);
CREATE INDEX idx_business_profiles_district ON business_profiles(district);
CREATE INDEX idx_business_profiles_state ON business_profiles(state);
CREATE INDEX idx_business_profiles_verification_status ON business_profiles(verification_status);
CREATE INDEX idx_business_profiles_is_blocked ON business_profiles(is_blocked);
CREATE INDEX idx_business_profiles_average_rating ON business_profiles(average_rating DESC);
CREATE INDEX idx_business_profiles_business_name ON business_profiles USING GIN(to_tsvector('english', business_name));
CREATE INDEX idx_business_profiles_description ON business_profiles USING GIN(to_tsvector('english', description));
CREATE INDEX idx_business_profiles_created_at ON business_profiles(created_at);
CREATE INDEX idx_business_profiles_deleted_at ON business_profiles(deleted_at);

-- Trigger for updated_at
CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
