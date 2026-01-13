-- Business Services/Products Table
CREATE TABLE IF NOT EXISTS business_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
    service_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2),
    price_range VARCHAR(50), -- per_unit|fixed|range
    estimated_duration VARCHAR(100),
    availability VARCHAR(50), -- available|seasonal|custom
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_business_services_business_id ON business_services(business_id);
CREATE INDEX idx_business_services_created_at ON business_services(created_at);

-- Trigger
CREATE TRIGGER update_business_services_updated_at
BEFORE UPDATE ON business_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
