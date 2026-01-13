-- Business Categories Table
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(500),
    slug VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_business_categories_slug ON business_categories(slug);
CREATE INDEX idx_business_categories_active ON business_categories(is_active);
CREATE INDEX idx_business_categories_created_at ON business_categories(created_at);
CREATE INDEX idx_business_categories_deleted_at ON business_categories(deleted_at);

-- Trigger for updated_at
CREATE TRIGGER update_business_categories_updated_at
BEFORE UPDATE ON business_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
