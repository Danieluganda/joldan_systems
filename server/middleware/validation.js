/**
 * Validation Middleware
 * 
 * Comprehensive request validation, sanitization, and data transformation
 * Enhanced with schema validation, custom validators, and security features
 */

const { validateObject } = require('../shared/validation-rules');
const logger = require('../utils/logger');
const { ValidationError } = require('./errorHandler');

// Security patterns for input sanitization
const SECURITY_PATTERNS = {
  HTML_TAGS: /<[^>]*>?/gm,
  SCRIPT_TAGS: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  SQL_INJECTION: /('|(\\')|(;|%3B)|(\\)|(%27)|(\')|(\")|(%22)|(-|%2D){2}|(#|%23))/i,
  XSS_ATTEMPTS: /javascript:|vbscript:|onload=|onerror=|onclick=/i,
  PATH_TRAVERSAL: /\.\.[\/\\]/g,
  NULL_BYTES: /\0/g
};

// File upload validation patterns
const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEET: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ARCHIVE: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
};

const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  SPREADSHEET: 10 * 1024 * 1024, // 10MB
  ARCHIVE: 50 * 1024 * 1024 // 50MB
};

/**
 * Enhanced request body validation with detailed error reporting
 * @param {Object} schema - Validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateBody = (schema, options = {}) => {
  return (req, res, next) => {
    const {
      allowUnknown = false,
      stripUnknown = false,
      abortEarly = false,
      sanitize = true
    } = options;

    try {
      // Pre-sanitize if enabled
      if (sanitize && req.body) {
        req.body = sanitizeObject(req.body);
      }

      const { valid, errors, sanitized } = validateObject(req.body, schema, {
        allowUnknown,
        stripUnknown,
        abortEarly
      });

      if (!valid) {
        const validationError = new ValidationError('Request body validation failed', errors);
        
        logger.warn('Request body validation failed', {
          errors,
          body: sanitizeForLogging(req.body),
          url: req.originalUrl,
          method: req.method,
          userId: req.user?.id,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
        
        return next(validationError);
      }

      // Replace body with sanitized version if stripUnknown is enabled
      if (stripUnknown && sanitized) {
        req.body = sanitized;
      }

      // Add validation context to request
      req.validationContext = {
        bodyValidated: true,
        schema: schema.name || 'anonymous',
        timestamp: new Date()
      };

      next();
    } catch (error) {
      logger.error('Body validation middleware error', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl
      });
      
      return next(new ValidationError('Validation processing failed'));
    }
  };
};

/**
 * Enhanced query parameter validation
 * @param {Object} schema - Validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema, options = {}) => {
  return (req, res, next) => {
    const { allowUnknown = true, transform = true } = options;

    try {
      // Transform query parameters (string to proper types)
      if (transform) {
        req.query = transformQueryParams(req.query);
      }

      const { valid, errors, sanitized } = validateObject(req.query, schema, {
        allowUnknown
      });

      if (!valid) {
        const validationError = new ValidationError('Query parameters validation failed', errors);
        
        logger.warn('Query validation failed', {
          errors,
          query: req.query,
          url: req.originalUrl,
          method: req.method,
          userId: req.user?.id
        });
        
        return next(validationError);
      }

      // Replace query with sanitized version
      if (sanitized) {
        req.query = sanitized;
      }

      req.validationContext = {
        ...req.validationContext,
        queryValidated: true
      };

      next();
    } catch (error) {
      logger.error('Query validation middleware error', {
        error: error.message,
        url: req.originalUrl
      });
      
      return next(new ValidationError('Query validation processing failed'));
    }
  };
};

/**
 * Enhanced URL parameters validation
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { valid, errors } = validateObject(req.params, schema);

      if (!valid) {
        const validationError = new ValidationError('URL parameters validation failed', errors);
        
        logger.warn('Params validation failed', {
          errors,
          params: req.params,
          url: req.originalUrl,
          method: req.method,
          userId: req.user?.id
        });
        
        return next(validationError);
      }

      req.validationContext = {
        ...req.validationContext,
        paramsValidated: true
      };

      next();
    } catch (error) {
      logger.error('Params validation middleware error', {
        error: error.message,
        url: req.originalUrl
      });
      
      return next(new ValidationError('Parameter validation processing failed'));
    }
  };
};

/**
 * Enhanced input sanitization with security considerations
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware function
 */
const sanitize = (options = {}) => {
  const {
    stripHtml = true,
    preventXSS = true,
    preventSQLInjection = true,
    preventPathTraversal = true,
    trimWhitespace = true,
    removeNullBytes = true
  } = options;

  return (req, res, next) => {
    try {
      // Sanitize body
      if (req.body) {
        req.body = sanitizeObject(req.body, {
          stripHtml,
          preventXSS,
          preventSQLInjection,
          preventPathTraversal,
          trimWhitespace,
          removeNullBytes
        });
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = sanitizeObject(req.query, {
          stripHtml,
          preventXSS,
          preventSQLInjection,
          preventPathTraversal,
          trimWhitespace,
          removeNullBytes
        });
      }

      // Log suspicious patterns
      const suspiciousPatterns = detectSuspiciousPatterns(req.body, req.query);
      if (suspiciousPatterns.length > 0) {
        logger.warn('Suspicious input patterns detected', {
          patterns: suspiciousPatterns,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id
        });
      }

      next();
    } catch (error) {
      logger.error('Sanitization middleware error', {
        error: error.message,
        url: req.originalUrl
      });
      
      return next(new ValidationError('Input sanitization failed'));
    }
  };
};

/**
 * File upload validation middleware
 * @param {Object} options - File validation options
 * @returns {Function} Express middleware function
 */
const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ALLOWED_FILE_TYPES.DOCUMENT,
    maxSize = MAX_FILE_SIZES.DOCUMENT,
    maxFiles = 5,
    required = false
  } = options;

  return (req, res, next) => {
    try {
      const files = req.files || [];
      
      if (required && files.length === 0) {
        return next(new ValidationError('File upload is required'));
      }

      if (files.length > maxFiles) {
        return next(new ValidationError(`Maximum ${maxFiles} files allowed`));
      }

      for (const file of files) {
        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
          return next(new ValidationError(`File type ${file.mimetype} not allowed`));
        }

        // Check file size
        if (file.size > maxSize) {
          const maxSizeMB = Math.round(maxSize / (1024 * 1024));
          return next(new ValidationError(`File size exceeds ${maxSizeMB}MB limit`));
        }

        // Check for malicious file content
        if (containsMaliciousContent(file)) {
          logger.warn('Malicious file upload attempt', {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            ip: req.ip,
            userId: req.user?.id
          });
          return next(new ValidationError('File contains malicious content'));
        }
      }

      logger.info('File upload validated', {
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        userId: req.user?.id
      });

      next();
    } catch (error) {
      logger.error('File validation error', {
        error: error.message,
        url: req.originalUrl
      });
      
      return next(new ValidationError('File validation failed'));
    }
  };
};

/**
 * Custom validation middleware creator
 * @param {Function} validator - Custom validation function
 * @param {string} errorMessage - Error message for validation failure
 * @returns {Function} Express middleware function
 */
const customValidation = (validator, errorMessage = 'Custom validation failed') => {
  return async (req, res, next) => {
    try {
      const isValid = await Promise.resolve(validator(req));
      
      if (!isValid) {
        logger.warn('Custom validation failed', {
          errorMessage,
          url: req.originalUrl,
          method: req.method,
          userId: req.user?.id
        });
        
        return next(new ValidationError(errorMessage));
      }

      next();
    } catch (error) {
      logger.error('Custom validation error', {
        error: error.message,
        url: req.originalUrl
      });
      
      return next(new ValidationError('Custom validation processing failed'));
    }
  };
};

/**
 * Request size validation middleware
 * @param {Object} options - Size options
 * @returns {Function} Express middleware function
 */
const validateRequestSize = (options = {}) => {
  const { maxBodySize = 10 * 1024 * 1024, maxQueryLength = 1000 } = options; // 10MB default

  return (req, res, next) => {
    try {
      // Check body size
      const bodySize = JSON.stringify(req.body || {}).length;
      if (bodySize > maxBodySize) {
        return next(new ValidationError('Request body too large'));
      }

      // Check query string length
      const queryLength = req.url.split('?')[1]?.length || 0;
      if (queryLength > maxQueryLength) {
        return next(new ValidationError('Query string too long'));
      }

      next();
    } catch (error) {
      next(new ValidationError('Request size validation failed'));
    }
  };
};

/**
 * Sanitize an object recursively
 * @param {any} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj, options = {}) {
  const {
    stripHtml = true,
    preventXSS = true,
    preventSQLInjection = true,
    preventPathTraversal = true,
    trimWhitespace = true,
    removeNullBytes = true
  } = options;

  if (typeof obj === 'string') {
    let sanitized = obj;

    if (removeNullBytes) sanitized = sanitized.replace(SECURITY_PATTERNS.NULL_BYTES, '');
    if (stripHtml) sanitized = sanitized.replace(SECURITY_PATTERNS.HTML_TAGS, '');
    if (preventXSS) sanitized = sanitized.replace(SECURITY_PATTERNS.SCRIPT_TAGS, '');
    if (preventPathTraversal) sanitized = sanitized.replace(SECURITY_PATTERNS.PATH_TRAVERSAL, '');
    if (trimWhitespace) sanitized = sanitized.trim();

    return sanitized;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      sanitized[key] = sanitizeObject(obj[key], options);
    });
    return sanitized;
  }

  return obj;
}

/**
 * Transform query parameters to appropriate types
 * @param {Object} query - Query parameters object
 * @returns {Object} Transformed query parameters
 */
function transformQueryParams(query) {
  const transformed = {};
  
  Object.keys(query).forEach(key => {
    const value = query[key];
    
    // Handle arrays
    if (Array.isArray(value)) {
      transformed[key] = value.map(transformSingleValue);
      return;
    }
    
    transformed[key] = transformSingleValue(value);
  });
  
  return transformed;
}

/**
 * Transform a single value to appropriate type
 * @param {string} value - Value to transform
 * @returns {any} Transformed value
 */
function transformSingleValue(value) {
  if (typeof value !== 'string') return value;
  
  // Boolean transformation
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Number transformation
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
  
  // Date transformation (ISO format)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date;
  }
  
  return value;
}

/**
 * Detect suspicious patterns in input data
 * @param {any} body - Request body
 * @param {any} query - Query parameters
 * @returns {Array<string>} Array of detected suspicious patterns
 */
function detectSuspiciousPatterns(body, query) {
  const patterns = [];
  const dataToCheck = JSON.stringify({ body, query });
  
  if (SECURITY_PATTERNS.SQL_INJECTION.test(dataToCheck)) {
    patterns.push('SQL_INJECTION');
  }
  
  if (SECURITY_PATTERNS.XSS_ATTEMPTS.test(dataToCheck)) {
    patterns.push('XSS_ATTEMPT');
  }
  
  if (SECURITY_PATTERNS.PATH_TRAVERSAL.test(dataToCheck)) {
    patterns.push('PATH_TRAVERSAL');
  }
  
  if (SECURITY_PATTERNS.SCRIPT_TAGS.test(dataToCheck)) {
    patterns.push('SCRIPT_INJECTION');
  }
  
  return patterns;
}

/**
 * Sanitize data for logging (remove sensitive information)
 * @param {any} data - Data to sanitize for logging
 * @returns {any} Sanitized data
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'ssn', 'creditcard'];
  const sanitized = JSON.parse(JSON.stringify(data));
  
  function sanitizeRecursive(obj) {
    Object.keys(obj).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeRecursive(obj[key]);
      }
    });
  }
  
  sanitizeRecursive(sanitized);
  return sanitized;
}

/**
 * Check if file contains malicious content
 * @param {Object} file - Uploaded file object
 * @returns {boolean} True if file is suspicious
 */
function containsMaliciousContent(file) {
  // Check file extension vs MIME type mismatch
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  const expectedMimeTypes = {
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'gif': ['image/gif'],
    'pdf': ['application/pdf'],
    'doc': ['application/msword'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };
  
  if (extension && expectedMimeTypes[extension]) {
    if (!expectedMimeTypes[extension].includes(file.mimetype)) {
      return true; // MIME type mismatch
    }
  }
  
  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|pif|vbs|js|jar)$/i,
    /\.(php|asp|aspx|jsp|cgi)$/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(file.originalname));
}

module.exports = {
  // Core validation middleware
  validateBody,
  validateQuery,
  validateParams,
  sanitize,
  
  // Enhanced validation middleware
  validateFileUpload,
  customValidation,
  validateRequestSize,
  
  // Utility functions
  sanitizeObject,
  transformQueryParams,
  detectSuspiciousPatterns,
  sanitizeForLogging,
  
  // Constants
  SECURITY_PATTERNS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZES
};
