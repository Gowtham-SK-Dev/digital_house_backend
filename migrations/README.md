# Database Migrations

This directory contains all SQL migration files for the DigitalConnect database.

## Migration Files

### Module 1: User Profiles
- **001_create_users_table.sql** - Base users table with authentication
- **002_create_user_profiles_table.sql** - Extended user profile information
- **003_create_profile_privacy_table.sql** - User privacy settings

### Module 2: Posts & Home Feed
- **004_create_location_circles_table.sql** - Geographic grouping for posts
- **005_create_posts_table.sql** - Main posts/feed table
- **006_create_post_likes_table.sql** - Post likes with unique constraint
- **007_create_post_comments_table.sql** - Comments on posts
- **008_create_comment_likes_table.sql** - Likes on comments
- **009_create_post_shares_table.sql** - Share tracking

### Future Migrations
- **010_create_*.sql** - Next migration will start here

## Running Migrations

### Using PostgreSQL CLI

```bash
# Run all migrations up to current
psql -U username -d database_name -f 001_create_users_table.sql
psql -U username -d database_name -f 002_create_user_profiles_table.sql
# ... continue with other files

# Or use a migration runner script
node migrations/run.js
```

### Using TypeScript/Node.js

See `Backend/src/config/database.ts` for programmatic migration execution.

## Migration Structure

Each migration file contains:
- **Description**: What the migration does
- **UP section**: SQL to create tables, indexes, constraints
- **DOWN section**: SQL to rollback changes (commented out)

## Naming Convention

- **Prefix**: Sequential number (001, 002, etc.)
- **Name**: Descriptive action (create_table_name)
- **Extension**: .sql

Example: `001_create_users_table.sql`

## Best Practices

1. **One logical change per file** - Don't mix multiple unrelated changes
2. **Include indexes** - Add indexes for frequently queried columns
3. **Foreign keys** - Use ON DELETE CASCADE where appropriate
4. **Timestamps** - Include created_at and updated_at
5. **Soft deletes** - Include deleted_at column when needed
6. **Idempotent** - Use `IF NOT EXISTS` and `IF EXISTS`
7. **Comments** - Explain why the migration exists

## Future Migrations

When adding new tables or columns:

1. Create new migration file with next number
2. Add UP section with CREATE or ALTER statements
3. Add DOWN section with DROP or ROLLBACK statements
4. Run and test locally first
5. Document changes in this README

## Example Future Migration

```sql
-- Migration: 010_add_hashtags_table
-- Date: YYYY-MM-DD
-- Description: Add hashtag support for posts

-- UP
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX idx_hashtags_name ON hashtags(name);
CREATE INDEX idx_post_hashtags_post_id ON post_hashtags(post_id);

-- DOWN
-- DROP TABLE IF EXISTS post_hashtags;
-- DROP TABLE IF EXISTS hashtags;
```

## Table Relationships

```
users (base table)
├── user_profiles (1:1)
├── profile_privacy (1:1)
├── posts (1:many)
│   ├── post_likes (many:many via users)
│   ├── post_comments (1:many)
│   │   └── comment_likes (many:many via users)
│   ├── post_shares (1:many)
│   └── location_circles (many:1)
└── (other tables for future modules)
```

## Performance Notes

- Indexes on: user_id, created_at, category, status, location
- Unique constraints: email, post_likes, comment_likes
- Denormalization: likes_count, comments_count, shares_count in posts
- Soft deletes: deleted_at column for audit trail

## Testing Migrations

```bash
# Test locally with Docker PostgreSQL
docker run -e POSTGRES_PASSWORD=password postgres:13

# Run migrations
psql -U postgres -d test_db -f migrations/001_create_users_table.sql

# Verify tables
\dt
```

## Rollback Procedure

To rollback a migration, uncomment the DOWN section and run:

```bash
psql -U username -d database_name -c "$(cat 001_create_users_table.sql | grep -A 100 '^-- DOWN')"
```

Or manually delete resources in reverse order.

---

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: Active
