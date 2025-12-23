/**
 * Authentication Middleware
 * 
 * JWT token verification and user authentication
 * Feature 5: User authentication and authorization
 * 
 * Enhanced with session management, rate limiting, and security features
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/env');
const { hasPermission, getUserPermissions } = require('../config/permissions');

// In-memory session store (use Redis in production)
const activeSessions = new Map();
const loginAttempts = new Map();

/**
 * Rate limiting for login attempts
 */
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Verify JWT token with enhanced security
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      logger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session is still active
    const sessionKey = `${decoded.id}_${decoded.sessionId}`;
    if (!activeSessions.has(sessionKey)) {
      logger.warn('Token valid but session inactive', {
        userId: decoded.id,
        sessionId: decoded.sessionId,
        ip: req.ip
      });
      return res.status(401).json({ 
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }

    // Update last activity
    const session = activeSessions.get(sessionKey);
    session.lastActivity = new Date();
    activeSessions.set(sessionKey, session);

    // Attach user info to request
    req.user = {
      ...decoded,
      permissions: getUserPermissions(decoded.role),
      sessionId: decoded.sessionId
    };
    
    // Add request metadata
    req.authContext = {
      tokenIssued: new Date(decoded.iat * 1000),
      tokenExpires: new Date(decoded.exp * 1000),
      sessionStarted: session.startedAt
    };

    logger.debug('User authenticated successfully', {
      userId: decoded.id,
      role: decoded.role,
      sessionId: decoded.sessionId
    });

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired', {
        error: error.message,
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token', {
        error: error.message,
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    logger.error('Token verification failed', { 
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    return res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const sessionKey = `${decoded.id}_${decoded.sessionId}`;
    
    if (activeSessions.has(sessionKey)) {
      req.user = {
        ...decoded,
        permissions: getUserPermissions(decoded.role),
        sessionId: decoded.sessionId
      };
    }
  } catch (error) {
    // Silently ignore token errors in optional auth
    logger.debug('Optional auth token invalid', { error: error.message });
  }
  
  next();
};

/**
 * Check if user has specific permission
 * @param {string} requiredPermission - Required permission string
 * @returns {Function} Express middleware function
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userHasPermission = hasPermission(req.user.role, requiredPermission);
    
    if (!userHasPermission) {
      logger.warn('Permission denied', {
        userId: req.user.id,
        role: req.user.role,
        requiredPermission,
        userPermissions: req.user.permissions,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: requiredPermission
      });
    }

    logger.debug('Permission granted', {
      userId: req.user.id,
      role: req.user.role,
      permission: requiredPermission
    });

    next();
  };
};

/**
 * Check if user has any of multiple permissions
 * @param {Array<string>} requiredPermissions - Array of required permissions
 * @returns {Function} Express middleware function
 */
const checkAnyPermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const hasAny = requiredPermissions.some((perm) =>
      hasPermission(req.user.role, perm)
    );

    if (!hasAny) {
      logger.warn('Permission denied - no matching permissions', {
        userId: req.user.id,
        role: req.user.role,
        requiredPermissions,
        userPermissions: req.user.permissions,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: requiredPermissions
      });
    }

    next();
  };
};

/**
 * Check if user has all required permissions
 * @param {Array<string>} requiredPermissions - Array of required permissions
 * @returns {Function} Express middleware function
 */
const checkAllPermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const hasAll = requiredPermissions.every((perm) =>
      hasPermission(req.user.role, perm)
    );

    if (!hasAll) {
      const missingPermissions = requiredPermissions.filter(perm => 
        !hasPermission(req.user.role, perm)
      );
      
      logger.warn('Permission denied - missing permissions', {
        userId: req.user.id,
        role: req.user.role,
        missingPermissions,
        requiredPermissions,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: requiredPermissions,
        missing: missingPermissions
      });
    }

    next();
  };
};

/**
 * Restrict access to specific roles
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = req.user.role;
    const hasRole = Array.isArray(allowedRoles) 
      ? allowedRoles.includes(userRole)
      : userRole === allowedRoles;

    if (!hasRole) {
      logger.warn('Role access denied', {
        userId: req.user.id,
        userRole,
        allowedRoles,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ 
        error: 'Role not authorized',
        code: 'ROLE_DENIED',
        required: allowedRoles
      });
    }

    next();
  };
};

/**
 * Restrict resource access to owner or specific permissions
 * @param {string} resourceIdParam - Parameter name for resource ID
 * @param {string} ownerField - Field name that contains owner ID
 * @param {string} overridePermission - Permission that bypasses ownership check
 * @returns {Function} Express middleware function
 */
const requireOwnershipOrPermission = (resourceIdParam, ownerField = 'userId', overridePermission = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Check if user has override permission
    if (overridePermission && hasPermission(req.user.role, overridePermission)) {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      return res.status(400).json({ 
        error: 'Resource ID required',
        code: 'RESOURCE_ID_REQUIRED'
      });
    }

    try {
      // This would typically query the database to check ownership
      // For now, we'll assume the resource check happens in the route handler
      logger.debug('Ownership check required', {
        userId: req.user.id,
        resourceId,
        resourceIdParam,
        ownerField
      });
      
      // Attach ownership check info to request
      req.ownershipCheck = {
        resourceId,
        ownerField,
        overridePermission
      };
      
      next();
    } catch (error) {
      logger.error('Ownership check failed', {
        error: error.message,
        userId: req.user.id,
        resourceId
      });
      return res.status(500).json({ 
        error: 'Authorization check failed',
        code: 'AUTH_CHECK_FAILED'
      });
    }
  };
};

/**
 * Rate limiting for authentication endpoints
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const rateLimitAuth = (req, res, next) => {
  const clientId = req.ip + '_' + (req.body.email || req.body.username || 'unknown');
  const now = Date.now();
  
  const attempts = loginAttempts.get(clientId) || { count: 0, lastAttempt: now };
  
  // Reset if lockout period has passed
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    attempts.count = 0;
  }
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const remainingTime = Math.ceil((LOCKOUT_DURATION - (now - attempts.lastAttempt)) / 1000 / 60);
    
    logger.warn('Authentication rate limit exceeded', {
      clientId,
      attempts: attempts.count,
      remainingTime,
      ip: req.ip
    });
    
    return res.status(429).json({
      error: 'Too many authentication attempts',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: remainingTime
    });
  }
  
  // Increment attempt count
  attempts.count++;
  attempts.lastAttempt = now;
  loginAttempts.set(clientId, attempts);
  
  next();
};

/**
 * Create session for user
 * @param {Object} user - User object
 * @param {string} ip - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Object} Session info with tokens
 */
const createSession = (user, ip, userAgent) => {
  const sessionId = require('crypto').randomUUID();
  const now = new Date();
  
  // Create session data
  const sessionData = {
    userId: user.id,
    sessionId,
    ip,
    userAgent,
    startedAt: now,
    lastActivity: now
  };
  
  // Store session
  const sessionKey = `${user.id}_${sessionId}`;
  activeSessions.set(sessionKey, sessionData);
  
  // Create tokens
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    sessionId
  };
  
  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign({ sessionId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  logger.info('Session created', {
    userId: user.id,
    sessionId,
    ip,
    userAgent: userAgent?.substring(0, 100)
  });
  
  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresIn: 24 * 60 * 60 * 1000 // 24 hours
  };
};

/**
 * Destroy session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const destroySession = (req, res, next) => {
  if (req.user && req.user.sessionId) {
    const sessionKey = `${req.user.id}_${req.user.sessionId}`;
    activeSessions.delete(sessionKey);
    
    logger.info('Session destroyed', {
      userId: req.user.id,
      sessionId: req.user.sessionId,
      ip: req.ip
    });
  }
  
  next();
};

/**
 * Clear expired sessions (cleanup utility)
 */
const clearExpiredSessions = () => {
  const now = new Date();
  const expiredSessions = [];
  
  for (const [sessionKey, session] of activeSessions.entries()) {
    // Consider session expired if inactive for more than 7 days
    const maxInactivity = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (now - session.lastActivity > maxInactivity) {
      expiredSessions.push(sessionKey);
    }
  }
  
  expiredSessions.forEach(key => activeSessions.delete(key));
  
  if (expiredSessions.length > 0) {
    logger.info('Cleared expired sessions', { count: expiredSessions.length });
  }
  
  return expiredSessions.length;
};

// Clean up expired sessions every hour
setInterval(clearExpiredSessions, 60 * 60 * 1000);

module.exports = {
  verifyToken,
  optionalAuth,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  requireRole,
  requireOwnershipOrPermission,
  rateLimitAuth,
  createSession,
  destroySession,
  clearExpiredSessions,
  // Utility exports for testing
  _activeSessions: activeSessions,
  _loginAttempts: loginAttempts
};
