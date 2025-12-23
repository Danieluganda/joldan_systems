/**
 * Database Connection and Initialization
 * 
 * Sets up PostgreSQL connection pool
 * Initializes database tables and schemas
 * Exports database connection for use by models
 */

const { Pool } = require('pg');
const path = require('path');

// Import logger with fallback
let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  // Fallback logger if custom logger doesn't exist
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log
  };
}

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'procurement_discipline',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT) || 5432,
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  min: parseInt(process.env.DB_POOL_MIN) || 5,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
  // Additional security and performance settings
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool events
pool.on('connect', (client) => {
  logger.info(`Database client connected (${client.processID})`);
});

pool.on('error', (err, client) => {
  logger.error('Database pool error:', err);
  if (client) {
    logger.error(`Client process ID: ${client.processID}`);
  }
});

pool.on('remove', (client) => {
  logger.info(`Database client removed (${client.processID})`);
});

// Database connection wrapper with retry logic
const connectWithRetry = async (maxRetries = 5, delay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()'); // Test query
      client.release();
      logger.info(`Database connected successfully (attempt ${attempt})`);
      return true;
    } catch (error) {
      logger.error(`Database connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error.message}`);
      }
      
      logger.info(`Retrying database connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
};

// Enhanced query wrapper with logging and error handling
const query = async (text, params = []) => {
  const start = Date.now();
  let client;
  
  try {
    client = await pool.connect();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn(`Slow query detected (${duration}ms):`, text.substring(0, 100));
    }
    
    logger.debug(`Query executed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Query failed after ${duration}ms:`, {
      query: text.substring(0, 200),
      params: params,
      error: error.message
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Enhanced database initialization with better schema
const initializeDatabases = async () => {
  try {
    logger.info('Starting database initialization...');

    // First, ensure we can connect
    await connectWithRetry();
    
    // Enable UUID extension if needed
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create tables with enhanced schema
    const tableSQL = `
      -- Users table with enhanced constraints and indexes
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(320) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
        password VARCHAR(255) NOT NULL CHECK (length(password) >= 8),
        first_name VARCHAR(100) NOT NULL CHECK (length(trim(first_name)) > 0),
        last_name VARCHAR(100) NOT NULL CHECK (length(trim(last_name)) > 0),
        phone VARCHAR(20) CHECK (phone IS NULL OR length(trim(phone)) > 0),
        role VARCHAR(20) NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'MANAGER', 'USER', 'VIEWER')),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
        last_login TIMESTAMP WITH TIME ZONE,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP WITH TIME ZONE,
        email_verified BOOLEAN DEFAULT FALSE,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Procurements table with enhanced schema
      CREATE TABLE IF NOT EXISTS procurements (
        id SERIAL PRIMARY KEY,
        reference VARCHAR(100) UNIQUE NOT NULL CHECK (length(trim(reference)) > 0),
        title VARCHAR(500) NOT NULL CHECK (length(trim(title)) > 0),
        description TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('GOODS', 'SERVICES', 'WORKS', 'CONSULTANCY')),
        status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (status IN (
          'planning', 'approval_pending', 'approved', 'published', 'submission_open', 
          'evaluation', 'award_pending', 'awarded', 'contracted', 'completed', 
          'cancelled', 'suspended'
        )),
        budget DECIMAL(15, 2) CHECK (budget >= 0),
        currency VARCHAR(3) DEFAULT 'USD',
        estimated_value DECIMAL(15, 2),
        procurement_method VARCHAR(50),
        tender_opening_date TIMESTAMP WITH TIME ZONE,
        submission_deadline TIMESTAMP WITH TIME ZONE,
        evaluation_criteria JSONB,
        created_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        updated_by INT REFERENCES users(id) ON DELETE SET NULL,
        approved_by INT REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP WITH TIME ZONE,
        published_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Ensure logical date constraints
        CHECK (submission_deadline IS NULL OR tender_opening_date IS NULL OR submission_deadline <= tender_opening_date),
        CHECK (approved_at IS NULL OR approved_at >= created_at),
        CHECK (published_at IS NULL OR published_at >= created_at)
      );

      -- Procurement documents table
      CREATE TABLE IF NOT EXISTS procurement_documents (
        id SERIAL PRIMARY KEY,
        procurement_id INT NOT NULL REFERENCES procurements(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT,
        mime_type VARCHAR(100),
        uploaded_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Audit trail table for tracking all changes
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id INTEGER NOT NULL,
        operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
        old_values JSONB,
        new_values JSONB,
        changed_by INT REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- User sessions table for security
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await query(tableSQL);
    logger.info('Base tables created successfully');

    // Create indexes for better performance
    const indexSQL = `
      -- Users table indexes
      CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

      -- Procurements table indexes
      CREATE INDEX IF NOT EXISTS idx_procurements_reference ON procurements(reference);
      CREATE INDEX IF NOT EXISTS idx_procurements_status ON procurements(status);
      CREATE INDEX IF NOT EXISTS idx_procurements_type ON procurements(type);
      CREATE INDEX IF NOT EXISTS idx_procurements_created_by ON procurements(created_by);
      CREATE INDEX IF NOT EXISTS idx_procurements_budget ON procurements(budget);
      CREATE INDEX IF NOT EXISTS idx_procurements_submission_deadline ON procurements(submission_deadline);
      CREATE INDEX IF NOT EXISTS idx_procurements_created_at ON procurements(created_at);
      CREATE INDEX IF NOT EXISTS idx_procurements_title_search ON procurements USING gin(to_tsvector('english', title));

      -- Documents table indexes
      CREATE INDEX IF NOT EXISTS idx_procurement_documents_procurement_id ON procurement_documents(procurement_id);
      CREATE INDEX IF NOT EXISTS idx_procurement_documents_type ON procurement_documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_procurement_documents_public ON procurement_documents(is_public);

      -- Audit logs indexes
      CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

      -- Sessions table indexes
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
    `;

    await query(indexSQL);
    logger.info('Database indexes created successfully');

    // Create triggers for automatic timestamp updates
    const triggerSQL = `
      -- Function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Apply triggers to tables
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_procurements_updated_at ON procurements;
      CREATE TRIGGER update_procurements_updated_at
        BEFORE UPDATE ON procurements
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_procurement_documents_updated_at ON procurement_documents;
      CREATE TRIGGER update_procurement_documents_updated_at
        BEFORE UPDATE ON procurement_documents
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    await query(triggerSQL);
    logger.info('Database triggers created successfully');

    // Create default admin user if not exists
    const adminExists = await query(
      "SELECT id FROM users WHERE email = $1",
      [process.env.DEFAULT_ADMIN_EMAIL || 'admin@procurement.local']
    );

    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      
      await query(
        `INSERT INTO users (email, password, first_name, last_name, role, status, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          process.env.DEFAULT_ADMIN_EMAIL || 'admin@procurement.local',
          hashedPassword,
          'System',
          'Administrator',
          'ADMIN',
          'active',
          true
        ]
      );
      
      logger.info('Default admin user created');
    }

    logger.info('Database initialization completed successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

// Health check function
const healthCheck = async () => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    const poolStatus = {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    };
    
    return {
      status: 'healthy',
      database: result.rows[0],
      pool: poolStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    logger.info('Closing database connection pool...');
    await pool.end();
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error during database shutdown:', error);
  }
};

// Handle process termination
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Export database connection and utilities
module.exports = {
  // Core database functions
  query,
  transaction,
  pool,
  
  // Initialization and management
  initializeDatabases,
  connectWithRetry,
  healthCheck,
  gracefulShutdown,
  
  // Convenience methods
  getClient: () => pool.connect(),
  
  // Configuration info (without sensitive data)
  config: {
    host: dbConfig.host,
    database: dbConfig.database,
    port: dbConfig.port,
    max: dbConfig.max,
    min: dbConfig.min
  }
};
