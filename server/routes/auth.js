/**
 * Authentication Routes
 * 
 * Routes for user authentication, registration, password management, and session handling
 * Feature 5: User authentication and authorization
 * 
 * Enhanced with comprehensive security, rate limiting, MFA, and session management
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, optionalAuth, rateLimitAuth, createSession, destroySession } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logView } = require('../middleware/auditLogger');

// Service imports
const authService = require('../services/authService');
const notificationService = require('../services/notificationService');

// Validation schemas
const authValidation = {
  login: {
    email: { type: 'string', required: true, format: 'email' },
    password: { type: 'string', required: true, minLength: 1 },
    rememberMe: { type: 'boolean', default: false },
    mfaCode: { type: 'string', length: 6, pattern: /^\d{6}$/ }
  },
  register: {
    email: { type: 'string', required: true, format: 'email' },
    password: { type: 'string', required: true, minLength: 8, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/ },
    firstName: { type: 'string', required: true, minLength: 1, maxLength: 50 },
    lastName: { type: 'string', required: true, minLength: 1, maxLength: 50 },
    department: { type: 'string', maxLength: 100 },
    phone: { type: 'string', pattern: /^\+?[\d\s\-\(\)]{10,15}$/ },
    acceptTerms: { type: 'boolean', required: true, enum: [true] }
  },
  forgotPassword: {
    email: { type: 'string', required: true, format: 'email' }
  },
  resetPassword: {
    token: { type: 'string', required: true },
    password: { type: 'string', required: true, minLength: 8, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/ },
    confirmPassword: { type: 'string', required: true }
  },
  changePassword: {
    currentPassword: { type: 'string', required: true },
    newPassword: { type: 'string', required: true, minLength: 8, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/ },
    confirmPassword: { type: 'string', required: true }
  },
  updateProfile: {
    firstName: { type: 'string', minLength: 1, maxLength: 50 },
    lastName: { type: 'string', minLength: 1, maxLength: 50 },
    department: { type: 'string', maxLength: 100 },
    phone: { type: 'string', pattern: /^\+?[\d\s\-\(\)]{10,15}$/ },
    preferences: { type: 'object' },
    notificationSettings: { type: 'object' }
  },
  refreshToken: {
    refreshToken: { type: 'string', required: true }
  },
  mfaSetup: {
    secret: { type: 'string', required: true },
    code: { type: 'string', required: true, length: 6, pattern: /^\d{6}$/ }
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
router.post('/login',
  rateLimitAuth,
  validateBody(authValidation.login),
  sanitize(),
  logCreate('auth', 'login_attempt'),
  asyncHandler(async (req, res) => {
    const { email, password, rememberMe = false, mfaCode } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    // Attempt authentication
    const authResult = await authService.authenticate({
      email,
      password,
      mfaCode,
      ip,
      userAgent
    });

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message,
        code: authResult.code,
        requiresMFA: authResult.requiresMFA,
        lockoutRemaining: authResult.lockoutRemaining
      });
    }

    // Create session
    const sessionData = createSession(authResult.user, ip, userAgent);

    // Set token expiration based on rememberMe
    const tokenOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
    };

    // Set refresh token cookie
    res.cookie('refreshToken', sessionData.refreshToken, {
      ...tokenOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    await authService.updateLastLogin(authResult.user.id, { ip, userAgent });

    // Send login notification if enabled
    if (authResult.user.notificationSettings?.loginNotifications) {
      await notificationService.notifyLogin(authResult.user.id, { ip, userAgent, timestamp: new Date() });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          firstName: authResult.user.firstName,
          lastName: authResult.user.lastName,
          role: authResult.user.role,
          permissions: authResult.user.permissions,
          department: authResult.user.department,
          lastLogin: authResult.user.lastLogin,
          preferences: authResult.user.preferences
        },
        accessToken: sessionData.accessToken,
        expiresIn: sessionData.expiresIn,
        sessionId: sessionData.sessionId
      }
    });
  })
);

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public (if registration is enabled)
 */
router.post('/register',
  rateLimitAuth,
  validateBody(authValidation.register),
  sanitize(),
  logCreate('auth', 'registration_attempt'),
  asyncHandler(async (req, res) => {
    const userData = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    // Check if registration is enabled
    const registrationEnabled = process.env.ENABLE_REGISTRATION === 'true';
    if (!registrationEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Registration is currently disabled',
        code: 'REGISTRATION_DISABLED'
      });
    }

    // Register user
    const registrationResult = await authService.register({
      ...userData,
      registrationSource: 'web',
      registrationIP: ip,
      registrationUserAgent: userAgent
    });

    if (!registrationResult.success) {
      return res.status(400).json({
        success: false,
        message: registrationResult.message,
        code: registrationResult.code,
        errors: registrationResult.errors
      });
    }

    // Send welcome email
    await notificationService.sendWelcomeEmail(registrationResult.user.id);

    // Send email verification if required
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      await authService.sendEmailVerification(registrationResult.user.id);
      
      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email address.',
        data: {
          userId: registrationResult.user.id,
          requiresEmailVerification: true
        }
      });
    }

    // Auto-login if email verification not required
    const sessionData = createSession(registrationResult.user, ip, userAgent);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: registrationResult.user.id,
          email: registrationResult.user.email,
          firstName: registrationResult.user.firstName,
          lastName: registrationResult.user.lastName,
          role: registrationResult.user.role
        },
        accessToken: sessionData.accessToken,
        expiresIn: sessionData.expiresIn,
        sessionId: sessionData.sessionId
      }
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout',
  verifyToken,
  destroySession,
  logCreate('auth', 'logout'),
  asyncHandler(async (req, res) => {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    // Blacklist current token
    await authService.blacklistToken(req.headers.authorization?.split(' ')[1]);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  verifyToken,
  logView('auth', 'profile'),
  asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        department: user.department,
        phone: user.phone,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        preferences: user.preferences,
        notificationSettings: user.notificationSettings,
        mfaEnabled: user.mfaEnabled,
        emailVerified: user.emailVerified
      }
    });
  })
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  verifyToken,
  validateBody(authValidation.updateProfile),
  sanitize(),
  logUpdate('auth', 'profile'),
  asyncHandler(async (req, res) => {
    const updates = {
      ...req.body,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    const updatedUser = await authService.updateProfile(req.user.id, updates);

    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
  })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password',
  rateLimitAuth,
  validateBody(authValidation.forgotPassword),
  sanitize(),
  logCreate('auth', 'password_reset_request'),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.requestPasswordReset({
      email,
      ip,
      userAgent
    });

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account with that email exists, you will receive a password reset email shortly.'
    });
  })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
  rateLimitAuth,
  validateBody(authValidation.resetPassword),
  sanitize(),
  logCreate('auth', 'password_reset'),
  asyncHandler(async (req, res) => {
    const { token, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    const result = await authService.resetPassword(token, password);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        code: result.code
      });
    }

    // Send password change confirmation
    await notificationService.notifyPasswordChanged(result.userId);

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  })
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
  verifyToken,
  validateBody(authValidation.changePassword),
  sanitize(),
  logUpdate('auth', 'password_change'),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    const result = await authService.changePassword(req.user.id, {
      currentPassword,
      newPassword
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        code: result.code
      });
    }

    // Send password change notification
    await notificationService.notifyPasswordChanged(req.user.id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (with refresh token)
 */
router.post('/refresh',
  validateBody(authValidation.refreshToken),
  logCreate('auth', 'token_refresh'),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body || {};
    const cookieRefreshToken = req.cookies?.refreshToken;
    
    const tokenToUse = refreshToken || cookieRefreshToken;

    if (!tokenToUse) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    const result = await authService.refreshToken(tokenToUse);

    if (!result.success) {
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken');
      
      return res.status(401).json({
        success: false,
        message: result.message,
        code: result.code
      });
    }

    // Update refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      }
    });
  })
);

/**
 * @route   POST /api/auth/mfa/setup
 * @desc    Setup multi-factor authentication
 * @access  Private
 */
router.post('/mfa/setup',
  verifyToken,
  validateBody(authValidation.mfaSetup),
  logUpdate('auth', 'mfa_setup'),
  asyncHandler(async (req, res) => {
    const { secret, code } = req.body;

    const result = await authService.setupMFA(req.user.id, { secret, code });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        code: result.code
      });
    }

    // Send MFA enabled notification
    await notificationService.notifyMFAEnabled(req.user.id);

    res.json({
      success: true,
      data: {
        backupCodes: result.backupCodes
      },
      message: 'MFA setup successful'
    });
  })
);

/**
 * @route   DELETE /api/auth/mfa
 * @desc    Disable multi-factor authentication
 * @access  Private
 */
router.delete('/mfa',
  verifyToken,
  validateBody({
    password: { type: 'string', required: true },
    mfaCode: { type: 'string', required: true, length: 6, pattern: /^\d{6}$/ }
  }),
  logUpdate('auth', 'mfa_disable'),
  asyncHandler(async (req, res) => {
    const { password, mfaCode } = req.body;

    const result = await authService.disableMFA(req.user.id, { password, mfaCode });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        code: result.code
      });
    }

    // Send MFA disabled notification
    await notificationService.notifyMFADisabled(req.user.id);

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  })
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions',
  verifyToken,
  logView('auth', 'sessions'),
  asyncHandler(async (req, res) => {
    const sessions = await authService.getActiveSessions(req.user.id);

    res.json({
      success: true,
      data: sessions
    });
  })
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId',
  verifyToken,
  validateParams({ sessionId: { type: 'string', required: true } }),
  logUpdate('auth', 'session_revoke'),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const result = await authService.revokeSession(req.user.id, sessionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  })
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email',
  validateBody({ token: { type: 'string', required: true } }),
  logCreate('auth', 'email_verification'),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        code: result.code
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  })
);

/**
 * @route   GET /api/auth/check-token
 * @desc    Check if token is valid
 * @access  Public
 */
router.get('/check-token',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isValid = !!req.user;
    
    res.json({
      success: true,
      data: {
        isValid,
        user: isValid ? {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        } : null
      }
    });
  })
);

module.exports = router;
