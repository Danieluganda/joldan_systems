/**
 * Environment Configuration
 * 
 * Loads and validates environment variables
 * Provides centralized access to config throughout the application
 */

require('dotenv').config();

const env = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // Database
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
    NAME: process.env.DB_NAME || 'procurement_discipline_db',
    USER: process.env.DB_USER || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || '',
    POOL_MIN: parseInt(process.env.DB_POOL_MIN || '2', 10),
    POOL_MAX: parseInt(process.env.DB_POOL_MAX || '10', 10),
    SSL: process.env.DB_SSL === 'true',
  },

  // Redis
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    PASSWORD: process.env.REDIS_PASSWORD || '',
  },

  // Authentication
  AUTH: {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE || '30d',
  },

  // Email
  EMAIL: {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    FROM: process.env.SMTP_FROM || 'noreply@procurement-system.com',
  },

  // File Upload
  UPLOAD: {
    DIR: process.env.UPLOAD_DIR || './uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
    ALLOWED_FILE_TYPES: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,zip').split(','),
  },

  // Cloud Storage (AWS S3 or Azure)
  CLOUD_STORAGE: {
    PROVIDER: process.env.STORAGE_PROVIDER || 'local',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    COSMOS_CONNECTION_STRING: process.env.COSMOS_CONNECTION_STRING,
    COSMOS_DATABASE: process.env.COSMOS_DATABASE,
    COSMOS_CONTAINER: process.env.COSMOS_CONTAINER,
  },

  // Logging
  LOG: {
    LEVEL: process.env.LOG_LEVEL || 'debug',
    FILE: process.env.LOG_FILE || 'error_logs.log',
    MAX_SIZE: process.env.LOG_MAX_SIZE || '10m',
    MAX_FILES: process.env.LOG_MAX_FILES || '14d',
  },

  // API
  API: {
    TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
    RATE_LIMIT: parseInt(process.env.API_RATE_LIMIT || '100', 10),
    RATE_WINDOW: process.env.API_RATE_WINDOW || '15m',
  },

  // Feature Flags
  FEATURES: {
    ENABLE_AUDIT_TRAIL: process.env.ENABLE_AUDIT_TRAIL !== 'false',
    ENABLE_DIGITAL_SIGNATURES: process.env.ENABLE_DIGITAL_SIGNATURES !== 'false',
    ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
    ENABLE_TWO_FACTOR_AUTH: process.env.ENABLE_TWO_FACTOR_AUTH === 'true',
  },

  // Third-party Services
  SERVICES: {
    SENTRY_DSN: process.env.SENTRY_DSN,
    STRIPE_KEY: process.env.STRIPE_KEY,
    STRIPE_SECRET: process.env.STRIPE_SECRET,
  },

  // Security
  SECURITY: {
    CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    SESSION_SECRET: process.env.SESSION_SECRET,
    PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    PASSWORD_REQUIRE_SPECIAL_CHARS: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
    PASSWORD_REQUIRE_NUMBERS: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
  },

  // Derived properties
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

/**
 * Validate required environment variables
 */
function validateEnv() {
  const required = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

if (env.isProduction) {
  validateEnv();
}

module.exports = env;
