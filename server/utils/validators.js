/**
 * Enterprise Advanced Validation and Security System
 * Comprehensive validation engine with security controls, business rules, and compliance features
 * 
 * Key Features:
 * - Advanced password strength validation with entropy analysis
 * - Multi-factor authentication support validation
 * - Enterprise security policy enforcement
 * - Real-time threat detection and prevention
 * - Compliance validation (SOX, GDPR, ISO, NIST)
 * - Advanced sanitization with XSS/SQLi protection
 * - Performance monitoring and metrics collection
 * - Business rules engine for procurement workflows
 * - Audit logging and security event tracking
 * - Risk assessment and scoring algorithms
 * 
 * @version 2.0.0
 * @author Enterprise Security Team
 * @created 2025-12-24
 */

const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Enterprise Advanced Validation Engine
 * Provides comprehensive validation, security, and compliance capabilities
 */
class EnterpriseValidatorEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableAuditLogging: options.enableAuditLogging ?? true,
      enableMetrics: options.enableMetrics ?? true,
      enableRealTimeMonitoring: options.enableRealTimeMonitoring ?? true,
      securityLevel: options.securityLevel || 'enterprise', // basic, standard, enterprise, maximum
      passwordComplexityLevel: options.passwordComplexityLevel || 'strict', // basic, standard, strict, maximum
      enableThreatDetection: options.enableThreatDetection ?? true,
      enableComplianceValidation: options.enableComplianceValidation ?? true,
      defaultLocale: options.defaultLocale || 'en-US',
      cacheEnabled: options.cacheEnabled ?? true,
      cacheSize: options.cacheSize || 2000,
      ...options
    };
    
    // Performance and security metrics
    this.metrics = {
      validationsPerformed: 0,
      securityViolations: 0,
      threatDetections: 0,
      complianceViolations: 0,
      performanceIssues: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      lastResetTime: Date.now()
    };
    
    // Security threat patterns
    this.threatPatterns = new Map([
      ['sql_injection', /('|(\\-\\-)|(;)|(\\||\\|)|(\\*|\\*))|(exec(\\s|\\+)+(s|x)p\\w+)/i],
      ['xss_script', /<script[^>]*>[\\s\\S]*?<\\/script>/gi],
      ['xss_javascript', /javascript:/gi],
      ['path_traversal', /(\\.\\.\\/|\\.\\.\\\\ )/g],
      ['command_injection', /[;&|`$(){}\\[\\]]/g],
      ['ldap_injection', /[()=*!&|]/g]
    ]);
    
    // Business rules registry
    this.businessRules = new Map();
    
    // Validation cache
    this.cache = new Map();
    
    // Initialize default business rules
    this.initializeDefaultBusinessRules();
    
    // Initialize compliance validators
    this.initializeComplianceValidators();
    
    // Start performance monitoring
    if (this.options.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }
  }
  
  initializeDefaultBusinessRules() {
    // Password security business rules
    this.addBusinessRule('password-enterprise-policy', (value, context) => {
      const violations = [];
      
      if (context.userRole === 'ADMIN' && value.length < 12) {
        violations.push('Admin passwords must be at least 12 characters');
      }
      
      if (context.previousPasswords && context.previousPasswords.includes(value)) {
        violations.push('Password must not match previous 5 passwords');
      }
      
      if (this.isCommonPassword(value)) {
        violations.push('Password cannot be from common password list');
      }
      
      return {
        isValid: violations.length === 0,
        violations,
        riskScore: this.calculatePasswordRisk(value, context)
      };
    });
    
    // User role validation business rules
    this.addBusinessRule('role-hierarchy-validation', (value, context) => {
      const roleHierarchy = {
        'VIEWER': 1,
        'USER': 2,
        'MANAGER': 3,
        'ADMIN': 4,
        'SUPER_ADMIN': 5
      };
      
      const violations = [];
      const currentUserLevel = roleHierarchy[context.currentUserRole] || 0;
      const targetRoleLevel = roleHierarchy[value] || 0;
      
      if (targetRoleLevel >= currentUserLevel && context.currentUserRole !== 'SUPER_ADMIN') {
        violations.push('Cannot assign role equal to or higher than current user role');
      }
      
      return {
        isValid: violations.length === 0,
        violations,
        securityRisk: targetRoleLevel > 3 ? 'high' : targetRoleLevel > 2 ? 'medium' : 'low'
      };
    });
    
    // Email security validation
    this.addBusinessRule('email-security-policy', (value, context) => {
      const violations = [];
      const domain = value.split('@')[1]?.toLowerCase();
      
      // Check against blocked domains
      const blockedDomains = [
        'tempmail.org', 'guerrillamail.com', 'mailinator.com',
        '10minutemail.com', 'yopmail.com'
      ];
      
      if (blockedDomains.includes(domain)) {
        violations.push('Email domain is not allowed');
      }
      
      // Check for suspicious patterns
      if (/[0-9]{5,}/.test(value.split('@')[0])) {
        violations.push('Email contains suspicious numeric patterns');
      }
      
      return {
        isValid: violations.length === 0,
        violations,
        trustScore: this.calculateEmailTrust(value, context)
      };
    });
  }
  
  initializeComplianceValidators() {
    this.complianceValidators = {
      sox: {
        passwordPolicy: (password, context) => {
          const requirements = {
            minLength: password.length >= 8,
            complexity: this.validatePasswordComplexity(password).isValid,
            noUserInfo: !this.containsUserInfo(password, context),
            regularChange: context.lastPasswordChange && 
                          (Date.now() - new Date(context.lastPasswordChange)) < 90 * 24 * 60 * 60 * 1000
          };
          
          return {
            compliant: Object.values(requirements).every(req => req === true),
            requirements,
            violations: Object.entries(requirements)
              .filter(([_, value]) => !value)
              .map(([key, _]) => `SOX requirement failed: ${key}`)
          };
        }
      },
      
      gdpr: {
        dataValidation: (data, context) => {
          const requirements = {
            consentGiven: context.consentGiven === true,
            dataMinimized: this.validateDataMinimization(data, context),
            purposeLimited: context.processingPurpose && context.processingPurpose.length > 0,
            accuracyMaintained: this.validateDataAccuracy(data, context)
          };
          
          return {
            compliant: Object.values(requirements).every(req => req === true),
            requirements,
            violations: Object.entries(requirements)
              .filter(([_, value]) => !value)
              .map(([key, _]) => `GDPR requirement failed: ${key}`)
          };
        }
      },
      
      iso27001: {
        accessControl: (role, context) => {
          const requirements = {
            principleOfLeastPrivilege: this.validateLeastPrivilege(role, context),
            segregationOfDuties: this.validateSegregationOfDuties(role, context),
            regularReview: context.lastAccessReview && 
                          (Date.now() - new Date(context.lastAccessReview)) < 90 * 24 * 60 * 60 * 1000,
            authenticationStrength: this.validateAuthenticationStrength(context)
          };
          
          return {
            compliant: Object.values(requirements).every(req => req === true),
            requirements,
            violations: Object.entries(requirements)
              .filter(([_, value]) => !value)
              .map(([key, _]) => `ISO 27001 requirement failed: ${key}`)
          };
        }
      }
    };
  }
  
  startRealTimeMonitoring() {
    this.monitoringInterval = setInterval(() => {
      const metrics = this.collectSecurityMetrics();
      
      // Emit security alerts for anomalies
      if (metrics.threatDetectionRate > 0.1) {
        this.emit('securityAlert', {
          type: 'HIGH_THREAT_DETECTION_RATE',
          rate: metrics.threatDetectionRate,
          timestamp: new Date()
        });
      }
      
      if (metrics.averageResponseTime > 1000) {
        this.emit('performanceAlert', {
          type: 'HIGH_RESPONSE_TIME',
          responseTime: metrics.averageResponseTime,
          timestamp: new Date()
        });
      }
      
      this.emit('metricsUpdate', metrics);
    }, 30000); // Every 30 seconds
  }
  
  addBusinessRule(name, ruleFn) {
    this.businessRules.set(name, ruleFn);
    this.emit('businessRuleAdded', { name, timestamp: new Date() });
  }
  
  validateWithBusinessRules(value, rules, context) {
    const results = [];
    const violations = [];
    
    for (const ruleName of rules) {
      if (this.businessRules.has(ruleName)) {
        try {
          const result = this.businessRules.get(ruleName)(value, context);
          results.push({ rule: ruleName, ...result });
          
          if (!result.isValid && result.violations) {
            violations.push(...result.violations);
          }
        } catch (error) {
          violations.push(`Business rule '${ruleName}' execution failed: ${error.message}`);
          this.metrics.performanceIssues++;
        }
      }
    }
    
    return {
      success: violations.length === 0,
      results,
      violations,
      overallValid: violations.length === 0
    };
  }
  
  detectThreats(input) {
    const threats = [];
    
    for (const [threatType, pattern] of this.threatPatterns) {
      if (pattern.test(input)) {
        threats.push({
          type: threatType,
          severity: this.getThreatSeverity(threatType),
          pattern: pattern.toString(),
          timestamp: new Date()
        });
        
        this.metrics.threatDetections++;
      }
    }
    
    if (threats.length > 0) {
      this.emit('threatDetected', { input, threats, timestamp: new Date() });
    }
    
    return threats;
  }
  
  advancedSanitization(input, options = {}) {
    if (typeof input !== 'string') return input;
    
    let sanitized = input;
    const { 
      removeScripts = true,
      escapeHtml = true,
      removeSqlPatterns = true,
      normalizeWhitespace = true,
      maxLength = null
    } = options;
    
    // Remove script tags and javascript protocols
    if (removeScripts) {
      sanitized = sanitized.replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '');
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/on\\w+=\"[^\"]*\"/gi, '');
    }
    
    // Escape HTML entities
    if (escapeHtml) {
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
    
    // Remove SQL injection patterns
    if (removeSqlPatterns) {
      sanitized = sanitized.replace(/(union|select|insert|update|delete|drop|create|alter)\\s/gi, '');
      sanitized = sanitized.replace(/[';\\-\\-]/g, '');
    }
    
    // Normalize whitespace
    if (normalizeWhitespace) {
      sanitized = sanitized.replace(/\\s+/g, ' ').trim();
    }
    
    // Apply length limit
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }
  
  calculatePasswordEntropy(password) {
    const charSets = [
      { chars: 'abcdefghijklmnopqrstuvwxyz', size: 26 },
      { chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', size: 26 },
      { chars: '0123456789', size: 10 },
      { chars: '!@#$%^&*()_+-=[]{}|;:,.<>?', size: 25 }
    ];
    
    let charsetSize = 0;
    for (const charset of charSets) {
      if (charset.chars.split('').some(char => password.includes(char))) {
        charsetSize += charset.size;
      }
    }
    
    const entropy = Math.log2(Math.pow(charsetSize, password.length));
    return {
      entropy: Math.round(entropy * 100) / 100,
      strength: entropy < 28 ? 'very_weak' : entropy < 36 ? 'weak' : 
                entropy < 60 ? 'fair' : entropy < 128 ? 'strong' : 'very_strong',
      charsetSize,
      length: password.length
    };
  }
  
  isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    return commonPasswords.some(common => 
      password.toLowerCase().includes(common.toLowerCase())
    );
  }
  
  calculatePasswordRisk(password, context = {}) {
    let riskScore = 0;
    
    // Length factor
    if (password.length < 8) riskScore += 30;
    else if (password.length < 12) riskScore += 15;
    
    // Complexity factor
    const entropy = this.calculatePasswordEntropy(password);
    if (entropy.strength === 'very_weak') riskScore += 25;
    else if (entropy.strength === 'weak') riskScore += 15;
    
    // Common password factor
    if (this.isCommonPassword(password)) riskScore += 20;
    
    // User context factor
    if (context.userName && password.toLowerCase().includes(context.userName.toLowerCase())) {
      riskScore += 15;
    }
    
    // Age factor
    if (context.lastPasswordChange) {
      const daysSinceChange = (Date.now() - new Date(context.lastPasswordChange)) / (1000 * 60 * 60 * 24);
      if (daysSinceChange > 90) riskScore += Math.min(20, Math.floor(daysSinceChange / 30));
    }
    
    return Math.min(100, riskScore);
  }
  
  calculateEmailTrust(email, context = {}) {
    let trustScore = 100;
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Domain reputation
    const trustedDomains = ['gmail.com', 'outlook.com', 'company.com'];
    const suspiciousDomains = ['tempmail.org', 'guerrillamail.com'];
    
    if (trustedDomains.includes(domain)) trustScore += 10;
    if (suspiciousDomains.includes(domain)) trustScore -= 50;
    
    // Email age and activity
    if (context.accountAge) {
      const daysSinceCreated = (Date.now() - new Date(context.accountAge)) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated > 365) trustScore += 20;
      else if (daysSinceCreated < 30) trustScore -= 15;
    }
    
    // Verification status
    if (context.emailVerified === true) trustScore += 25;
    if (context.emailVerified === false) trustScore -= 30;
    
    return Math.max(0, Math.min(100, trustScore));
  }
  
  validateDataMinimization(data, context) {
    const requiredFields = context.requiredFields || [];
    const providedFields = Object.keys(data);
    
    // Check if only necessary data is collected
    const unnecessaryFields = providedFields.filter(field => !requiredFields.includes(field));
    return unnecessaryFields.length === 0;
  }
  
  validateDataAccuracy(data, context) {
    // Implement data accuracy validation logic
    // This would typically involve checking against known good data sources
    return true; // Simplified for example
  }
  
  validateLeastPrivilege(role, context) {
    const rolePermissions = {
      'VIEWER': ['read'],
      'USER': ['read', 'create'],
      'MANAGER': ['read', 'create', 'update'],
      'ADMIN': ['read', 'create', 'update', 'delete']
    };
    
    const requestedPermissions = context.requestedPermissions || [];
    const allowedPermissions = rolePermissions[role] || [];
    
    return requestedPermissions.every(permission => allowedPermissions.includes(permission));
  }
  
  validateSegregationOfDuties(role, context) {
    // Implement segregation of duties validation
    const conflictingRoles = {
      'ADMIN': ['AUDITOR'],
      'FINANCIAL_APPROVER': ['FINANCIAL_REQUESTER']
    };
    
    const userRoles = context.userRoles || [role];
    const conflicts = conflictingRoles[role] || [];
    
    return !conflicts.some(conflictRole => userRoles.includes(conflictRole));
  }
  
  validateAuthenticationStrength(context) {
    const requirements = {
      mfaEnabled: context.mfaEnabled === true,
      strongPassword: context.passwordStrength === 'strong' || context.passwordStrength === 'very_strong',
      recentLogin: context.lastLogin && (Date.now() - new Date(context.lastLogin)) < 30 * 24 * 60 * 60 * 1000
    };
    
    return Object.values(requirements).every(req => req === true);
  }
  
  containsUserInfo(password, context) {
    const userInfo = [
      context.userName,
      context.firstName,
      context.lastName,
      context.email?.split('@')[0]
    ].filter(Boolean);
    
    return userInfo.some(info => 
      password.toLowerCase().includes(info.toLowerCase())
    );
  }
  
  getThreatSeverity(threatType) {
    const severityMap = {
      'sql_injection': 'critical',
      'xss_script': 'high',
      'xss_javascript': 'high',
      'path_traversal': 'high',
      'command_injection': 'critical',
      'ldap_injection': 'medium'
    };
    
    return severityMap[threatType] || 'low';
  }
  
  collectSecurityMetrics() {
    const now = Date.now();
    const timeSinceReset = now - this.metrics.lastResetTime;
    
    return {
      ...this.metrics,
      uptime: timeSinceReset,
      threatDetectionRate: this.metrics.validationsPerformed > 0 ? 
        this.metrics.threatDetections / this.metrics.validationsPerformed : 0,
      securityViolationRate: this.metrics.validationsPerformed > 0 ? 
        this.metrics.securityViolations / this.metrics.validationsPerformed : 0,
      cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ? 
        this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) : 0,
      memoryUsage: process.memoryUsage(),
      cacheSize: this.cache.size
    };
  }
  
  updateMetrics(operation, duration, success) {
    this.metrics.validationsPerformed++;
    
    if (!success) {
      this.metrics.securityViolations++;
    }
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + duration) / 2;
  }
  
  resetMetrics() {
    Object.keys(this.metrics).forEach(key => {
      if (typeof this.metrics[key] === 'number') {
        this.metrics[key] = 0;
      }
    });
    this.metrics.lastResetTime = Date.now();
    this.emit('metricsReset', { timestamp: new Date() });
  }
  
  getHealthStatus() {
    const metrics = this.collectSecurityMetrics();
    const health = {
      status: 'healthy',
      issues: [],
      metrics
    };
    
    if (metrics.threatDetectionRate > 0.1) {
      health.status = 'warning';
      health.issues.push('High threat detection rate');
    }
    
    if (metrics.averageResponseTime > 1000) {
      health.status = 'warning';
      health.issues.push('High average response time');
    }
    
    if (metrics.securityViolationRate > 0.05) {
      health.status = 'critical';
      health.issues.push('High security violation rate');
    }
    
    return health;
  }
}

// Initialize global enterprise validator engine
const enterpriseValidator = new EnterpriseValidatorEngine({
  enableAuditLogging: true,
  enableMetrics: true,
  enableRealTimeMonitoring: true,
  securityLevel: 'enterprise',
  passwordComplexityLevel: 'strict'
});

/**
 * Enterprise Email Validation with Security and Business Rules
 * @param {string} email - Email to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result with security analysis
 */
function validateEmail(email, options = {}) {
  const startTime = Date.now();
  const {
    sanitize = true,
    businessRules = ['email-security-policy'],
    context = {},
    allowInternational = true,
    checkDomainMX = false,
    blockDisposable = true,
    checkReputation = true
  } = options;
  
  try {
    enterpriseValidator.metrics.validationsPerformed++;
    
    // Input validation and sanitization
    if (!email || typeof email !== 'string') {
      enterpriseValidator.updateMetrics('validateEmail', Date.now() - startTime, false);
      return {
        isValid: false,
        error: 'Email must be a non-empty string',
        threats: [],
        trustScore: 0,
        code: 'INVALID_INPUT'
      };
    }
    
    // Threat detection
    const threats = enterpriseValidator.detectThreats(email);
    if (threats.length > 0) {
      return {
        isValid: false,
        error: 'Email contains security threats',
        threats,
        trustScore: 0,
        code: 'SECURITY_THREAT'
      };
    }
    
    // Advanced sanitization
    const sanitizedEmail = sanitize ? 
      enterpriseValidator.advancedSanitization(email.trim(), {
        removeScripts: true,
        escapeHtml: false,
        maxLength: 254
      }) : email.trim();
    
    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      enterpriseValidator.updateMetrics('validateEmail', Date.now() - startTime, false);
      return {
        isValid: false,
        error: 'Invalid email format',
        sanitized: sanitizedEmail,
        threats: threats,
        trustScore: 20,
        code: 'INVALID_FORMAT'
      };
    }
    
    // Domain analysis
    const domain = sanitizedEmail.split('@')[1].toLowerCase();
    const domainAnalysis = {
      domain,
      isDisposable: validateEmail.isDisposableEmail(domain),
      reputation: checkReputation ? validateEmail.checkDomainReputation(domain) : 'unknown'
    };
    
    // Disposable email check
    if (blockDisposable && domainAnalysis.isDisposable) {
      return {
        isValid: false,
        error: 'Disposable email addresses are not allowed',
        sanitized: sanitizedEmail,
        domainAnalysis,
        threats,
        trustScore: 10,
        code: 'DISPOSABLE_EMAIL'
      };
    }
    
    // Business rules validation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = enterpriseValidator.validateWithBusinessRules(
        sanitizedEmail, businessRules, { ...context, domain, domainAnalysis }
      );
    }
    
    // Calculate trust score
    const trustScore = enterpriseValidator.calculateEmailTrust(sanitizedEmail, {
      ...context,
      domain,
      domainAnalysis
    });
    
    const duration = Date.now() - startTime;
    const isValid = businessRuleResults.overallValid;
    
    enterpriseValidator.updateMetrics('validateEmail', duration, isValid);
    
    // Audit logging
    if (enterpriseValidator.options.enableAuditLogging) {
      enterpriseValidator.emit('validationPerformed', {
        type: 'email',
        input: email,
        sanitized: sanitizedEmail,
        result: isValid,
        trustScore,
        threats: threats.length,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid,
      error: isValid ? null : 'Email validation failed',
      sanitized: sanitizedEmail,
      domainAnalysis,
      businessRules: businessRuleResults,
      trustScore,
      threats,
      metadata: {
        validationTime: duration,
        allowInternational,
        blockDisposable,
        checkReputation
      },
      code: isValid ? 'VALID' : 'VALIDATION_FAILED'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseValidator.metrics.performanceIssues++;
    enterpriseValidator.updateMetrics('validateEmail', duration, false);
    
    return {
      isValid: false,
      error: 'Email validation system error',
      code: 'SYSTEM_ERROR',
      details: error.message
    };
  }
}

// Helper method for disposable email detection
validateEmail.isDisposableEmail = function(domain) {
  const disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'temp-mail.org',
    'throwaway.email', 'getnada.com', 'maildrop.cc'
  ];
  return disposableDomains.includes(domain.toLowerCase());
};

// Helper method for domain reputation checking
validateEmail.checkDomainReputation = function(domain) {
  const trustedDomains = [
    'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
    'icloud.com', 'protonmail.com'
  ];
  const suspiciousDomains = [
    'tempmail.org', 'guerrillamail.com', 'mailinator.com'
  ];
  
  if (trustedDomains.includes(domain)) return 'trusted';
  if (suspiciousDomains.includes(domain)) return 'suspicious';
  return 'neutral';
};

/**
 * Enterprise Password Validation with Advanced Security Analysis
 * @param {string} password - Password to validate
 * @param {object} options - Validation options and context
 * @returns {object} Comprehensive validation result with security metrics
 */
function validatePassword(password, options = {}) {
  const startTime = Date.now();
  const {
    sanitize = false, // Passwords should not be sanitized
    businessRules = ['password-enterprise-policy'],
    context = {},
    complexityLevel = enterpriseValidator.options.passwordComplexityLevel,
    checkCommonPasswords = true,
    checkUserInfo = true,
    requireMFA = false
  } = options;
  
  try {
    enterpriseValidator.metrics.validationsPerformed++;
    
    // Input validation
    if (!password || typeof password !== 'string') {
      enterpriseValidator.updateMetrics('validatePassword', Date.now() - startTime, false);
      return {
        isValid: false,
        error: 'Password must be a non-empty string',
        strength: 'invalid',
        riskScore: 100,
        code: 'INVALID_INPUT'
      };
    }
    
    // Threat detection
    const threats = enterpriseValidator.detectThreats(password);
    if (threats.length > 0) {
      return {
        isValid: false,
        error: 'Password contains security threats',
        strength: 'compromised',
        threats,
        riskScore: 100,
        code: 'SECURITY_THREAT'
      };
    }
    
    // Comprehensive complexity validation
    const complexityResult = validatePassword.validatePasswordComplexity(password, complexityLevel);
    
    // Entropy analysis
    const entropyAnalysis = enterpriseValidator.calculatePasswordEntropy(password);
    
    // Common password check
    const isCommon = checkCommonPasswords && enterpriseValidator.isCommonPassword(password);
    
    // User information check
    const containsUserInfo = checkUserInfo && enterpriseValidator.containsUserInfo(password, context);
    
    // Risk assessment
    const riskScore = enterpriseValidator.calculatePasswordRisk(password, context);
    
    // Compliance validation
    const complianceResults = {};
    if (enterpriseValidator.options.enableComplianceValidation) {
      complianceResults.sox = enterpriseValidator.complianceValidators.sox.passwordPolicy(password, context);
      complianceResults.iso27001 = enterpriseValidator.complianceValidators.iso27001.accessControl(context.userRole, context);
    }
    
    // Business rules validation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = enterpriseValidator.validateWithBusinessRules(
        password, businessRules, { ...context, entropyAnalysis, riskScore, isCommon }
      );
    }
    
    // Overall validation result
    const validationIssues = [];
    
    if (!complexityResult.isValid) {
      validationIssues.push(...complexityResult.violations);
    }
    
    if (isCommon) {
      validationIssues.push('Password is too common');
    }
    
    if (containsUserInfo) {
      validationIssues.push('Password contains user information');
    }
    
    if (entropyAnalysis.strength === 'very_weak' || entropyAnalysis.strength === 'weak') {
      validationIssues.push(`Password strength is ${entropyAnalysis.strength}`);
    }
    
    if (requireMFA && !context.mfaEnabled) {
      validationIssues.push('Multi-factor authentication is required');
    }
    
    const isValid = validationIssues.length === 0 && businessRuleResults.overallValid &&
                   Object.values(complianceResults).every(result => result?.compliant !== false);
    
    const duration = Date.now() - startTime;
    enterpriseValidator.updateMetrics('validatePassword', duration, isValid);
    
    // Security event logging
    if (enterpriseValidator.options.enableAuditLogging) {
      enterpriseValidator.emit('passwordValidation', {
        result: isValid,
        strength: entropyAnalysis.strength,
        entropy: entropyAnalysis.entropy,
        riskScore,
        isCommon,
        containsUserInfo,
        threats: threats.length,
        duration,
        timestamp: new Date(),
        context: {
          userId: context.userId,
          userRole: context.userRole,
          ipAddress: context.ipAddress
        }
      });
    }
    
    return {
      isValid,
      error: isValid ? null : validationIssues[0] || 'Password validation failed',
      strength: entropyAnalysis.strength,
      entropy: entropyAnalysis,
      complexity: complexityResult,
      riskScore,
      isCommon,
      containsUserInfo,
      businessRules: businessRuleResults,
      compliance: complianceResults,
      threats,
      recommendations: validatePassword.generatePasswordRecommendations({
        complexity: complexityResult,
        entropy: entropyAnalysis,
        riskScore,
        isCommon,
        containsUserInfo
      }),
      metadata: {
        validationTime: duration,
        complexityLevel,
        checkCommonPasswords,
        checkUserInfo,
        requireMFA
      },
      code: isValid ? 'VALID' : 'VALIDATION_FAILED'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseValidator.metrics.performanceIssues++;
    enterpriseValidator.updateMetrics('validatePassword', duration, false);
    
    return {
      isValid: false,
      error: 'Password validation system error',
      strength: 'unknown',
      riskScore: 100,
      code: 'SYSTEM_ERROR',
      details: error.message
    };
  }
}

// Helper method for password complexity validation
validatePassword.validatePasswordComplexity = function(password, level = 'strict') {
  const requirements = {
    basic: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    },
    standard: {
      minLength: 10,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    strict: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      requireMixedCase: true
    },
    maximum: {
      minLength: 16,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      requireMixedCase: true,
      requireNonSequential: true
    }
  };
  
  const config = requirements[level] || requirements.strict;
  const violations = [];
  
  if (password.length < config.minLength) {
    violations.push(`Password must be at least ${config.minLength} characters`);
  }
  
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    violations.push('Password must contain uppercase letters');
  }
  
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    violations.push('Password must contain lowercase letters');
  }
  
  if (config.requireNumbers && !/\d/.test(password)) {
    violations.push('Password must contain numbers');
  }
  
  if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    violations.push('Password must contain special characters');
  }
  
  if (config.requireMixedCase) {
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
    const lowercaseCount = (password.match(/[a-z]/g) || []).length;
    if (uppercaseCount < 2 || lowercaseCount < 2) {
      violations.push('Password must contain multiple uppercase and lowercase letters');
    }
  }
  
  if (config.requireNonSequential) {
    if (/123|abc|qwe|asd/i.test(password)) {
      violations.push('Password must not contain sequential characters');
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations,
    level,
    requirements: config
  };
};

// Helper method for generating password recommendations
validatePassword.generatePasswordRecommendations = function(analysis) {
  const recommendations = [];
  
  if (analysis.entropy.strength === 'very_weak' || analysis.entropy.strength === 'weak') {
    recommendations.push('Consider using a longer password with more character variety');
  }
  
  if (analysis.isCommon) {
    recommendations.push('Avoid common passwords - use a unique combination');
  }
  
  if (analysis.containsUserInfo) {
    recommendations.push('Do not include personal information in your password');
  }
  
  if (analysis.riskScore > 50) {
    recommendations.push('Consider using a password manager to generate strong passwords');
  }
  
  if (!analysis.complexity.isValid) {
    recommendations.push('Ensure password meets complexity requirements');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Password meets security requirements');
  }
  
  return recommendations;
};

/**
 * Enterprise Phone Number Validation with International Support
 * @param {string} phone - Phone number to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result with formatting and analysis
 */
function validatePhone(phone, options = {}) {
  const startTime = Date.now();
  const {
    sanitize = true,
    businessRules = [],
    context = {},
    allowInternational = true,
    defaultCountry = 'US',
    format = false,
    checkCarrier = false
  } = options;
  
  try {
    enterpriseValidator.metrics.validationsPerformed++;
    
    // Input validation
    if (!phone || typeof phone !== 'string') {
      enterpriseValidator.updateMetrics('validatePhone', Date.now() - startTime, false);
      return {
        isValid: false,
        error: 'Phone number must be a non-empty string',
        code: 'INVALID_INPUT'
      };
    }
    
    // Threat detection
    const threats = enterpriseValidator.detectThreats(phone);
    if (threats.length > 0) {
      return {
        isValid: false,
        error: 'Phone number contains security threats',
        threats,
        code: 'SECURITY_THREAT'
      };
    }
    
    // Advanced sanitization and cleaning
    let cleanPhone = sanitize ? 
      enterpriseValidator.advancedSanitization(phone.trim(), {
        removeScripts: true,
        escapeHtml: false,
        normalizeWhitespace: true,
        maxLength: 20
      }) : phone.trim();
    
    // Remove non-digit characters except + for international
    cleanPhone = cleanPhone.replace(/[^\d+]/g, '');
    
    // Enhanced phone validation with international support
    const phoneAnalysis = validatePhone.analyzePhoneNumber(cleanPhone, defaultCountry);
    
    if (!phoneAnalysis.isValid) {
      enterpriseValidator.updateMetrics('validatePhone', Date.now() - startTime, false);
      return {
        isValid: false,
        error: phoneAnalysis.error || 'Invalid phone number format',
        original: phone,
        cleaned: cleanPhone,
        analysis: phoneAnalysis,
        code: 'INVALID_FORMAT'
      };
    }
    
    // International validation
    if (!allowInternational && phoneAnalysis.isInternational) {
      return {
        isValid: false,
        error: 'International phone numbers are not allowed',
        original: phone,
        cleaned: cleanPhone,
        analysis: phoneAnalysis,
        code: 'INTERNATIONAL_NOT_ALLOWED'
      };
    }
    
    // Business rules validation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = enterpriseValidator.validateWithBusinessRules(
        cleanPhone, businessRules, { ...context, phoneAnalysis }
      );
    }
    
    // Format phone number if requested
    const formattedPhone = format ? validatePhone.formatPhoneNumber(cleanPhone, phoneAnalysis) : cleanPhone;
    
    const duration = Date.now() - startTime;
    const isValid = businessRuleResults.overallValid;
    
    enterpriseValidator.updateMetrics('validatePhone', duration, isValid);
    
    // Audit logging
    if (enterpriseValidator.options.enableAuditLogging) {
      enterpriseValidator.emit('validationPerformed', {
        type: 'phone',
        input: phone,
        cleaned: cleanPhone,
        formatted: formattedPhone,
        result: isValid,
        analysis: phoneAnalysis,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid,
      error: isValid ? null : 'Phone validation failed',
      original: phone,
      cleaned: cleanPhone,
      formatted: formattedPhone,
      analysis: phoneAnalysis,
      businessRules: businessRuleResults,
      threats,
      metadata: {
        validationTime: duration,
        allowInternational,
        defaultCountry,
        format,
        checkCarrier
      },
      code: isValid ? 'VALID' : 'VALIDATION_FAILED'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseValidator.metrics.performanceIssues++;
    enterpriseValidator.updateMetrics('validatePhone', duration, false);
    
    return {
      isValid: false,
      error: 'Phone validation system error',
      code: 'SYSTEM_ERROR',
      details: error.message
    };
  }
}

// Helper method for phone number analysis
validatePhone.analyzePhoneNumber = function(phone, defaultCountry = 'UGA') {
  const analysis = {
    isValid: false,
    isInternational: false,
    country: null,
    countryCode: null,
    nationalNumber: null,
    type: null,
    carrier: null,
    error: null
  };
  
  try {
    // Check if international format
    if (phone.startsWith('+')) {
      analysis.isInternational = true;
      
      // Extract country code
      const countryCode = phone.substring(1, 4);
      analysis.countryCode = countryCode;
      analysis.nationalNumber = phone.substring(countryCode.length + 1);
      
      // Basic country code validation
      const validCountryCodes = {
        '1': 'US',
        '44': 'UK',
        '33': 'FR',
        '49': 'DE',
        '81': 'JP',
        '86': 'CN',
        '91': 'IN'
      };
      
      analysis.country = validCountryCodes[countryCode] || 'UNKNOWN';
    } else {
      // Domestic number
      analysis.country = defaultCountry;
      analysis.nationalNumber = phone;
      
      if (defaultCountry === 'US') {
        analysis.countryCode = '1';
      }
    }
    
    // Validate phone number length and format
    if (analysis.isInternational) {
      // International format validation
      if (phone.length >= 8 && phone.length <= 15 && /^\+\d{7,14}$/.test(phone)) {
        analysis.isValid = true;
      } else {
        analysis.error = 'Invalid international phone format';
      }
    } else {
      // Domestic validation (US format example)
      if (defaultCountry === 'US') {
        if (/^\d{10}$/.test(phone)) {
          analysis.isValid = true;
          analysis.type = 'domestic';
        } else {
          analysis.error = 'US phone numbers must be 10 digits';
        }
      } else {
        // Generic validation for other countries
        if (phone.length >= 7 && phone.length <= 15 && /^\d+$/.test(phone)) {
          analysis.isValid = true;
        } else {
          analysis.error = 'Invalid phone number format';
        }
      }
    }
    
  } catch (error) {
    analysis.error = `Analysis error: ${error.message}`;
  }
  
  return analysis;
};

// Helper method for phone number formatting
validatePhone.formatPhoneNumber = function(phone, analysis) {
  try {
    if (analysis.isInternational) {
      return phone; // Keep international format
    }
    
    // Format domestic numbers
    if (analysis.country === 'US' && phone.length === 10) {
      return `(${phone.substring(0, 3)}) ${phone.substring(3, 6)}-${phone.substring(6)}`;
    }
    
    return phone; // Return as-is if no specific formatting
  } catch (error) {
    return phone;
  }
};

/**
 * Enterprise Role Validation with Hierarchy and Security Controls
 * @param {string} role - Role to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result with role analysis
 */
function validateRole(role, options = {}) {
  const startTime = Date.now();
  const {
    sanitize = true,
    businessRules = ['role-hierarchy-validation'],
    context = {},
    allowCustomRoles = false,
    checkPermissions = true,
    validateHierarchy = true
  } = options;
  
  try {
    enterpriseValidator.metrics.validationsPerformed++;
    
    // Input validation
    if (!role || typeof role !== 'string') {
      enterpriseValidator.updateMetrics('validateRole', Date.now() - startTime, false);
      return {
        isValid: false,
        error: 'Role must be a non-empty string',
        code: 'INVALID_INPUT'
      };
    }
    
    // Threat detection
    const threats = enterpriseValidator.detectThreats(role);
    if (threats.length > 0) {
      return {
        isValid: false,
        error: 'Role contains security threats',
        threats,
        code: 'SECURITY_THREAT'
      };
    }
    
    // Advanced sanitization
    const sanitizedRole = sanitize ? 
      enterpriseValidator.advancedSanitization(role.trim().toUpperCase(), {
        removeScripts: true,
        escapeHtml: false,
        normalizeWhitespace: true,
        maxLength: 50
      }) : role.trim().toUpperCase();
    
    // Role analysis
    const roleAnalysis = validateRole.analyzeRole(sanitizedRole, allowCustomRoles);
    
    if (!roleAnalysis.isValid) {
      enterpriseValidator.updateMetrics('validateRole', Date.now() - startTime, false);
      return {
        isValid: false,
        error: roleAnalysis.error || 'Invalid role',
        original: role,
        sanitized: sanitizedRole,
        analysis: roleAnalysis,
        code: 'INVALID_ROLE'
      };
    }
    
    // Business rules validation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0 && validateHierarchy) {
      businessRuleResults = enterpriseValidator.validateWithBusinessRules(
        sanitizedRole, businessRules, { ...context, roleAnalysis }
      );
    }
    
    // Permission validation
    const permissionAnalysis = checkPermissions ? 
      validateRole.analyzePermissions(sanitizedRole, context) : null;
    
    const duration = Date.now() - startTime;
    const isValid = roleAnalysis.isValid && businessRuleResults.overallValid;
    
    enterpriseValidator.updateMetrics('validateRole', duration, isValid);
    
    // Audit logging
    if (enterpriseValidator.options.enableAuditLogging) {
      enterpriseValidator.emit('roleValidation', {
        input: role,
        sanitized: sanitizedRole,
        result: isValid,
        analysis: roleAnalysis,
        permissions: permissionAnalysis,
        duration,
        timestamp: new Date(),
        context: {
          userId: context.userId,
          currentUserRole: context.currentUserRole
        }
      });
    }
    
    return {
      isValid,
      error: isValid ? null : 'Role validation failed',
      original: role,
      sanitized: sanitizedRole,
      analysis: roleAnalysis,
      permissions: permissionAnalysis,
      businessRules: businessRuleResults,
      threats,
      metadata: {
        validationTime: duration,
        allowCustomRoles,
        checkPermissions,
        validateHierarchy
      },
      code: isValid ? 'VALID' : 'VALIDATION_FAILED'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseValidator.metrics.performanceIssues++;
    enterpriseValidator.updateMetrics('validateRole', duration, false);
    
    return {
      isValid: false,
      error: 'Role validation system error',
      code: 'SYSTEM_ERROR',
      details: error.message
    };
  }
}

// Helper method for role analysis
validateRole.analyzeRole = function(role, allowCustomRoles = false) {
  const standardRoles = {
    'VIEWER': {
      level: 1,
      permissions: ['read'],
      description: 'Read-only access to procurement data',
      securityRisk: 'low'
    },
    'USER': {
      level: 2,
      permissions: ['read', 'create'],
      description: 'Can view and create procurement records',
      securityRisk: 'low'
    },
    'MANAGER': {
      level: 3,
      permissions: ['read', 'create', 'update'],
      description: 'Can manage procurement processes',
      securityRisk: 'medium'
    },
    'ADMIN': {
      level: 4,
      permissions: ['read', 'create', 'update', 'delete', 'manage_users'],
      description: 'Full administrative access',
      securityRisk: 'high'
    },
    'SUPER_ADMIN': {
      level: 5,
      permissions: ['all'],
      description: 'Super administrative access with system control',
      securityRisk: 'critical'
    },
    'AUDITOR': {
      level: 3,
      permissions: ['read', 'audit'],
      description: 'Audit-specific permissions with read access',
      securityRisk: 'medium'
    }
  };
  
  const analysis = {
    isValid: false,
    isStandard: false,
    isCustom: false,
    level: 0,
    permissions: [],
    description: '',
    securityRisk: 'unknown',
    error: null
  };
  
  if (standardRoles[role]) {
    analysis.isValid = true;
    analysis.isStandard = true;
    analysis.level = standardRoles[role].level;
    analysis.permissions = standardRoles[role].permissions;
    analysis.description = standardRoles[role].description;
    analysis.securityRisk = standardRoles[role].securityRisk;
  } else if (allowCustomRoles && role.length >= 3 && role.length <= 50) {
    // Custom role validation
    if (/^[A-Z][A-Z0-9_]*$/.test(role)) {
      analysis.isValid = true;
      analysis.isCustom = true;
      analysis.level = 2; // Default level for custom roles
      analysis.permissions = ['read', 'create']; // Default permissions
      analysis.description = 'Custom role';
      analysis.securityRisk = 'medium';
    } else {
      analysis.error = 'Custom role must start with letter and contain only uppercase letters, numbers, and underscores';
    }
  } else {
    analysis.error = allowCustomRoles ? 'Invalid role format' : 'Role not in allowed list';
  }
  
  return analysis;
};

// Helper method for permission analysis
validateRole.analyzePermissions = function(role, context = {}) {
  const roleAnalysis = this.analyzeRole(role, true);
  
  return {
    granted: roleAnalysis.permissions,
    effective: roleAnalysis.permissions, // Could be modified by context
    conflicts: this.checkPermissionConflicts(roleAnalysis.permissions, context),
    segregationIssues: this.checkSegregationOfDuties(role, context)
  };
};

// Helper method for permission conflict checking
validateRole.checkPermissionConflicts = function(permissions, context) {
  const conflicts = [];
  const userRoles = context.userRoles || [];
  
  // Example conflict: User cannot have both FINANCIAL_APPROVER and FINANCIAL_REQUESTER
  if (userRoles.includes('FINANCIAL_APPROVER') && userRoles.includes('FINANCIAL_REQUESTER')) {
    conflicts.push('Financial approver cannot also be requester');
  }
  
  return conflicts;
};

// Helper method for segregation of duties checking
validateRole.checkSegregationOfDuties = function(role, context) {
  const issues = [];
  const userRoles = context.userRoles || [];
  
  const segregationRules = {
    'ADMIN': ['AUDITOR'],
    'FINANCIAL_APPROVER': ['FINANCIAL_REQUESTER'],
    'PROCUREMENT_OFFICER': ['VENDOR_MANAGER']
  };
  
  const conflicts = segregationRules[role] || [];
  for (const conflictRole of conflicts) {
    if (userRoles.includes(conflictRole)) {
      issues.push(`Segregation of duties violation: ${role} conflicts with ${conflictRole}`);
    }
  }
  
  return issues;
};

/**
 * Enterprise Status Validation with Workflow Integration
 * @param {string} status - Status to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result with status analysis
 */
function validateStatus(status, options = {}) {
  const startTime = Date.now();
  const {
    sanitize = true,
    businessRules = [],
    context = {},
    allowTransition = true,
    checkWorkflow = true,
    validateStateRules = true
  } = options;
  
  try {
    enterpriseValidator.metrics.validationsPerformed++;
    
    // Input validation
    if (!status || typeof status !== 'string') {
      enterpriseValidator.updateMetrics('validateStatus', Date.now() - startTime, false);
      return {
        isValid: false,
        error: 'Status must be a non-empty string',
        code: 'INVALID_INPUT'
      };
    }
    
    // Threat detection
    const threats = enterpriseValidator.detectThreats(status);
    if (threats.length > 0) {
      return {
        isValid: false,
        error: 'Status contains security threats',
        threats,
        code: 'SECURITY_THREAT'
      };
    }
    
    // Advanced sanitization
    const sanitizedStatus = sanitize ? 
      enterpriseValidator.advancedSanitization(status.trim().toLowerCase(), {
        removeScripts: true,
        escapeHtml: false,
        normalizeWhitespace: true,
        maxLength: 30
      }) : status.trim().toLowerCase();
    
    // Status analysis
    const statusAnalysis = validateStatus.analyzeStatus(sanitizedStatus, context.entityType);
    
    if (!statusAnalysis.isValid) {
      enterpriseValidator.updateMetrics('validateStatus', Date.now() - startTime, false);
      return {
        isValid: false,
        error: statusAnalysis.error || 'Invalid status',
        original: status,
        sanitized: sanitizedStatus,
        analysis: statusAnalysis,
        code: 'INVALID_STATUS'
      };
    }
    
    // Workflow validation
    let workflowValidation = { isValid: true, violations: [] };
    if (checkWorkflow && context.currentStatus) {
      workflowValidation = validateStatus.validateStatusTransition(
        context.currentStatus, sanitizedStatus, context
      );
    }
    
    // Business rules validation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = enterpriseValidator.validateWithBusinessRules(
        sanitizedStatus, businessRules, { ...context, statusAnalysis, workflowValidation }
      );
    }
    
    const duration = Date.now() - startTime;
    const isValid = statusAnalysis.isValid && workflowValidation.isValid && 
                   businessRuleResults.overallValid;
    
    enterpriseValidator.updateMetrics('validateStatus', duration, isValid);
    
    // Audit logging
    if (enterpriseValidator.options.enableAuditLogging) {
      enterpriseValidator.emit('statusValidation', {
        input: status,
        sanitized: sanitizedStatus,
        result: isValid,
        analysis: statusAnalysis,
        workflow: workflowValidation,
        transition: context.currentStatus ? `${context.currentStatus} -> ${sanitizedStatus}` : null,
        duration,
        timestamp: new Date(),
        context: {
          entityId: context.entityId,
          entityType: context.entityType,
          userId: context.userId
        }
      });
    }
    
    return {
      isValid,
      error: isValid ? null : 'Status validation failed',
      original: status,
      sanitized: sanitizedStatus,
      analysis: statusAnalysis,
      workflow: workflowValidation,
      businessRules: businessRuleResults,
      threats,
      metadata: {
        validationTime: duration,
        allowTransition,
        checkWorkflow,
        validateStateRules
      },
      code: isValid ? 'VALID' : 'VALIDATION_FAILED'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseValidator.metrics.performanceIssues++;
    enterpriseValidator.updateMetrics('validateStatus', duration, false);
    
    return {
      isValid: false,
      error: 'Status validation system error',
      code: 'SYSTEM_ERROR',
      details: error.message
    };
  }
}

// Helper method for status analysis
validateStatus.analyzeStatus = function(status, entityType = 'general') {
  const statusConfigurations = {
    general: {
      'active': { description: 'Entity is active', allowedTransitions: ['inactive', 'suspended'] },
      'inactive': { description: 'Entity is inactive', allowedTransitions: ['active'] },
      'pending': { description: 'Entity is pending approval', allowedTransitions: ['active', 'rejected'] },
      'suspended': { description: 'Entity is suspended', allowedTransitions: ['active', 'inactive'] },
      'rejected': { description: 'Entity was rejected', allowedTransitions: ['pending'] },
      'archived': { description: 'Entity is archived', allowedTransitions: [] }
    },
    user: {
      'active': { description: 'User account is active', allowedTransitions: ['inactive', 'suspended'] },
      'inactive': { description: 'User account is inactive', allowedTransitions: ['active'] },
      'pending': { description: 'User account pending verification', allowedTransitions: ['active', 'rejected'] },
      'suspended': { description: 'User account is suspended', allowedTransitions: ['active', 'inactive'] },
      'locked': { description: 'User account is locked', allowedTransitions: ['active'] },
      'expired': { description: 'User account has expired', allowedTransitions: ['active'] }
    },
    procurement: {
      'draft': { description: 'Procurement in draft state', allowedTransitions: ['submitted'] },
      'submitted': { description: 'Procurement submitted for review', allowedTransitions: ['approved', 'rejected', 'draft'] },
      'approved': { description: 'Procurement approved', allowedTransitions: ['active', 'cancelled'] },
      'rejected': { description: 'Procurement rejected', allowedTransitions: ['draft'] },
      'active': { description: 'Procurement is active', allowedTransitions: ['completed', 'cancelled'] },
      'completed': { description: 'Procurement completed', allowedTransitions: [] },
      'cancelled': { description: 'Procurement cancelled', allowedTransitions: [] }
    },
    contract: {
      'draft': { description: 'Contract in draft', allowedTransitions: ['negotiation'] },
      'negotiation': { description: 'Contract under negotiation', allowedTransitions: ['approved', 'draft'] },
      'approved': { description: 'Contract approved', allowedTransitions: ['active'] },
      'active': { description: 'Contract is active', allowedTransitions: ['expired', 'terminated'] },
      'expired': { description: 'Contract expired', allowedTransitions: ['renewal'] },
      'terminated': { description: 'Contract terminated', allowedTransitions: [] },
      'renewal': { description: 'Contract under renewal', allowedTransitions: ['active', 'expired'] }
    }
  };
  
  const config = statusConfigurations[entityType] || statusConfigurations.general;
  const statusInfo = config[status];
  
  const analysis = {
    isValid: !!statusInfo,
    entityType,
    description: statusInfo?.description || 'Unknown status',
    allowedTransitions: statusInfo?.allowedTransitions || [],
    isTerminal: statusInfo?.allowedTransitions?.length === 0,
    error: statusInfo ? null : `Status '${status}' not valid for entity type '${entityType}'`
  };
  
  return analysis;
};

// Helper method for status transition validation
validateStatus.validateStatusTransition = function(currentStatus, newStatus, context = {}) {
  const statusAnalysis = this.analyzeStatus(currentStatus, context.entityType);
  const violations = [];
  
  // Check if transition is allowed
  if (!statusAnalysis.allowedTransitions.includes(newStatus)) {
    violations.push(`Transition from '${currentStatus}' to '${newStatus}' is not allowed`);
  }
  
  // Check user permissions for transition
  if (context.userRole) {
    const transitionPermissions = this.getTransitionPermissions(currentStatus, newStatus, context.entityType);
    if (!this.userCanPerformTransition(context.userRole, transitionPermissions)) {
      violations.push(`User role '${context.userRole}' cannot perform transition from '${currentStatus}' to '${newStatus}'`);
    }
  }
  
  // Check business rules for specific transitions
  const businessRuleViolations = this.checkTransitionBusinessRules(currentStatus, newStatus, context);
  violations.push(...businessRuleViolations);
  
  return {
    isValid: violations.length === 0,
    violations,
    requiredPermissions: this.getTransitionPermissions(currentStatus, newStatus, context.entityType)
  };
};

// Helper method for transition permissions
validateStatus.getTransitionPermissions = function(fromStatus, toStatus, entityType) {
  const transitionRules = {
    general: {
      'pending->approved': ['approve'],
      'pending->rejected': ['approve'],
      'active->suspended': ['manage'],
      'suspended->active': ['manage'],
      '*->archived': ['admin']
    },
    procurement: {
      'draft->submitted': ['create'],
      'submitted->approved': ['approve'],
      'submitted->rejected': ['approve'],
      'approved->active': ['activate'],
      'active->completed': ['complete'],
      'active->cancelled': ['cancel']
    }
  };
  
  const rules = transitionRules[entityType] || transitionRules.general;
  const transitionKey = `${fromStatus}->${toStatus}`;
  const wildcardKey = `*->${toStatus}`;
  
  return rules[transitionKey] || rules[wildcardKey] || ['update'];
};

// Helper method for user transition permissions
validateStatus.userCanPerformTransition = function(userRole, requiredPermissions) {
  const rolePermissions = {
    'VIEWER': ['read'],
    'USER': ['read', 'create', 'update'],
    'MANAGER': ['read', 'create', 'update', 'approve', 'manage'],
    'ADMIN': ['read', 'create', 'update', 'approve', 'manage', 'admin', 'activate', 'complete', 'cancel']
  };
  
  const userPermissions = rolePermissions[userRole] || [];
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

// Helper method for business rule checking
validateStatus.checkTransitionBusinessRules = function(fromStatus, toStatus, context) {
  const violations = [];
  
  // Example business rule: Cannot transition to completed without approval
  if (toStatus === 'completed' && fromStatus !== 'approved' && fromStatus !== 'active') {
    violations.push('Cannot complete without approval');
  }
  
  // Example business rule: Cannot reactivate after terminal status
  if (fromStatus === 'completed' || fromStatus === 'cancelled' || fromStatus === 'terminated') {
    if (toStatus !== fromStatus) {
      violations.push(`Cannot transition from terminal status '${fromStatus}'`);
    }
  }
  
  // Example business rule: Check required fields for specific transitions
  if (toStatus === 'approved' && !context.approvalComments) {
    violations.push('Approval comments are required for approval transition');
  }
  
  return violations;
};

/**
 * Enterprise String Sanitization with Advanced Security Features
 * @param {string} input - String to sanitize
 * @param {object} options - Sanitization options
 * @returns {object} Enhanced sanitization result with threat analysis
 */
function sanitizeString(input, options = {}) {
  const startTime = Date.now();
  const {
    level = 'standard', // basic, standard, strict, maximum
    preserveFormatting = false,
    maxLength = null,
    allowHtml = false,
    detectThreats = true,
    logThreats = true,
    context = {}
  } = options;
  
  try {
    enterpriseValidator.metrics.validationsPerformed++;
    
    // Input validation
    if (input === null || input === undefined) {
      return {
        sanitized: '',
        original: input,
        threats: [],
        modifications: ['null_input_converted'],
        isClean: true,
        code: 'NULL_INPUT'
      };
    }
    
    if (typeof input !== 'string') {
      const stringInput = String(input);
      return {
        sanitized: stringInput,
        original: input,
        threats: [],
        modifications: ['converted_to_string'],
        isClean: true,
        code: 'TYPE_CONVERTED'
      };
    }
    
    // Threat detection before sanitization
    const threats = detectThreats ? enterpriseValidator.detectThreats(input) : [];
    const modifications = [];
    
    // Advanced sanitization based on level
    let sanitized = input;
    
    // Basic level sanitization
    if (level === 'basic' || level === 'standard' || level === 'strict' || level === 'maximum') {
      // Trim whitespace
      const originalLength = sanitized.length;
      sanitized = sanitized.trim();
      if (sanitized.length !== originalLength) {
        modifications.push('whitespace_trimmed');
      }
      
      // Remove null bytes and control characters
      const controlCharRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
      if (controlCharRegex.test(sanitized)) {
        sanitized = sanitized.replace(controlCharRegex, '');
        modifications.push('control_characters_removed');
      }
    }
    
    // Standard level and above
    if (level === 'standard' || level === 'strict' || level === 'maximum') {
      // Remove or escape HTML if not allowed
      if (!allowHtml) {
        const htmlRegex = /<[^>]*>/g;
        if (htmlRegex.test(sanitized)) {
          sanitized = sanitized.replace(htmlRegex, '');
          modifications.push('html_tags_removed');
        }
        
        // Escape HTML entities
        const originalSanitized = sanitized;
        sanitized = sanitized
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
        
        if (sanitized !== originalSanitized) {
          modifications.push('html_entities_escaped');
        }
      }
      
      // Remove script injections
      const scriptPatterns = [
        /<script[^>]*>[\\s\\S]*?<\\/script>/gi,
        /javascript:/gi,
        /on\\w+\\s*=/gi,
        /data:text\\/html/gi
      ];
      
      for (const pattern of scriptPatterns) {
        if (pattern.test(sanitized)) {
          sanitized = sanitized.replace(pattern, '');
          modifications.push('script_injection_removed');
        }
      }
    }
    
    // Strict level and above
    if (level === 'strict' || level === 'maximum') {
      // Remove SQL injection patterns
      const sqlPatterns = [
        /(union|select|insert|update|delete|drop|create|alter|exec|execute)\\s+/gi,
        /[';\\-\\-]/g,
        /\\/\\*[\\s\\S]*?\\*\\//g
      ];
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(sanitized)) {
          sanitized = sanitized.replace(pattern, '');
          modifications.push('sql_injection_patterns_removed');
        }
      }
      
      // Remove path traversal patterns
      if (/(\\.\\.\\/|\\.\\.\\\\ )/g.test(sanitized)) {
        sanitized = sanitized.replace(/(\\.\\.\\/|\\.\\.\\\\ )/g, '');
        modifications.push('path_traversal_removed');
      }
      
      // Remove command injection patterns
      if (/[;&|`$(){}\\[\\]]/g.test(sanitized)) {
        sanitized = sanitized.replace(/[;&|`$(){}\\[\\]]/g, '');
        modifications.push('command_injection_removed');
      }
    }
    
    // Maximum level
    if (level === 'maximum') {
      // Remove all special characters except basic punctuation
      const allowedCharsRegex = preserveFormatting ? 
        /[^a-zA-Z0-9\\s.,!?\\-_@#%\\n\\r\\t]/ : 
        /[^a-zA-Z0-9\\s.,!?\\-_@#%]/;
      
      if (allowedCharsRegex.test(sanitized)) {
        sanitized = sanitized.replace(new RegExp(allowedCharsRegex.source, 'g'), '');
        modifications.push('special_characters_removed');
      }
      
      // Normalize Unicode
      if (sanitized !== sanitized.normalize('NFKC')) {
        sanitized = sanitized.normalize('NFKC');
        modifications.push('unicode_normalized');
      }
    }
    
    // Apply length limit
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      modifications.push(`truncated_to_${maxLength}_chars`);
    }
    
    // Final cleanup
    if (!preserveFormatting) {
      // Normalize whitespace
      const normalizedWhitespace = sanitized.replace(/\\s+/g, ' ').trim();
      if (normalizedWhitespace !== sanitized) {
        sanitized = normalizedWhitespace;
        modifications.push('whitespace_normalized');
      }
    }
    
    const isClean = modifications.length === 0 && threats.length === 0;
    const duration = Date.now() - startTime;
    
    enterpriseValidator.updateMetrics('sanitizeString', duration, true);
    
    // Threat logging
    if (logThreats && threats.length > 0 && enterpriseValidator.options.enableAuditLogging) {
      enterpriseValidator.emit('threatDetectedDuringSanitization', {
        original: input,
        sanitized,
        threats,
        modifications,
        level,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      sanitized,
      original: input,
      threats,
      modifications,
      isClean,
      statistics: {
        originalLength: input.length,
        sanitizedLength: sanitized.length,
        threatsDetected: threats.length,
        modificationsApplied: modifications.length,
        reductionPercentage: Math.round(((input.length - sanitized.length) / input.length) * 100) || 0
      },
      metadata: {
        sanitizationTime: duration,
        level,
        preserveFormatting,
        maxLength,
        allowHtml
      },
      code: 'SANITIZED'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseValidator.metrics.performanceIssues++;
    enterpriseValidator.updateMetrics('sanitizeString', duration, false);
    
    return {
      sanitized: '',
      original: input,
      threats: [],
      modifications: [],
      isClean: false,
      error: 'Sanitization system error',
      code: 'SYSTEM_ERROR',
      details: error.message
    };
  }
}

// Helper method for custom sanitization rules
sanitizeString.addCustomRule = function(name, pattern, replacement = '') {
  if (!sanitizeString.customRules) {
    sanitizeString.customRules = new Map();
  }
  
  sanitizeString.customRules.set(name, {
    pattern: pattern instanceof RegExp ? pattern : new RegExp(pattern, 'gi'),
    replacement,
    added: new Date()
  });
};

// Helper method for batch sanitization
sanitizeString.sanitizeBatch = function(inputs, options = {}) {
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < inputs.length; i++) {
    const result = sanitizeString(inputs[i], {
      ...options,
      context: { ...options.context, batchIndex: i, batchSize: inputs.length }
    });
    results.push(result);
  }
  
  return {
    results,
    summary: {
      totalProcessed: inputs.length,
      totalThreats: results.reduce((sum, r) => sum + r.threats.length, 0),
      totalModifications: results.reduce((sum, r) => sum + r.modifications.length, 0),
      processingTime: Date.now() - startTime,
      averageTimePerItem: (Date.now() - startTime) / inputs.length
    }
  };
};

/**
 * Enterprise Name Validation with Cultural and Security Support
 * @param {string} name - Name to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result with name analysis
 */
function validateName(name, options = {}) {
  const startTime = Date.now();
  const {
    sanitize = true,
    businessRules = [],
    context = {},
    type = 'person', // person, organization, product, general
    allowInternational = true,
    minLength = 1,
    maxLength = 100,
    checkProfanity = true,
    validateFormat = true
  } = options;
  
  try {
    enterpriseValidator.metrics.validationsPerformed++;
    
    // Input validation
    if (!name || typeof name !== 'string') {
      enterpriseValidator.updateMetrics('validateName', Date.now() - startTime, false);
      return {
        isValid: false,
        error: 'Name must be a non-empty string',
        code: 'INVALID_INPUT'
      };
    }
    
    // Threat detection
    const threats = enterpriseValidator.detectThreats(name);
    if (threats.length > 0) {
      return {
        isValid: false,
        error: 'Name contains security threats',
        threats,
        code: 'SECURITY_THREAT'
      };
    }
    
    // Advanced sanitization
    const sanitizedName = sanitize ? 
      enterpriseValidator.advancedSanitization(name.trim(), {
        removeScripts: true,
        escapeHtml: false,
        normalizeWhitespace: true,
        maxLength: maxLength + 10 // Allow some buffer for sanitization
      }).substring(0, maxLength) : name.trim();
    
    // Name analysis
    const nameAnalysis = validateName.analyzeName(sanitizedName, type, allowInternational);
    
    // Length validation
    if (sanitizedName.length < minLength || sanitizedName.length > maxLength) {
      enterpriseValidator.updateMetrics('validateName', Date.now() - startTime, false);
      return {
        isValid: false,
        error: `Name must be between ${minLength} and ${maxLength} characters`,
        original: name,
        sanitized: sanitizedName,
        analysis: nameAnalysis,
        code: 'INVALID_LENGTH'
      };
    }
    
    // Format validation
    if (validateFormat && !nameAnalysis.formatValid) {
      enterpriseValidator.updateMetrics('validateName', Date.now() - startTime, false);
      return {
        isValid: false,
        error: nameAnalysis.formatError || 'Invalid name format',
        original: name,
        sanitized: sanitizedName,
        analysis: nameAnalysis,
        code: 'INVALID_FORMAT'
      };
    }
    
    // Profanity check
    const profanityCheck = checkProfanity ? validateName.checkProfanity(sanitizedName) : { hasProfanity: false };
    
    if (profanityCheck.hasProfanity) {
      return {
        isValid: false,
        error: 'Name contains inappropriate language',
        original: name,
        sanitized: sanitizedName,
        profanityCheck,
        code: 'PROFANITY_DETECTED'
      };
    }
    
    // Business rules validation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = enterpriseValidator.validateWithBusinessRules(
        sanitizedName, businessRules, { ...context, nameAnalysis, type }
      );
    }
    
    const duration = Date.now() - startTime;
    const isValid = nameAnalysis.formatValid && businessRuleResults.overallValid && !profanityCheck.hasProfanity;
    
    enterpriseValidator.updateMetrics('validateName', duration, isValid);
    
    // Audit logging
    if (enterpriseValidator.options.enableAuditLogging) {
      enterpriseValidator.emit('nameValidation', {
        input: name,
        sanitized: sanitizedName,
        result: isValid,
        type,
        analysis: nameAnalysis,
        profanityCheck,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid,
      error: isValid ? null : 'Name validation failed',
      original: name,
      sanitized: sanitizedName,
      analysis: nameAnalysis,
      profanityCheck,
      businessRules: businessRuleResults,
      threats,
      suggestions: isValid ? [] : validateName.generateNameSuggestions(sanitizedName, type),
      metadata: {
        validationTime: duration,
        type,
        allowInternational,
        minLength,
        maxLength,
        checkProfanity
      },
      code: isValid ? 'VALID' : 'VALIDATION_FAILED'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseValidator.metrics.performanceIssues++;
    enterpriseValidator.updateMetrics('validateName', duration, false);
    
    return {
      isValid: false,
      error: 'Name validation system error',
      code: 'SYSTEM_ERROR',
      details: error.message
    };
  }
}

// Helper method for name analysis
validateName.analyzeName = function(name, type = 'person', allowInternational = true) {
  const analysis = {
    formatValid: false,
    type,
    characteristics: {},
    formatError: null
  };
  
  try {
    // Type-specific validation
    switch (type) {
      case 'person':
        analysis.characteristics = this.analyzePersonName(name, allowInternational);
        analysis.formatValid = this.validatePersonNameFormat(name, allowInternational);
        break;
        
      case 'organization':
        analysis.characteristics = this.analyzeOrganizationName(name);
        analysis.formatValid = this.validateOrganizationNameFormat(name);
        break;
        
      case 'product':
        analysis.characteristics = this.analyzeProductName(name);
        analysis.formatValid = this.validateProductNameFormat(name);
        break;
        
      default:
        analysis.characteristics = this.analyzeGeneralName(name);
        analysis.formatValid = this.validateGeneralNameFormat(name, allowInternational);
    }
    
    if (!analysis.formatValid) {
      analysis.formatError = `Invalid ${type} name format`;
    }
    
  } catch (error) {
    analysis.formatError = `Analysis error: ${error.message}`;
  }
  
  return analysis;
};

// Helper method for person name analysis
validateName.analyzePersonName = function(name, allowInternational) {
  return {
    hasMultipleParts: name.includes(' '),
    partsCount: name.split(/\\s+/).length,
    hasHyphens: name.includes('-'),
    hasApostrophes: name.includes("'"),
    hasInternationalChars: /[^a-zA-Z\\s\\-']/.test(name),
    estimatedCulture: this.detectNameCulture(name),
    commonality: this.assessNameCommonality(name)
  };
};

// Helper method for organization name analysis
validateName.analyzeOrganizationName = function(name) {
  return {
    hasLegalSuffix: /\\b(Inc|LLC|Corp|Ltd|Co|Company|Corporation|Limited)\\b/i.test(name),
    hasNumbers: /\\d/.test(name),
    hasSpecialChars: /[^a-zA-Z0-9\\s\\-'.,&]/.test(name),
    estimatedType: this.detectOrganizationType(name)
  };
};

// Helper method for product name analysis
validateName.analyzeProductName = function(name) {
  return {
    hasVersion: /v\\d+|version\\s*\\d+|\\d+\\.\\d+/i.test(name),
    hasNumbers: /\\d/.test(name),
    hasBrandIndicators: /\\b(Pro|Plus|Premium|Enterprise|Basic|Standard)\\b/i.test(name),
    estimatedCategory: this.detectProductCategory(name)
  };
};

// Helper method for general name analysis
validateName.analyzeGeneralName = function(name) {
  return {
    hasSpaces: name.includes(' '),
    hasNumbers: /\\d/.test(name),
    hasSpecialChars: /[^a-zA-Z0-9\\s]/.test(name),
    complexity: this.calculateNameComplexity(name)
  };
};

// Validation format methods
validateName.validatePersonNameFormat = function(name, allowInternational) {
  const regex = allowInternational ? 
    /^[\\p{L}\\s\\-'.]+$/u : 
    /^[a-zA-Z\\s\\-'.]+$/;
  
  return regex.test(name) && name.length >= 1 && name.length <= 100;
};

validateName.validateOrganizationNameFormat = function(name) {
  return /^[a-zA-Z0-9\\s\\-'.,&()]+$/.test(name) && name.length >= 2 && name.length <= 200;
};

validateName.validateProductNameFormat = function(name) {
  return /^[a-zA-Z0-9\\s\\-_.()]+$/.test(name) && name.length >= 1 && name.length <= 100;
};

validateName.validateGeneralNameFormat = function(name, allowInternational) {
  const regex = allowInternational ?
    /^[\\p{L}\\p{N}\\s\\-_.'()&]+$/u :
    /^[a-zA-Z0-9\\s\\-_.'()&]+$/;
  
  return regex.test(name) && name.length >= 1 && name.length <= 100;
};

// Helper methods for cultural analysis
validateName.detectNameCulture = function(name) {
  // Simplified culture detection
  const patterns = {
    'western': /^[a-zA-Z\\s\\-']+$/,
    'east_asian': /[\\u4e00-\\u9fff\\u3040-\\u309f\\u30a0-\\u30ff]/,
    'arabic': /[\\u0600-\\u06ff]/,
    'cyrillic': /[\\u0400-\\u04ff]/
  };
  
  for (const [culture, pattern] of Object.entries(patterns)) {
    if (pattern.test(name)) return culture;
  }
  
  return 'unknown';
};

validateName.detectOrganizationType = function(name) {
  const types = {
    'corporation': /\\b(Inc|Corp|Corporation)\\b/i,
    'llc': /\\bLLC\\b/i,
    'nonprofit': /\\b(Foundation|Institute|Association|Society)\\b/i,
    'government': /\\b(Department|Agency|Bureau|Office)\\b/i
  };
  
  for (const [type, pattern] of Object.entries(types)) {
    if (pattern.test(name)) return type;
  }
  
  return 'unknown';
};

validateName.detectProductCategory = function(name) {
  const categories = {
    'software': /\\b(App|Software|System|Platform|Tool)\\b/i,
    'hardware': /\\b(Device|Machine|Equipment|Hardware)\\b/i,
    'service': /\\b(Service|Solution|Suite|Package)\\b/i
  };
  
  for (const [category, pattern] of Object.entries(categories)) {
    if (pattern.test(name)) return category;
  }
  
  return 'unknown';
};

validateName.calculateNameComplexity = function(name) {
  let score = 0;
  score += name.length * 0.1;
  score += (name.match(/[A-Z]/g) || []).length * 0.5;
  score += (name.match(/[0-9]/g) || []).length * 0.3;
  score += (name.match(/[^a-zA-Z0-9\\s]/g) || []).length * 0.8;
  
  return Math.round(score * 10) / 10;
};

validateName.assessNameCommonality = function(name) {
  const commonNames = [
    'john', 'mary', 'michael', 'sarah', 'david', 'lisa',
    'robert', 'jennifer', 'william', 'patricia'
  ];
  
  const lowerName = name.toLowerCase();
  const isCommon = commonNames.some(common => lowerName.includes(common));
  
  return isCommon ? 'high' : 'unknown';
};

// Helper method for profanity checking
validateName.checkProfanity = function(name) {
  // Basic profanity detection - in real implementation, use a comprehensive service
  const profaneWords = [
    'badword1', 'badword2' // Placeholder - replace with actual profanity filter
  ];
  
  const lowerName = name.toLowerCase();
  const detectedWords = profaneWords.filter(word => lowerName.includes(word));
  
  return {
    hasProfanity: detectedWords.length > 0,
    detectedWords,
    confidence: detectedWords.length > 0 ? 0.8 : 0.0
  };
};

// Helper method for generating name suggestions
validateName.generateNameSuggestions = function(name, type) {
  const suggestions = [];
  
  // Remove invalid characters
  let cleaned = name.replace(/[^a-zA-Z0-9\\s\\-']/g, '');
  if (cleaned !== name && cleaned.length > 0) {
    suggestions.push(`Remove special characters: "${cleaned}"`);
  }
  
  // Trim excessive length
  if (name.length > 50) {
    suggestions.push(`Shorten to: "${name.substring(0, 50).trim()}"`);
  }
  
  // Capitalize properly
  const capitalized = name.replace(/\\b\\w/g, l => l.toUpperCase());
  if (capitalized !== name) {
    suggestions.push(`Proper capitalization: "${capitalized}"`);
  }
  
  return suggestions;
};

/**
 * Enterprise Pagination Validation with Performance and Security Controls
 * @param {number|string} page - Page number
 * @param {number|string} limit - Items per page
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result with optimized pagination
 */
function validatePagination(page, limit, options = {}) {
  const startTime = Date.now();
  const {
    sanitize = true,
    businessRules = [],
    context = {},
    maxLimit = 1000,
    defaultPage = 1,
    defaultLimit = 20,
    allowZeroPage = false,
    performanceOptimization = true
  } = options;
  
  try {
    enterpriseValidator.metrics.validationsPerformed++;
    
    // Input sanitization and conversion
    let sanitizedPage = sanitize ? 
      enterpriseValidator.advancedSanitization(String(page || defaultPage), {
        removeScripts: true,
        escapeHtml: false,
        normalizeWhitespace: true
      }) : String(page || defaultPage);
    
    let sanitizedLimit = sanitize ? 
      enterpriseValidator.advancedSanitization(String(limit || defaultLimit), {
        removeScripts: true,
        escapeHtml: false,
        normalizeWhitespace: true
      }) : String(limit || defaultLimit);
    
    // Parse and validate page
    const parsedPage = parseInt(sanitizedPage, 10);
    const parsedLimit = parseInt(sanitizedLimit, 10);
    
    // Validation errors tracking
    const validationErrors = [];
    
    // Page validation
    if (isNaN(parsedPage)) {
      validationErrors.push('Page must be a valid number');
    } else if (parsedPage < (allowZeroPage ? 0 : 1)) {
      validationErrors.push(`Page must be ${allowZeroPage ? 'non-negative' : 'positive'}`);
    } else if (parsedPage > 1000000) {
      validationErrors.push('Page number is too large (max: 1,000,000)');
    }
    
    // Limit validation
    if (isNaN(parsedLimit)) {
      validationErrors.push('Limit must be a valid number');
    } else if (parsedLimit < 1) {
      validationErrors.push('Limit must be positive');
    } else if (parsedLimit > maxLimit) {
      validationErrors.push(`Limit cannot exceed ${maxLimit}`);
    }
    
    // Calculate final validated values
    const validatedPage = isNaN(parsedPage) || parsedPage < (allowZeroPage ? 0 : 1) ? 
      defaultPage : Math.min(parsedPage, 1000000);
    const validatedLimit = isNaN(parsedLimit) || parsedLimit < 1 ? 
      defaultLimit : Math.min(parsedLimit, maxLimit);
    
    // Performance analysis
    const performanceAnalysis = performanceOptimization ? 
      validatePagination.analyzePerformance(validatedPage, validatedLimit, context) : null;
    
    // Business rules validation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = enterpriseValidator.validateWithBusinessRules(
        { page: validatedPage, limit: validatedLimit }, businessRules, 
        { ...context, performanceAnalysis }
      );
    }
    
    // Calculate pagination metadata
    const paginationMeta = validatePagination.calculatePaginationMetadata(
      validatedPage, validatedLimit, context.totalItems
    );
    
    const duration = Date.now() - startTime;
    const isValid = validationErrors.length === 0 && businessRuleResults.overallValid;
    
    enterpriseValidator.updateMetrics('validatePagination', duration, isValid);
    
    // Audit logging
    if (enterpriseValidator.options.enableAuditLogging) {
      enterpriseValidator.emit('paginationValidation', {
        input: { page, limit },
        validated: { page: validatedPage, limit: validatedLimit },
        result: isValid,
        performanceAnalysis,
        paginationMeta,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid,
      error: isValid ? null : validationErrors[0] || 'Pagination validation failed',
      page: validatedPage,
      limit: validatedLimit,
      originalPage: page,
      originalLimit: limit,
      validationErrors,
      performanceAnalysis,
      paginationMeta,
      businessRules: businessRuleResults,
      recommendations: validatePagination.generateOptimizationRecommendations(
        validatedPage, validatedLimit, performanceAnalysis
      ),
      metadata: {
        validationTime: duration,
        maxLimit,
        defaultPage,
        defaultLimit,
        allowZeroPage,
        performanceOptimization
      },
      code: isValid ? 'VALID' : 'VALIDATION_FAILED'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseValidator.metrics.performanceIssues++;
    enterpriseValidator.updateMetrics('validatePagination', duration, false);
    
    return {
      isValid: false,
      error: 'Pagination validation system error',
      page: defaultPage,
      limit: defaultLimit,
      code: 'SYSTEM_ERROR',
      details: error.message
    };
  }
}

// Helper method for performance analysis
validatePagination.analyzePerformance = function(page, limit, context = {}) {
  const analysis = {
    estimatedRecords: page * limit,
    memoryImpact: 'unknown',
    queryComplexity: 'standard',
    recommendations: []
  };
  
  // Memory impact assessment
  if (limit <= 10) {
    analysis.memoryImpact = 'very_low';
  } else if (limit <= 50) {
    analysis.memoryImpact = 'low';
  } else if (limit <= 100) {
    analysis.memoryImpact = 'medium';
  } else if (limit <= 500) {
    analysis.memoryImpact = 'high';
  } else {
    analysis.memoryImpact = 'very_high';
    analysis.recommendations.push('Consider reducing page size for better performance');
  }
  
  // Deep pagination analysis
  if (page > 100) {
    analysis.queryComplexity = 'high';
    analysis.recommendations.push('Deep pagination detected - consider using cursor-based pagination');
  } else if (page > 50) {
    analysis.queryComplexity = 'medium';
    analysis.recommendations.push('Consider implementing search filters to reduce pagination depth');
  }
  
  // Large result set analysis
  if (analysis.estimatedRecords > 10000) {
    analysis.recommendations.push('Large result set - consider implementing virtual scrolling or lazy loading');
  }
  
  // Database impact assessment
  const dbImpactScore = Math.min(100, (page * limit) / 1000);
  analysis.databaseImpact = {
    score: dbImpactScore,
    level: dbImpactScore < 20 ? 'low' : dbImpactScore < 50 ? 'medium' : 'high'
  };
  
  return analysis;
};

// Helper method for pagination metadata calculation
validatePagination.calculatePaginationMetadata = function(page, limit, totalItems = null) {
  const meta = {
    currentPage: page,
    itemsPerPage: limit,
    offset: (page - 1) * limit
  };
  
  if (totalItems !== null && totalItems !== undefined) {
    meta.totalItems = parseInt(totalItems, 10) || 0;
    meta.totalPages = Math.ceil(meta.totalItems / limit);
    meta.hasNextPage = page < meta.totalPages;
    meta.hasPreviousPage = page > 1;
    meta.isLastPage = page >= meta.totalPages;
    meta.isFirstPage = page === 1;
    meta.itemsOnPage = Math.min(limit, Math.max(0, meta.totalItems - meta.offset));
    meta.itemRange = {
      start: Math.min(meta.offset + 1, meta.totalItems),
      end: Math.min(meta.offset + limit, meta.totalItems)
    };
  }
  
  return meta;
};

// Helper method for optimization recommendations
validatePagination.generateOptimizationRecommendations = function(page, limit, performanceAnalysis) {
  const recommendations = [];
  
  if (performanceAnalysis) {
    recommendations.push(...performanceAnalysis.recommendations);
  }
  
  // General optimization recommendations
  if (limit > 100) {
    recommendations.push('Consider reducing page size to improve load times');
  }
  
  if (page === 1 && limit < 20) {
    recommendations.push('Consider increasing initial page size for better user experience');
  }
  
  // Caching recommendations
  if (page <= 5) {
    recommendations.push('Early pages are good candidates for caching');
  }
  
  // Mobile optimization
  if (limit > 50) {
    recommendations.push('Consider smaller page sizes for mobile devices');
  }
  
  return [...new Set(recommendations)]; // Remove duplicates
};

// Helper method for cursor-based pagination conversion
validatePagination.toCursor = function(page, limit, sortField = 'id') {
  return {
    cursor: btoa(`${sortField}:${(page - 1) * limit}`),
    limit,
    sortField,
    direction: 'next'
  };
};

// Helper method for performance monitoring
validatePagination.trackPerformance = function(page, limit, executionTime, resultCount) {
  const metrics = {
    page,
    limit,
    executionTime,
    resultCount,
    efficiency: resultCount / executionTime,
    timestamp: new Date()
  };
  
  // Emit performance metrics for monitoring
  if (enterpriseValidator.options.enableMetrics) {
    enterpriseValidator.emit('paginationPerformance', metrics);
  }
  
  return metrics;
};

// Export the enterprise validator engine for external access
module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRole,
  validateStatus,
  sanitizeString,
  validateName,
  validatePagination,
  enterpriseValidator, // Export the engine for advanced usage
  
  // Utility methods for direct access
  utils: {
    analyzePasswordEntropy: (password) => enterpriseValidator.calculatePasswordEntropy(password),
    detectThreats: (input) => enterpriseValidator.detectThreats(input),
    sanitizeAdvanced: (input, options) => enterpriseValidator.advancedSanitization(input, options),
    getHealthStatus: () => enterpriseValidator.getHealthStatus(),
    getMetrics: () => enterpriseValidator.collectSecurityMetrics(),
    resetMetrics: () => enterpriseValidator.resetMetrics()
  },
  
  // Configuration methods
  config: {
    addBusinessRule: (name, ruleFn) => enterpriseValidator.addBusinessRule(name, ruleFn),
    updateOptions: (options) => Object.assign(enterpriseValidator.options, options),
    getOptions: () => ({ ...enterpriseValidator.options })
  }
};