import { Pool } from 'pg';
import { MongoClient, Db } from 'mongodb';
import mysql from 'mysql2/promise';
import { config } from '@config/config';

/**
 * PostgreSQL Connection Manager with connection pooling
 * Performance optimized for social media app
 */
export class PostgresDB {
  private static pool: Pool;

  static async connect(): Promise<void> {
    this.pool = new Pool({
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      user: config.database.postgres.user,
      password: config.database.postgres.password,
      database: config.database.postgres.database,
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    try {
      const client = await this.pool.connect();
      console.log('✓ PostgreSQL Connected');
      client.release();
    } catch (error) {
      console.error('✗ PostgreSQL Connection Error:', error);
      throw error;
    }
  }

  static getPool(): Pool {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  static async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('✓ PostgreSQL Disconnected');
    }
  }
}

/**
 * MongoDB Connection Manager
 * Optimized for scalability and document-based queries
 */
export class MongoDB {
  private static client: MongoClient;
  private static db: Db;

  static async connect(): Promise<void> {
    this.client = new MongoClient(config.database.mongodb.uri);

    try {
      await this.client.connect();
      this.db = this.client.db();
      console.log('✓ MongoDB Connected');
    } catch (error) {
      console.error('✗ MongoDB Connection Error:', error);
      throw error;
    }
  }

  static getDB(): Db {
    if (!this.db) {
      throw new Error('MongoDB not initialized. Call connect() first.');
    }
    return this.db;
  }

  static async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('✓ MongoDB Disconnected');
    }
  }
}

/**
 * MySQL Connection Manager with connection pooling
 */
export class MySQLDB {
  private static pool: mysql.Pool;

  static async connect(): Promise<void> {
    this.pool = mysql.createPool({
      host: config.database.mysql.host,
      port: config.database.mysql.port,
      user: config.database.mysql.user,
      password: config.database.mysql.password,
      database: config.database.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    try {
      const connection = await this.pool.getConnection();
      console.log('✓ MySQL Connected');
      connection.release();
    } catch (error) {
      console.error('✗ MySQL Connection Error:', error);
      throw error;
    }
  }

  static getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error('MySQL pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  static async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('✓ MySQL Disconnected');
    }
  }
}
