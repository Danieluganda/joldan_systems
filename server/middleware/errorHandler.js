/**
 * Error Handler Middleware
 * 
 * Global error handling, response formatting, and error tracking
 * Enhanced with comprehensive error classification and security features
 */

const logger = require('../utils/logger');

// Error severity levels
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories for better tracking
const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  BUSINESS_LOGIC: 'business_logic',
  EXTERNAL_API: 'external_api',
  SYSTEM: 'system',
  SECURITY: 'security'
};

// Common error codes
const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BAD_REQUEST: 'BAD_REQUEST'
};

/**
 * Enhanced Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode, code = null, category = ERROR_CATEGORIES.SYSTEM, severity = ERROR_SEVERITY.MEDIUM, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code || this.generateCodeFromStatus(statusCode);
    this.category = category;
    this.severity = severity;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  generateCodeFromStatus(statusCode) {
    const codeMap = {
      400: ERROR_CODES.BAD_REQUEST,
      401: ERROR_CODES.UNAUTHORIZED,
      403: ERROR_CODES.FORBIDDEN,
      404: ERROR_CODES.NOT_FOUND,
      409: ERROR_CODES.CONFLICT,
      429: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      500: ERROR_CODES.INTERNAL_ERROR,
      503: ERROR_CODES.SERVICE_UNAVAILABLE
    };
    return codeMap[statusCode] || ERROR_CODES.INTERNAL_ERROR;
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp,
      statusCode: this.statusCode
    };
  }
}

/**
 * Validation Error class
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, ERROR_CODES.VALIDATION_FAILED, ERROR_CATEGORIES.VALIDATION);
    this.errors = errors;
  }
}

/**
 * Authentication Error class
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, ERROR_CODES.UNAUTHORIZED, ERROR_CATEGORIES.AUTHENTICATION, ERROR_SEVERITY.HIGH);
  }
}

/**
 * Authorization Error class
 */
class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, ERROR_CODES.FORBIDDEN, ERROR_CATEGORIES.AUTHORIZATION, ERROR_SEVERITY.HIGH);
  }
}

/**
 * Not Found Error class
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, ERROR_CODES.NOT_FOUND, ERROR_CATEGORIES.BUSINESS_LOGIC);
  }
}

/**
 * Conflict Error class
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, ERROR_CODES.CONFLICT, ERROR_CATEGORIES.BUSINESS_LOGIC);
  }
}

/**
 * Rate Limit Error class
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, ERROR_CATEGORIES.SECURITY, ERROR_SEVERITY.MEDIUM);
    this.retryAfter = retryAfter;
  }
}

/**
 * Format error response based on error type and environment
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (err, req) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const baseResponse = {
    success: false,
    error: {
      message: err.message,
      code: err.code || ERROR_CODES.INTERNAL_ERROR,
      timestamp: new Date().toISOString(),
      requestId: req.id || require('crypto').randomUUID()
    }
  };

  // Add category and severity for operational errors
  if (err.isOperational && err instanceof AppError) {
    baseResponse.error.category = err.category;
    baseResponse.error.severity = err.severity;
  }

  // Add validation errors if present
  if (err instanceof ValidationError && err.errors?.length > 0) {
    baseResponse.error.details = err.errors;
  }

  // Add retry information for rate limiting
  if (err instanceof RateLimitError && err.retryAfter) {
    baseResponse.error.retryAfter = err.retryAfter;
  }

  // Add debug information in development
  if (isDevelopment && err.stack) {
    baseResponse.debug = {
      stack: err.stack,
      originalError: err.name
    };
  }

  // Sanitize sensitive information in production
  if (isProduction) {
    // Hide internal error details from clients
    if (err.statusCode >= 500 && !err.isOperational) {
      baseResponse.error.message = 'An internal error occurred';
      baseResponse.error.code = ERROR_CODES.INTERNAL_ERROR;
    }
  }

  return baseResponse;
};

/**
 * Enhanced error logging with context
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 */
const logError = (err, req) => {
  const logLevel = getLogLevel(err);
  const context = {
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      category: err.category,
      severity: err.severity,
      statusCode: err.statusCode,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      sessionId: req.user?.sessionId,
      requestId: req.id
    },
    timestamp: new Date().toISOString()
  };

  // Add request body for certain error types (excluding sensitive data)
  if (shouldLogRequestBody(err, req)) {
    context.request.body = sanitizeRequestBody(req.body);
  }

  // Log based on severity
  switch (logLevel) {
    case 'error':
      logger.error(`${err.statusCode} - ${err.message}`, context);
      break;
    case 'warn':
      logger.warn(`${err.statusCode} - ${err.message}`, context);
      break;
    case 'info':
      logger.info(`${err.statusCode} - ${err.message}`, context);
      break;
    default:
      logger.error(`${err.statusCode} - ${err.message}`, context);
  }
};

/**
 * Determine log level based on error type and status code
 * @param {Error} err - Error object
 * @returns {string} Log level
 */
const getLogLevel = (err) => {
  if (err.statusCode >= 500) return 'error';
  if (err.statusCode === 401 || err.statusCode === 403) return 'warn';
  if (err.statusCode >= 400) return 'info';
  return 'error';
};

/**
 * Determine if request body should be logged
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @returns {boolean}
 */
const shouldLogRequestBody = (err, req) => {
  // Log body for validation errors
  if (err instanceof ValidationError) return true;
  
  // Don't log body for auth routes (sensitive data)
  if (req.path.includes('/auth/')) return false;
  
  // Log body for 4xx errors except auth-related
  return err.statusCode >= 400 && err.statusCode < 500 && err.statusCode !== 401 && err.statusCode !== 403;
};

/**
 * Sanitize request body for logging
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sensitive = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitive.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Handle specific error types
 * @param {Error} err - Error object
 * @returns {AppError} Processed error
 */
const processError = (err) => {
  // Already processed AppError
  if (err instanceof AppError) {
    return err;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return new ValidationError('Validation failed', errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `${field} already exists`;
    return new ConflictError(message);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return new ValidationError(`Invalid ${err.path}: ${err.value}`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return new AppError('Database connection failed', 503, ERROR_CODES.SERVICE_UNAVAILABLE, ERROR_CATEGORIES.DATABASE, ERROR_SEVERITY.CRITICAL, true);
  }

  // Request size errors
  if (err.name === 'PayloadTooLargeError') {
    return new AppError('Request payload too large', 413, 'PAYLOAD_TOO_LARGE', ERROR_CATEGORIES.VALIDATION);
  }

  // Generic server error
  return new AppError(
    err.message || 'Internal server error', 
    err.statusCode || 500, 
    ERROR_CODES.INTERNAL_ERROR, 
    ERROR_CATEGORIES.SYSTEM, 
    ERROR_SEVERITY.HIGH, 
    false
  );
};

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Process the error
  const processedError = processError(err);
  
  // Log the error
  logError(processedError, req);
  
  // Format response
  const response = formatErrorResponse(processedError, req);
  
  // Set response headers
  res.status(processedError.statusCode);
  
  // Add retry-after header for rate limiting
  if (processedError instanceof RateLimitError && processedError.retryAfter) {
    res.set('Retry-After', processedError.retryAfter);
  }
  
  // Add correlation ID for tracking
  res.set('X-Request-ID', response.error.requestId);
  
  // Send response
  res.json(response);
};

/**
 * Enhanced async handler wrapper with error context
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // Add request context to error
    if (!(err instanceof AppError)) {
      err.requestContext = {
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id
      };
    }
    next(err);
  });
};

/**
 * Handle 404 errors (route not found)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleNotFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Graceful error handler for unhandled promise rejections
 * @param {Error} reason - Rejection reason
 * @param {Promise} promise - Promise that was rejected
 */
const handleUnhandledRejection = (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
  
  // Don't exit process immediately, allow graceful shutdown
  process.exit(1);
};

/**
 * Graceful error handler for uncaught exceptions
 * @param {Error} error - Uncaught exception
 */
const handleUncaughtException = (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack
  });
  
  // Exit immediately on uncaught exceptions
  process.exit(1);
};

// Set up global error handlers
process.on('unhandledRejection', handleUnhandledRejection);
process.on('uncaughtException', handleUncaughtException);

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Middleware
  errorHandler,
  asyncHandler,
  handleNotFound,
  
  // Constants
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
  ERROR_CODES,
  
  // Utilities
  formatErrorResponse,
  processError,
  logError
};
