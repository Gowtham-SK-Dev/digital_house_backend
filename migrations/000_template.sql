-- Migration: XXX_describe_migration_here
-- Date: YYYY-MM-DD
-- Description: Clear description of what this migration does
-- Author: Your Name
-- Status: [new|tested|deployed]

/*
  EXAMPLE MIGRATION TEMPLATE
  
  Use this template for creating new migrations.
  
  Rules:
  1. One logical change per migration
  2. Always use IF NOT EXISTS / IF EXISTS for idempotency
  3. Include down() section with rollback
  4. Add indexes for frequently queried columns
  5. Use timestamps (created_at, updated_at)
  6. Include comments explaining complex logic
*/

-- UP
-- Example: Creating a new table
-- CREATE TABLE IF NOT EXISTS new_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   description TEXT,
--   status VARCHAR(50) DEFAULT 'active',
--   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
--   deleted_at TIMESTAMP
-- );

-- Example: Creating indexes
-- CREATE INDEX IF NOT EXISTS idx_new_table_status ON new_table(status);
-- CREATE INDEX IF NOT EXISTS idx_new_table_created_at ON new_table(created_at DESC);

-- Example: Adding a column
-- ALTER TABLE existing_table
-- ADD COLUMN IF NOT EXISTS new_column VARCHAR(255) DEFAULT 'default_value';

-- Example: Creating a junction table
-- CREATE TABLE IF NOT EXISTS junction_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   table1_id UUID NOT NULL REFERENCES table1(id) ON DELETE CASCADE,
--   table2_id UUID NOT NULL REFERENCES table2(id) ON DELETE CASCADE,
--   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
--   UNIQUE(table1_id, table2_id)
-- );

-- DOWN
-- Example: Dropping a table
-- DROP TABLE IF EXISTS new_table;

-- Example: Dropping indexes
-- DROP INDEX IF EXISTS idx_new_table_status;
-- DROP INDEX IF EXISTS idx_new_table_created_at;

-- Example: Removing a column
-- ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

-- Example: Dropping junction table
-- DROP TABLE IF EXISTS junction_table;
