/**
 * Database Connection Initialization
 * 
 * Sets up database tables and schemas
 * Initializes all database models
 */

const db = require('./index');
const { Pool } = require('pg');
const logger = require('../utils/logger');

const initializeDatabases = async () => {
  try {
    logger.info('Initializing database tables...');

    // Create tables (these would normally be migrations)
    const tableSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(20),
        role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Procurements table
      CREATE TABLE IF NOT EXISTS procurements (
        id SERIAL PRIMARY KEY,
        reference VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'planning',
        budget DECIMAL(15, 2),
        created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_procurements_status ON procurements(status);
      CREATE INDEX IF NOT EXISTS idx_procurements_created_by ON procurements(created_by);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;

    await db.query(tableSQL);
    logger.info('Database tables initialized successfully');
  } catch (err) {
    logger.error('Database initialization failed:', err);
    throw err;
  }
};

module.exports = {
  initializeDatabases,
};
