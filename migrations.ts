/**
 * Database Migration Runner
 * Executes all SQL migration files in order
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from './src/config/config';

interface Migration {
  name: string;
  path: string;
  number: number;
}

class MigrationRunner {
  private pool: Pool;
  private migrationsDir: string;

  constructor() {
    this.pool = new Pool({
      user: config.database.user,
      password: config.database.password,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
    });

    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  /**
   * Get all migration files sorted by number
   */
  private getMigrations(): Migration[] {
    const files = fs.readdirSync(this.migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql') && f !== 'README.md');

    return sqlFiles
      .map(file => ({
        name: file,
        path: path.join(this.migrationsDir, file),
        number: parseInt(file.split('_')[0]),
      }))
      .sort((a, b) => a.number - b.number);
  }

  /**
   * Run migrations
   */
  async run(): Promise<void> {
    try {
      console.log('🔄 Starting migrations...\n');

      const migrations = this.getMigrations();

      if (migrations.length === 0) {
        console.log('✅ No migrations to run');
        return;
      }

      console.log(`Found ${migrations.length} migrations:\n`);

      for (const migration of migrations) {
        await this.runMigration(migration);
      }

      console.log('\n✅ All migrations completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Run individual migration
   */
  private async runMigration(migration: Migration): Promise<void> {
    try {
      console.log(`⏳ Running: ${migration.name}...`);

      const sql = fs.readFileSync(migration.path, 'utf-8');
      
      // Extract only UP section (remove DOWN comments)
      const upSection = sql
        .split('-- DOWN')[0]
        .split('-- UP')[1]
        .trim();

      await this.pool.query(upSection);

      console.log(`   ✅ ${migration.name} completed\n`);
    } catch (error) {
      console.error(`   ❌ ${migration.name} failed:`);
      throw error;
    }
  }

  /**
   * Rollback last migration
   */
  async rollback(steps: number = 1): Promise<void> {
    try {
      console.log(`🔄 Rolling back ${steps} migration(s)...\n`);

      const migrations = this.getMigrations();
      const toRollback = migrations.slice(-steps);

      for (const migration of toRollback.reverse()) {
        await this.rollbackMigration(migration);
      }

      console.log('\n✅ Rollback completed successfully!');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  /**
   * Rollback individual migration
   */
  private async rollbackMigration(migration: Migration): Promise<void> {
    try {
      console.log(`⏳ Rolling back: ${migration.name}...`);

      const sql = fs.readFileSync(migration.path, 'utf-8');
      
      // Extract only DOWN section
      const downMatch = sql.split('-- DOWN')[1];
      if (!downMatch) {
        console.log(`   ⚠️  No rollback defined for ${migration.name}`);
        return;
      }

      const downSection = downMatch
        .split('\n')
        .filter(line => !line.startsWith('--'))
        .join('\n')
        .trim();

      if (downSection) {
        await this.pool.query(downSection);
        console.log(`   ✅ ${migration.name} rolled back\n`);
      }
    } catch (error) {
      console.error(`   ❌ Rollback for ${migration.name} failed:`);
      throw error;
    }
  }

  /**
   * Show migration status
   */
  async status(): Promise<void> {
    try {
      console.log('📋 Migration Status:\n');

      const migrations = this.getMigrations();
      console.log(`Total migrations: ${migrations.length}\n`);

      for (const migration of migrations) {
        console.log(`  • ${migration.name}`);
      }

      console.log('\nRun migrations with: npm run migrate');
      console.log('Rollback with: npm run migrate:rollback\n');
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      await this.pool.end();
    }
  }
}

// CLI
const command = process.argv[2] || 'run';
const runner = new MigrationRunner();

switch (command) {
  case 'run':
    runner.run();
    break;
  case 'rollback':
    runner.rollback(parseInt(process.argv[3]) || 1);
    break;
  case 'status':
    runner.status();
    break;
  default:
    console.log('Usage: ts-node migrations.ts [run|rollback|status]');
}
