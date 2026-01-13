-- Migration: 004_create_location_circles_table
-- Date: 2024-01-10
-- Description: Create location circles for geographic grouping

-- UP
CREATE TABLE IF NOT EXISTS location_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_circles_name ON location_circles(name);
CREATE INDEX IF NOT EXISTS idx_location_circles_location ON location_circles(location);

-- DOWN
-- DROP INDEX IF EXISTS idx_location_circles_location;
-- DROP INDEX IF EXISTS idx_location_circles_name;
-- DROP TABLE IF EXISTS location_circles;
