# Add These Scripts to Backend/package.json

Add the following to the `"scripts"` section of `Backend/package.json`:

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    
    // Add these migration scripts:
    "migrate": "ts-node migrations.ts run",
    "migrate:status": "ts-node migrations.ts status",
    "migrate:rollback": "ts-node migrations.ts rollback",
    "migrate:rollback:1": "ts-node migrations.ts rollback 1",
    "migrate:rollback:3": "ts-node migrations.ts rollback 3",
    
    // Optional: Initialize fresh database
    "db:init": "npm run migrate",
    "db:reset": "npm run migrate:rollback 9 && npm run migrate",
    
    // Testing
    "test": "jest",
    "test:migrations": "npm run migrate && npm run migrate:status",
    
    // Dev utilities
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts"
  }
}
```

## Usage Examples

```bash
# Run all migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Rollback last 3 migrations
npm run migrate:rollback:3

# Reset entire database (careful!)
npm run db:reset

# Initialize database
npm run db:init

# Run migrations + type check + lint
npm run migrate && npm run type-check && npm run lint
```

## Docker Compose Example

If using Docker, add to `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: ./Backend
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    ports:
      - "3000:3000"
    command: npm run migrate && npm run dev

volumes:
  postgres_data:
```

## GitHub Actions Example

Add `.github/workflows/migrations.yml`:

```yaml
name: Database Migrations

on:
  push:
    paths:
      - 'Backend/migrations/**'
      - 'Backend/migrations.ts'

jobs:
  migrate:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: cd Backend && npm install
      
      - name: Run migrations
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost/test_db
        run: cd Backend && npm run migrate
      
      - name: Check status
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost/test_db
        run: cd Backend && npm run migrate:status
```

## Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check if migrations are valid
cd Backend
npm run migrate:status > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Migration error detected!"
  exit 1
fi

echo "✅ Migrations valid"
```

## Environment Variables

Create `.env` (local) or `.env.production`:

```env
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=digitalconnect

# Optional
DATABASE_POOL_SIZE=10
DATABASE_POOL_TIMEOUT=30000
```

## Verification Steps

After adding scripts, verify everything works:

```bash
# 1. Check scripts are added
cd Backend
npm run --list | grep migrate

# 2. Test migration runner
npm run migrate

# 3. Check status
npm run migrate:status

# 4. Test rollback
npm run migrate:rollback

# 5. Run again
npm run migrate

# 6. Verify in database
psql -U user -d database -c "\dt"
```

## Troubleshooting Scripts

If migrations fail, use these commands:

```bash
# Check database connection
psql -U user -h localhost -d database -c "SELECT 1;"

# List all tables
psql -U user -d database -c "\dt"

# Drop and recreate database (careful!)
dropdb -U user database
createdb -U user database

# Rerun migrations
npm run migrate
```

---

**Copy and paste the scripts above into `Backend/package.json` to enable migration commands!**
