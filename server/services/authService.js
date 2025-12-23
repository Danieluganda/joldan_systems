const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const User = require('../db/models/User');
const AuditLog = require('../db/models/AuditLog');
const UserSession = require('../db/models/UserSession');
const LoginAttempt = require('../db/models/LoginAttempt');
const PasswordReset = require('../db/models/PasswordReset');
const DeviceFingerprint = require('../db/models/DeviceFingerprint');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const { validateInput, sanitize } = require('../utils/validation');
const { 
  JWT_SECRET, 
  JWT_REFRESH_SECRET, 
  JWT_EXPIRY, 
  JWT_REFRESH_EXPIRY,
  BCRYPT_ROUNDS,
  MAX_LOGIN_ATTEMPTS,
  ACCOUNT_LOCKOUT_DURATION,
  PASSWORD_MIN_LENGTH,
  COMPANY_NAME
} = require('../config/env');

// Constants for authentication
const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  RESET: 'reset',
  VERIFICATION: 'verification',
  MFA: 'mfa'
};

const AUTH_EVENTS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  TOKEN_REFRESH: 'token_refresh',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOCKED: 'locked',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification'
};

const SESSION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  TERMINATED: 'terminated'
};

const MFA_METHODS = {
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
  BACKUP_CODES: 'backup_codes'
};

class AuthService {
  /**
   * Initialize authentication service
   */
  static async initialize() {
    try {
      // Set up rate limiting for login attempts
      this.loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 requests per windowMs
        message: 'Too many login attempts from this IP, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
      });

      // Clean up expired sessions and tokens periodically
      setInterval(() => {
        this.cleanupExpiredSessions();
        this.cleanupExpiredTokens();
      }, 60 * 60 * 1000); // Every hour

      logger.info('AuthService initialized successfully');
    } catch (error) {
      logger.error('Error initializing AuthService', { error: error.message });
      throw error;
    }
  }

  /**
   * Register new user
   */
  static async register(userData, requestInfo = {}) {
    try {
      const { username, email, password, firstName, lastName, department, role = 'user' } = userData;
      const { ipAddress, userAgent, deviceId } = requestInfo;

      // Validate input data
      await this.validateRegistrationData({ username, email, password, firstName, lastName });

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      });

      if (existingUser) {
        await auditService.logAuthEvent({
          action: 'registration_failed',
          userId: null,
          metadata: {
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            reason: 'user_already_exists',
            ipAddress,
            userAgent
          }
        });
        
        throw new Error('User with this email or username already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const user = new User({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: sanitize(firstName),
        lastName: sanitize(lastName),
        department: sanitize(department),
        roles: [role],
        status: ACCOUNT_STATUS.PENDING_VERIFICATION,
        verificationToken,
        createdAt: new Date(),
        profile: {
          lastLogin: null,
          loginCount: 0,
          failedLoginAttempts: 0,
          accountLocked: false,
          lockoutUntil: null,
          mfaEnabled: false,
          preferredMfaMethod: null
        },
        security: {
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          deviceFingerprints: [],
          trustedDevices: [],
          suspiciousActivities: []
        }
      });

      await user.save();

      // Log registration audit event
      await auditService.logAuthEvent({
        action: 'user_registered',
        userId: user._id,
        metadata: {
          username: user.username,
          email: user.email,
          department: user.department,
          roles: user.roles,
          ipAddress,
          userAgent,
          deviceId
        }
      });

      // Send verification email
      await this.sendVerificationEmail(user);

      return {
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        userId: user._id,
        username: user.username,
        email: user.email,
        verificationRequired: true
      };

    } catch (error) {
      logger.error('Error registering user', { error: error.message, userData: { email: userData.email, username: userData.username } });
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user login
   */
  static async login(credentials, requestInfo = {}) {
    try {
      const { login, password, mfaCode, rememberMe = false } = credentials;
      const { ipAddress, userAgent, deviceId } = requestInfo;

      // Validate input
      if (!login || !password) {
        throw new Error('Username/email and password are required');
      }

      // Find user by username or email
      const user = await User.findOne({
        $or: [
          { email: login.toLowerCase() },
          { username: login.toLowerCase() }
        ]
      });

      // Log login attempt
      await this.logLoginAttempt(login, ipAddress, userAgent, false);

      if (!user) {
        await auditService.logAuthEvent({
          action: AUTH_EVENTS.LOGIN_FAILED,
          userId: null,
          metadata: {
            login: login.toLowerCase(),
            reason: 'user_not_found',
            ipAddress,
            userAgent,
            deviceId
          }
        });
        
        throw new Error('Invalid credentials');
      }

      // Check account status
      await this.checkAccountStatus(user);

      // Check for account lockout
      if (user.profile.accountLocked && user.profile.lockoutUntil > new Date()) {
        const remainingTime = Math.ceil((user.profile.lockoutUntil - new Date()) / (1000 * 60));
        
        await auditService.logAuthEvent({
          action: AUTH_EVENTS.LOGIN_FAILED,
          userId: user._id,
          metadata: {
            reason: 'account_locked',
            remainingLockoutMinutes: remainingTime,
            ipAddress,
            userAgent
          }
        });
        
        throw new Error(`Account is locked. Try again in ${remainingTime} minutes.`);
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        await this.handleFailedLogin(user, ipAddress, userAgent);
        throw new Error('Invalid credentials');
      }

      // Check for MFA requirement
      if (user.profile.mfaEnabled) {
        if (!mfaCode) {
          // Return MFA challenge
          const mfaToken = await this.generateMFAToken(user._id);
          return {
            requiresMFA: true,
            mfaToken,
            mfaMethods: user.profile.mfaMethods || [MFA_METHODS.TOTP],
            message: 'MFA code required'
          };
        }

        // Verify MFA code
        const isMFAValid = await this.verifyMFACode(user, mfaCode);
        if (!isMFAValid) {
          await this.handleFailedLogin(user, ipAddress, userAgent);
          throw new Error('Invalid MFA code');
        }
      }

      // Reset failed login attempts
      await User.findByIdAndUpdate(user._id, {
        $set: {
          'profile.failedLoginAttempts': 0,
          'profile.accountLocked': false,
          'profile.lockoutUntil': null,
          'profile.lastLogin': new Date(),
          'profile.lastLoginIP': ipAddress,
          'profile.lastLoginUserAgent': userAgent
        },
        $inc: { 'profile.loginCount': 1 }
      });

      // Generate device fingerprint
      const fingerprint = await this.generateDeviceFingerprint(userAgent, ipAddress, deviceId);
      
      // Check for trusted device
      const isTrustedDevice = await this.checkTrustedDevice(user._id, fingerprint);
      if (!isTrustedDevice) {
        await this.handleNewDeviceLogin(user, fingerprint, ipAddress, userAgent);
      }

      // Create user session
      const session = await this.createUserSession(user, {
        ipAddress,
        userAgent,
        deviceFingerprint: fingerprint,
        rememberMe,
        isTrustedDevice
      });

      // Generate tokens
      const accessToken = await this.generateAccessToken(user, session._id);
      const refreshToken = await this.generateRefreshToken(user, session._id);

      // Update session with tokens
      session.accessToken = accessToken;
      session.refreshToken = refreshToken;
      await session.save();

      // Log successful login
      await auditService.logAuthEvent({
        action: AUTH_EVENTS.LOGIN_SUCCESS,
        userId: user._id,
        metadata: {
          sessionId: session._id,
          ipAddress,
          userAgent,
          deviceFingerprint: fingerprint,
          isTrustedDevice,
          mfaUsed: user.profile.mfaEnabled
        }
      });

      // Update login attempt log
      await this.logLoginAttempt(login, ipAddress, userAgent, true, user._id);

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department,
          roles: user.roles,
          permissions: await this.getUserPermissions(user),
          profile: {
            lastLogin: user.profile.lastLogin,
            loginCount: user.profile.loginCount,
            mfaEnabled: user.profile.mfaEnabled
          }
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: JWT_EXPIRY
        },
        session: {
          id: session._id,
          expiresAt: session.expiresAt,
          isTrustedDevice
        }
      };

    } catch (error) {
      logger.error('Error during login', { error: error.message, login: credentials.login });
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(refreshToken, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const { userId, sessionId, type } = decoded;

      if (type !== TOKEN_TYPES.REFRESH) {
        throw new Error('Invalid token type');
      }

      // Find user and session
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const session = await UserSession.findOne({
        _id: sessionId,
        userId,
        status: SESSION_STATUS.ACTIVE,
        refreshToken
      });

      if (!session) {
        throw new Error('Invalid or expired session');
      }

      // Check if session is still valid
      if (session.expiresAt < new Date()) {
        await this.revokeSession(sessionId);
        throw new Error('Session has expired');
      }

      // Generate new tokens
      const newAccessToken = await this.generateAccessToken(user, sessionId);
      const newRefreshToken = await this.generateRefreshToken(user, sessionId);

      // Update session
      await UserSession.findByIdAndUpdate(sessionId, {
        $set: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          lastActivity: new Date(),
          ipAddress,
          userAgent
        }
      });

      // Log token refresh
      await auditService.logAuthEvent({
        action: AUTH_EVENTS.TOKEN_REFRESH,
        userId: user._id,
        metadata: {
          sessionId,
          ipAddress,
          userAgent,
          oldTokenExpiry: decoded.exp,
          newTokenExpiry: Math.floor(Date.now() / 1000) + (JWT_EXPIRY / 1000)
        }
      });

      return {
        success: true,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: JWT_EXPIRY
        }
      };

    } catch (error) {
      logger.error('Error refreshing token', { error: error.message });
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Logout user
   */
  static async logout(sessionId, userId, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      if (sessionId) {
        await this.revokeSession(sessionId);
      } else if (userId) {
        // Logout from all sessions
        await this.revokeAllUserSessions(userId);
      }

      // Log logout event
      await auditService.logAuthEvent({
        action: AUTH_EVENTS.LOGOUT,
        userId,
        metadata: {
          sessionId,
          ipAddress,
          userAgent,
          logoutType: sessionId ? 'single_session' : 'all_sessions'
        }
      });

      return {
        success: true,
        message: 'Logout successful'
      };

    } catch (error) {
      logger.error('Error during logout', { error: error.message, sessionId, userId });
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId, currentPassword, newPassword, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      // Validate input
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }

      // Validate new password strength
      await this.validatePasswordStrength(newPassword);

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        await auditService.logAuthEvent({
          action: 'password_change_failed',
          userId,
          metadata: {
            reason: 'invalid_current_password',
            ipAddress,
            userAgent
          }
        });
        
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
      await User.findByIdAndUpdate(userId, {
        $set: {
          password: hashedPassword,
          'security.passwordChangedAt': new Date(),
          'security.mustChangePassword': false
        }
      });

      // Revoke all existing sessions except current one
      await UserSession.updateMany(
        { userId, status: SESSION_STATUS.ACTIVE },
        { $set: { status: SESSION_STATUS.REVOKED, revokedAt: new Date() } }
      );

      // Log password change
      await auditService.logAuthEvent({
        action: AUTH_EVENTS.PASSWORD_CHANGE,
        userId,
        metadata: {
          ipAddress,
          userAgent,
          sessionRevoked: true
        }
      });

      // Send notification
      await notificationService.sendNotification({
        type: 'password_changed',
        title: 'Password Changed',
        message: 'Your password has been successfully changed',
        userId,
        priority: 'medium'
      });

      return {
        success: true,
        message: 'Password changed successfully. Please login again.',
        requiresReauth: true
      };

    } catch (error) {
      logger.error('Error changing password', { error: error.message, userId });
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal whether user exists or not
        return {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token
      const passwordReset = new PasswordReset({
        userId: user._id,
        email: user.email,
        resetToken,
        expiresAt: resetTokenExpiry,
        ipAddress,
        userAgent,
        used: false
      });

      await passwordReset.save();

      // Send reset email
      await this.sendPasswordResetEmail(user, resetToken);

      // Log password reset request
      await auditService.logAuthEvent({
        action: 'password_reset_requested',
        userId: user._id,
        metadata: {
          email: user.email,
          resetTokenId: passwordReset._id,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: 'Password reset instructions have been sent to your email.'
      };

    } catch (error) {
      logger.error('Error requesting password reset', { error: error.message, email });
      throw new Error(`Password reset request failed: ${error.message}`);
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(resetToken, newPassword, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      if (!resetToken || !newPassword) {
        throw new Error('Reset token and new password are required');
      }

      // Validate new password strength
      await this.validatePasswordStrength(newPassword);

      // Find and validate reset token
      const passwordReset = await PasswordReset.findOne({
        resetToken,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!passwordReset) {
        throw new Error('Invalid or expired reset token');
      }

      // Find user
      const user = await User.findById(passwordReset.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
      await User.findByIdAndUpdate(user._id, {
        $set: {
          password: hashedPassword,
          'security.passwordChangedAt': new Date(),
          'security.mustChangePassword': false,
          'profile.failedLoginAttempts': 0,
          'profile.accountLocked': false,
          'profile.lockoutUntil': null
        }
      });

      // Mark reset token as used
      await PasswordReset.findByIdAndUpdate(passwordReset._id, {
        $set: { used: true, usedAt: new Date() }
      });

      // Revoke all user sessions
      await this.revokeAllUserSessions(user._id);

      // Log password reset
      await auditService.logAuthEvent({
        action: AUTH_EVENTS.PASSWORD_RESET,
        userId: user._id,
        metadata: {
          resetTokenId: passwordReset._id,
          ipAddress,
          userAgent,
          allSessionsRevoked: true
        }
      });

      // Send confirmation notification
      await notificationService.sendNotification({
        type: 'password_reset_completed',
        title: 'Password Reset Completed',
        message: 'Your password has been successfully reset',
        userId: user._id,
        priority: 'medium'
      });

      return {
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.'
      };

    } catch (error) {
      logger.error('Error resetting password', { error: error.message });
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Enable Multi-Factor Authentication
   */
  static async enableMFA(userId, method = MFA_METHODS.TOTP, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.profile.mfaEnabled) {
        throw new Error('MFA is already enabled for this user');
      }

      let mfaData = {};

      switch (method) {
        case MFA_METHODS.TOTP:
          // Generate TOTP secret
          const secret = speakeasy.generateSecret({
            name: `${COMPANY_NAME}:${user.email}`,
            issuer: COMPANY_NAME
          });

          // Generate QR code
          const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

          mfaData = {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            backupCodes: this.generateBackupCodes()
          };
          break;

        case MFA_METHODS.SMS:
          if (!user.phoneNumber) {
            throw new Error('Phone number is required for SMS MFA');
          }
          mfaData = { phoneNumber: user.phoneNumber };
          break;

        case MFA_METHODS.EMAIL:
          mfaData = { email: user.email };
          break;

        default:
          throw new Error('Unsupported MFA method');
      }

      // Update user with MFA data (but don't enable yet)
      await User.findByIdAndUpdate(userId, {
        $set: {
          'mfa.method': method,
          'mfa.secret': mfaData.secret,
          'mfa.backupCodes': mfaData.backupCodes,
          'mfa.setupCompleted': false,
          'mfa.setupAt': new Date()
        }
      });

      // Log MFA setup initiation
      await auditService.logAuthEvent({
        action: 'mfa_setup_initiated',
        userId,
        metadata: {
          method,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: 'MFA setup initiated. Please verify with the code to complete setup.',
        mfaData: {
          method,
          qrCode: mfaData.qrCode,
          backupCodes: mfaData.backupCodes,
          setupToken: await this.generateSetupToken(userId)
        }
      };

    } catch (error) {
      logger.error('Error enabling MFA', { error: error.message, userId });
      throw new Error(`MFA setup failed: ${error.message}`);
    }
  }

  /**
   * Verify MFA setup
   */
  static async verifyMFASetup(userId, setupToken, verificationCode, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      // Verify setup token
      const decoded = jwt.verify(setupToken, JWT_SECRET);
      if (decoded.userId !== userId || decoded.type !== 'mfa_setup') {
        throw new Error('Invalid setup token');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify MFA code
      let isValid = false;
      switch (user.mfa.method) {
        case MFA_METHODS.TOTP:
          isValid = speakeasy.totp.verify({
            secret: user.mfa.secret,
            encoding: 'base32',
            token: verificationCode,
            window: 2
          });
          break;

        case MFA_METHODS.BACKUP_CODES:
          isValid = user.mfa.backupCodes.includes(verificationCode);
          if (isValid) {
            // Remove used backup code
            await User.findByIdAndUpdate(userId, {
              $pull: { 'mfa.backupCodes': verificationCode }
            });
          }
          break;

        default:
          throw new Error('Unsupported MFA method for verification');
      }

      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Enable MFA
      await User.findByIdAndUpdate(userId, {
        $set: {
          'profile.mfaEnabled': true,
          'profile.mfaMethods': [user.mfa.method],
          'mfa.setupCompleted': true,
          'mfa.enabledAt': new Date()
        }
      });

      // Log MFA enabled
      await auditService.logAuthEvent({
        action: AUTH_EVENTS.MFA_ENABLED,
        userId,
        metadata: {
          method: user.mfa.method,
          ipAddress,
          userAgent
        }
      });

      // Send confirmation notification
      await notificationService.sendNotification({
        type: 'mfa_enabled',
        title: 'Multi-Factor Authentication Enabled',
        message: 'MFA has been successfully enabled for your account',
        userId,
        priority: 'medium'
      });

      return {
        success: true,
        message: 'MFA has been successfully enabled for your account'
      };

    } catch (error) {
      logger.error('Error verifying MFA setup', { error: error.message, userId });
      throw new Error(`MFA verification failed: ${error.message}`);
    }
  }

  /**
   * Disable Multi-Factor Authentication
   */
  static async disableMFA(userId, currentPassword, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.profile.mfaEnabled) {
        throw new Error('MFA is not enabled for this user');
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Disable MFA
      await User.findByIdAndUpdate(userId, {
        $set: {
          'profile.mfaEnabled': false,
          'profile.mfaMethods': [],
          'mfa.disabledAt': new Date()
        }
      });

      // Log MFA disabled
      await auditService.logAuthEvent({
        action: AUTH_EVENTS.MFA_DISABLED,
        userId,
        metadata: {
          method: user.mfa.method,
          ipAddress,
          userAgent
        }
      });

      // Send notification
      await notificationService.sendNotification({
        type: 'mfa_disabled',
        title: 'Multi-Factor Authentication Disabled',
        message: 'MFA has been disabled for your account',
        userId,
        priority: 'high'
      });

      return {
        success: true,
        message: 'MFA has been disabled for your account'
      };

    } catch (error) {
      logger.error('Error disabling MFA', { error: error.message, userId });
      throw new Error(`MFA disable failed: ${error.message}`);
    }
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token, tokenType = TOKEN_TYPES.ACCESS) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      const secret = tokenType === TOKEN_TYPES.ACCESS ? JWT_SECRET : JWT_REFRESH_SECRET;
      const decoded = jwt.verify(token, secret);

      // Check if token type matches
      if (decoded.type !== tokenType) {
        throw new Error('Invalid token type');
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check user status
      if (user.status !== ACCOUNT_STATUS.ACTIVE) {
        throw new Error('User account is not active');
      }

      // For access tokens, check if session is still valid
      if (tokenType === TOKEN_TYPES.ACCESS && decoded.sessionId) {
        const session = await UserSession.findOne({
          _id: decoded.sessionId,
          userId: decoded.userId,
          status: SESSION_STATUS.ACTIVE
        });

        if (!session) {
          throw new Error('Session is no longer valid');
        }

        // Update session last activity
        await UserSession.findByIdAndUpdate(decoded.sessionId, {
          $set: { lastActivity: new Date() }
        });
      }

      return {
        valid: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          permissions: await this.getUserPermissions(user)
        },
        sessionId: decoded.sessionId,
        tokenData: decoded
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get user permissions based on roles
   */
  static async getUserPermissions(user) {
    try {
      // This should be expanded based on your permission system
      const rolePermissions = {
        admin: ['*'], // All permissions
        procurement_manager: [
          'procurement:read', 'procurement:write', 'procurement:approve',
          'contract:read', 'contract:write', 'contract:approve',
          'supplier:read', 'supplier:write',
          'audit:read', 'report:read'
        ],
        procurement_officer: [
          'procurement:read', 'procurement:write',
          'contract:read', 'contract:write',
          'supplier:read', 'supplier:write'
        ],
        finance_manager: [
          'procurement:read', 'contract:read', 'approval:approve',
          'audit:read', 'report:read'
        ],
        user: [
          'procurement:read', 'contract:read', 'profile:write'
        ]
      };

      let permissions = new Set();
      
      user.roles.forEach(role => {
        const rolePerms = rolePermissions[role] || [];
        rolePerms.forEach(perm => permissions.add(perm));
      });

      return Array.from(permissions);

    } catch (error) {
      logger.error('Error getting user permissions', { error: error.message, userId: user._id });
      return [];
    }
  }

  /**
   * Get active user sessions
   */
  static async getUserSessions(userId) {
    try {
      const sessions = await UserSession.find({
        userId,
        status: SESSION_STATUS.ACTIVE,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 });

      return sessions.map(session => ({
        id: session._id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceFingerprint: session.deviceFingerprint,
        loginTime: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        isTrustedDevice: session.isTrustedDevice,
        isCurrentSession: session.isCurrentSession
      }));

    } catch (error) {
      logger.error('Error getting user sessions', { error: error.message, userId });
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }
  }

  /**
   * Revoke user session
   */
  static async revokeSession(sessionId) {
    try {
      const session = await UserSession.findByIdAndUpdate(
        sessionId,
        {
          $set: {
            status: SESSION_STATUS.REVOKED,
            revokedAt: new Date()
          }
        },
        { new: true }
      );

      if (session) {
        // Log session revocation
        await auditService.logAuthEvent({
          action: 'session_revoked',
          userId: session.userId,
          metadata: {
            sessionId,
            ipAddress: session.ipAddress,
            deviceFingerprint: session.deviceFingerprint
          }
        });
      }

      return { success: true, message: 'Session revoked successfully' };

    } catch (error) {
      logger.error('Error revoking session', { error: error.message, sessionId });
      throw new Error(`Failed to revoke session: ${error.message}`);
    }
  }

  /**
   * Revoke all user sessions
   */
  static async revokeAllUserSessions(userId, exceptSessionId = null) {
    try {
      const filter = { userId, status: SESSION_STATUS.ACTIVE };
      if (exceptSessionId) {
        filter._id = { $ne: exceptSessionId };
      }

      const result = await UserSession.updateMany(
        filter,
        {
          $set: {
            status: SESSION_STATUS.REVOKED,
            revokedAt: new Date()
          }
        }
      );

      // Log mass session revocation
      await auditService.logAuthEvent({
        action: 'all_sessions_revoked',
        userId,
        metadata: {
          revokedCount: result.modifiedCount,
          exceptSessionId
        }
      });

      return {
        success: true,
        message: `${result.modifiedCount} sessions revoked successfully`
      };

    } catch (error) {
      logger.error('Error revoking all sessions', { error: error.message, userId });
      throw new Error(`Failed to revoke sessions: ${error.message}`);
    }
  }

  // Helper methods
  static async validateRegistrationData({ username, email, password, firstName, lastName }) {
    const errors = [];

    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (!email || !this.isValidEmail(email)) {
      errors.push('Valid email is required');
    }

    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }

    if (!firstName || firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!lastName || lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    await this.validatePasswordStrength(password);

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  static async validatePasswordStrength(password) {
    const minLength = PASSWORD_MIN_LENGTH;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    if (!hasNonalphas) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, BCRYPT_ROUNDS || 12);
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async generateAccessToken(user, sessionId) {
    const payload = {
      userId: user._id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      sessionId,
      type: TOKEN_TYPES.ACCESS
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  static async generateRefreshToken(user, sessionId) {
    const payload = {
      userId: user._id,
      sessionId,
      type: TOKEN_TYPES.REFRESH
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
  }

  static async generateMFAToken(userId) {
    const payload = {
      userId,
      type: TOKEN_TYPES.MFA
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
  }

  static async generateSetupToken(userId) {
    const payload = {
      userId,
      type: 'mfa_setup'
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  }

  static async createUserSession(user, sessionData) {
    const { ipAddress, userAgent, deviceFingerprint, rememberMe, isTrustedDevice } = sessionData;

    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days for remember me
    } else {
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours default
    }

    const session = new UserSession({
      userId: user._id,
      ipAddress,
      userAgent,
      deviceFingerprint,
      status: SESSION_STATUS.ACTIVE,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt,
      isTrustedDevice,
      rememberMe
    });

    await session.save();
    return session;
  }

  static async checkAccountStatus(user) {
    if (user.status === ACCOUNT_STATUS.INACTIVE) {
      throw new Error('Account is inactive');
    }

    if (user.status === ACCOUNT_STATUS.SUSPENDED) {
      throw new Error('Account is suspended');
    }

    if (user.status === ACCOUNT_STATUS.PENDING_VERIFICATION) {
      throw new Error('Account verification is pending');
    }
  }

  static async handleFailedLogin(user, ipAddress, userAgent) {
    const failedAttempts = user.profile.failedLoginAttempts + 1;
    const updateData = {
      'profile.failedLoginAttempts': failedAttempts,
      'profile.lastFailedLogin': new Date()
    };

    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      updateData['profile.accountLocked'] = true;
      updateData['profile.lockoutUntil'] = new Date(Date.now() + ACCOUNT_LOCKOUT_DURATION);

      // Log account lockout
      await auditService.logAuthEvent({
        action: AUTH_EVENTS.ACCOUNT_LOCKED,
        userId: user._id,
        metadata: {
          failedAttempts,
          ipAddress,
          userAgent,
          lockoutDuration: ACCOUNT_LOCKOUT_DURATION
        }
      });

      // Send lockout notification
      await notificationService.sendNotification({
        type: 'account_locked',
        title: 'Account Locked',
        message: `Your account has been locked due to ${failedAttempts} failed login attempts`,
        userId: user._id,
        priority: 'high'
      });
    }

    await User.findByIdAndUpdate(user._id, { $set: updateData });

    // Log failed login
    await auditService.logAuthEvent({
      action: AUTH_EVENTS.LOGIN_FAILED,
      userId: user._id,
      metadata: {
        reason: 'invalid_password',
        failedAttempts,
        ipAddress,
        userAgent,
        accountLocked: failedAttempts >= MAX_LOGIN_ATTEMPTS
      }
    });
  }

  static async logLoginAttempt(login, ipAddress, userAgent, success, userId = null) {
    try {
      const loginAttempt = new LoginAttempt({
        login: login.toLowerCase(),
        userId,
        ipAddress,
        userAgent,
        success,
        timestamp: new Date()
      });

      await loginAttempt.save();
    } catch (error) {
      logger.error('Error logging login attempt', { error: error.message });
    }
  }

  static async verifyMFACode(user, code) {
    if (!user.profile.mfaEnabled || !user.mfa.secret) {
      return false;
    }

    // Check TOTP code
    const isValidTOTP = speakeasy.totp.verify({
      secret: user.mfa.secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (isValidTOTP) {
      return true;
    }

    // Check backup codes
    if (user.mfa.backupCodes && user.mfa.backupCodes.includes(code)) {
      // Remove used backup code
      await User.findByIdAndUpdate(user._id, {
        $pull: { 'mfa.backupCodes': code }
      });
      return true;
    }

    return false;
  }

  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  static async generateDeviceFingerprint(userAgent, ipAddress, deviceId) {
    const fingerprintData = `${userAgent}:${ipAddress}:${deviceId}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
  }

  static async checkTrustedDevice(userId, fingerprint) {
    const user = await User.findById(userId);
    return user && user.security.trustedDevices.includes(fingerprint);
  }

  static async handleNewDeviceLogin(user, fingerprint, ipAddress, userAgent) {
    // Log new device login
    await auditService.logAuthEvent({
      action: 'new_device_login',
      userId: user._id,
      metadata: {
        deviceFingerprint: fingerprint,
        ipAddress,
        userAgent
      }
    });

    // Send new device notification
    await notificationService.sendNotification({
      type: 'new_device_login',
      title: 'New Device Login',
      message: 'A new device has been used to access your account',
      userId: user._id,
      priority: 'medium',
      data: {
        ipAddress,
        userAgent,
        loginTime: new Date()
      }
    });
  }

  static async sendVerificationEmail(user) {
    // Implementation depends on your email service
    logger.info('Sending verification email', { userId: user._id, email: user.email });
  }

  static async sendPasswordResetEmail(user, resetToken) {
    // Implementation depends on your email service
    logger.info('Sending password reset email', { userId: user._id, email: user.email });
  }

  static async cleanupExpiredSessions() {
    try {
      const result = await UserSession.updateMany(
        {
          status: SESSION_STATUS.ACTIVE,
          expiresAt: { $lt: new Date() }
        },
        {
          $set: {
            status: SESSION_STATUS.EXPIRED,
            expiredAt: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        logger.info('Expired sessions cleaned up', { count: result.modifiedCount });
      }

    } catch (error) {
      logger.error('Error cleaning up expired sessions', { error: error.message });
    }
  }

  static async cleanupExpiredTokens() {
    try {
      // Cleanup expired password reset tokens
      const result = await PasswordReset.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      if (result.deletedCount > 0) {
        logger.info('Expired password reset tokens cleaned up', { count: result.deletedCount });
      }

    } catch (error) {
      logger.error('Error cleaning up expired tokens', { error: error.message });
    }
  }
}

module.exports = AuthService;
