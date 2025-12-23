/**
 * Database Connection Configuration
 * 
 * Sets up PostgreSQL connection pool
 * Provides database initialization and utilities
 */

const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

// Create connection pool
const pool = new Pool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  database: env.DB.NAME,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  min: env.DB.POOL_MIN,
  max: env.DB.POOL_MAX,
  ssl: env.DB.SSL,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Connection pool events
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client:', err);
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('remove', () => {
  logger.debug('Database connection removed from pool');
});

/**
 * Execute a query
 */
const query = (sql, params) => {
  return pool.query(sql, params);
};

/**
 * Get a client from pool (for transactions)
 */
const getClient = async () => {
  return pool.connect();
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connection test successful');
    return true;
  } catch (err) {
    logger.error('Database connection test failed:', err);
    throw err;
  }
};

/**
 * Close all connections
 */
const close = async () => {
  return pool.end();
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  close,
};
