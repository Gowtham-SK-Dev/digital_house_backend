# Database Migrations Guide

## Overview

This document explains how to manage database schema changes using SQL migration files.

## Why Migrations?

- **Version Control**: Track database schema changes
- **Reproducibility**: Same schema everywhere (dev, staging, prod)
- **Rollback Support**: Undo changes if needed
- **Team Collaboration**: Clear change history
- **CI/CD Integration**: Automated deployments

## Migration Files

Located in: `Backend/migrations/`

### Current Migrations

| # | Name | Table | Purpose |
|---|------|-------|---------|
| 001 | create_users_table | users | Base user table |
| 002 | create_user_profiles_table | user_profiles | User profile info |
| 003 | create_profile_privacy_table | profile_privacy | Privacy settings |
| 004 | create_location_circles_table | location_circles | Geographic circles |
| 005 | create_posts_table | posts | Post content |
| 006 | create_post_likes_table | post_likes | Post likes |
| 007 | create_post_comments_table | post_comments | Comments |
| 008 | create_comment_likes_table | comment_likes | Comment likes |
| 009 | create_post_shares_table | post_shares | Share tracking |

## Running Migrations

### Option 1: Using TypeScript Runner

```bash
cd Backend

# Run all migrations
npm run migrate

# Check status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Rollback multiple migrations
npm run migrate:rollback 3
```

### Option 2: Manual PostgreSQL

```bash
# Run single migration
psql -U user -d database < migrations/001_create_users_table.sql

# Run all migrations
for f in migrations/*.sql; do
  psql -U user -d database < "$f"
done
```

### Option 3: Node.js

```bash
# Add to Backend/package.json scripts:
"migrate": "ts-node migrations.ts run",
"migrate:status": "ts-node migrations.ts status",
"migrate:rollback": "ts-node migrations.ts rollback"
```

## Creating New Migrations

### Step 1: Create Migration File

```bash
# Create new migration file
touch Backend/migrations/010_add_new_feature.sql
```

### Step 2: Write Migration

```sql
-- Migration: 010_add_new_feature
-- Date: 2024-01-20
-- Description: Add new feature to database

-- UP
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_new_table_user_id ON new_table(user_id);
CREATE INDEX idx_new_table_created_at ON new_table(created_at DESC);

-- DOWN
DROP TABLE IF EXISTS new_table;
```

### Step 3: Test Locally

```bash
# Run migration
npm run migrate

# Verify tables created
psql -U user -d database
\dt

# Test rollback
npm run migrate:rollback

# Verify rollback worked
\dt
```

### Step 4: Deploy

```bash
# Run migrations in production
npm run migrate --env production
```

## Migration Patterns

### Creating a Table

```sql
-- UP
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- DOWN
DROP TABLE IF EXISTS users;
```

### Adding a Column

```sql
-- UP
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- DOWN
ALTER TABLE users
DROP COLUMN IF EXISTS phone;
```

### Creating a Foreign Key

```sql
-- UP
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_posts_user_id ON posts(user_id);

-- DOWN
ALTER TABLE posts DROP COLUMN IF EXISTS user_id;
```

### Creating a Unique Constraint

```sql
-- UP
ALTER TABLE users
ADD CONSTRAINT unique_email UNIQUE(email);

-- DOWN
ALTER TABLE users
DROP CONSTRAINT IF EXISTS unique_email;
```

### Creating an Index

```sql
-- UP
CREATE INDEX idx_posts_category ON posts(category);

-- DOWN
DROP INDEX IF EXISTS idx_posts_category;
```

### Renaming a Column

```sql
-- UP
ALTER TABLE users RENAME COLUMN fname TO first_name;

-- DOWN
ALTER TABLE users RENAME COLUMN first_name TO fname;
```

## Best Practices

### 1. Naming Convention

```
XXX_action_object.sql
↓   ↓      ↓
│   │      └─ What is being changed
│   └─ What is happening
└─ Sequential number (auto-incremented)

Examples:
- 010_create_notifications_table.sql
- 011_add_read_status_to_messages.sql
- 012_create_user_preferences.sql
```

### 2. Idempotency

Always use `IF NOT EXISTS` and `IF EXISTS`:

```sql
-- ✅ GOOD
CREATE TABLE IF NOT EXISTS users (...)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- ❌ BAD
CREATE TABLE users (...)  -- Fails if table exists
CREATE INDEX idx_users_email ON users(email);
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

### 3. One Change Per Migration

```sql
-- ✅ GOOD - One purpose
-- Migration 010: Create notifications table

-- ❌ BAD - Multiple unrelated changes
-- Migration 010: Create notifications, add phone to users, create messages table
```

### 4. Include Indexes

```sql
-- ✅ GOOD
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ❌ BAD - Missing indexes
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);
```

### 5. Include Down Section

Every migration should be reversible:

```sql
-- UP
CREATE TABLE IF NOT EXISTS notifications (...)
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- DOWN
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP TABLE IF EXISTS notifications;
```

### 6. Timestamps

Always include created_at and updated_at:

```sql
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... other columns
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 7. Soft Deletes

For records that might be queried by absence:

```sql
CREATE TABLE IF NOT EXISTS users (
  -- ... columns
  deleted_at TIMESTAMP  -- NULL = not deleted
);

-- Query active users
SELECT * FROM users WHERE deleted_at IS NULL;
```

## Common Scenarios

### Scenario 1: Adding a New Module

1. Create migration for main table
2. Create migration for related tables
3. Create migration for junction tables
4. Add indexes and constraints

```sql
-- Migration 010: Create blog module
CREATE TABLE IF NOT EXISTS blog_posts (...)
CREATE TABLE IF NOT EXISTS blog_categories (...)
CREATE TABLE IF NOT EXISTS blog_post_categories (...)
CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
```

### Scenario 2: Changing Existing Data

```sql
-- UP
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
UPDATE users SET is_active = TRUE WHERE status = 'active';
ALTER TABLE users DROP COLUMN IF EXISTS status;

-- DOWN
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
UPDATE users SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
```

### Scenario 3: Complex Schema Change

```sql
-- UP
-- 1. Create new table with new schema
CREATE TABLE IF NOT EXISTS users_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Copy data from old table
INSERT INTO users_v2 (id, email, created_at)
SELECT id, email, created_at FROM users;

-- 3. Drop old table
DROP TABLE IF EXISTS users;

-- 4. Rename new table
ALTER TABLE users_v2 RENAME TO users;

-- DOWN
-- Reverse process...
```

## Troubleshooting

### Problem: Migration Failed

**Solution**:
1. Check error message
2. Manually connect and inspect state
3. Fix migration file
4. Rollback: `npm run migrate:rollback`
5. Run again: `npm run migrate`

### Problem: Unique Constraint Violation

**Solution**:
```sql
-- Check for duplicates
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Remove duplicates or fix data first
DELETE FROM users WHERE id NOT IN (SELECT MIN(id) FROM users GROUP BY email);

-- Then add constraint
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE(email);
```

### Problem: Foreign Key Error

**Solution**:
```sql
-- Check for orphaned records
SELECT * FROM posts WHERE user_id NOT IN (SELECT id FROM users);

-- Delete orphaned records or add users first
DELETE FROM posts WHERE user_id NOT IN (SELECT id FROM users);

-- Then add foreign key
ALTER TABLE posts ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Database Migrations

on: [push]

jobs:
  migrate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: ${{ secrets.DB_PASSWORD }}
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run migrate
```

## Deployment Checklist

Before deploying migrations to production:

- [ ] Tested locally
- [ ] Tested rollback
- [ ] Verified data integrity
- [ ] Backup database
- [ ] Schedule deployment
- [ ] Monitor logs
- [ ] Verify success

## Future Migrations

To add new migrations in the future:

1. Copy `000_template.sql`
2. Rename to next number (010, 011, etc.)
3. Update date and description
4. Write UP section
5. Write DOWN section
6. Test locally
7. Commit and push
8. Deploy to production

## Resources

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Migration Best Practices](https://wiki.postgresql.org/wiki/Migrating_PostgreSQL_Databases)
- [Flyway Documentation](https://flywaydb.org/)
- [Liquibase Documentation](https://www.liquibase.org/)

---

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: Active
