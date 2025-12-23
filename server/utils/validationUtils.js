/**
 * Enterprise Validation and Data Integrity System
 * Advanced validation framework with security controls, business rules, and compliance features
 * Provides comprehensive data validation, sanitization, and quality assurance for procurement operations
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const validator = require('validator');

// Enterprise Validation Engine
class EnterpriseValidationEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      enableSanitization: true,
      enableAuditLogging: true,
      enableMetrics: true,
      strictMode: false,
      maxValidationDepth: 10,
      enableI18n: true,
      enableBusinessRules: true,
      ...options
    };
    
    this.cache = new Map();
    this.validationHistory = [];
    this.businessRules = new Map();
    this.customValidators = new Map();
    this.sanitizers = new Map();
    this.localization = new Map();
    
    this.metrics = {
      validationsPerformed: 0,
      validationErrors: 0,
      sanitizationsPerformed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageValidationTime: 0,
      businessRuleViolations: 0,
      securityThreatsBlocked: 0,
      lastResetTime: Date.now()
    };
    
    // Initialize built-in business rules
    this.initializeBusinessRules();
    
    // Initialize sanitizers
    this.initializeSanitizers();
    
    // Initialize localization
    this.initializeLocalization();
    
    // Start metrics collection
    if (this.options.enableMetrics) {
      this.metricsInterval = setInterval(() => this.collectMetrics(), 60000);
    }
  }
  
  initializeBusinessRules() {
    // Financial validation rules
    this.addBusinessRule('procurement-amount', (value, context) => {
      const amount = parseFloat(value);
      const threshold = context?.organizationThreshold || 100000;
      
      if (amount > threshold) {
        return {
          valid: false,
          severity: 'warning',
          code: 'AMOUNT_EXCEEDS_THRESHOLD',
          message: `Amount exceeds organization threshold of ${threshold}`,
          requiresApproval: true,
          approvalLevel: amount > threshold * 5 ? 'executive' : 'management'
        };
      }
      
      return { valid: true };
    });
    
    // Supplier validation rules
    this.addBusinessRule('supplier-verification', (value, context) => {
      const supplierData = context?.supplierData || {};
      const risks = [];
      
      if (!supplierData.certified) risks.push('NOT_CERTIFIED');
      if (!supplierData.compliant) risks.push('NOT_COMPLIANT');
      if (supplierData.riskScore > 0.7) risks.push('HIGH_RISK_SCORE');
      
      return {
        valid: risks.length === 0,
        risks,
        riskLevel: risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low'
      };
    });
    
    // Compliance validation rules
    this.addBusinessRule('regulatory-compliance', (value, context) => {
      const regulations = context?.applicableRegulations || [];
      const compliance = {
        sox: regulations.includes('SOX') ? this.validateSOXCompliance(value, context) : { compliant: true },
        gdpr: regulations.includes('GDPR') ? this.validateGDPRCompliance(value, context) : { compliant: true },
        iso: regulations.includes('ISO') ? this.validateISOCompliance(value, context) : { compliant: true }
      };
      
      const overallCompliance = Object.values(compliance).every(c => c.compliant);
      return {
        valid: overallCompliance,
        compliance,
        violations: Object.entries(compliance)
          .filter(([_, c]) => !c.compliant)
          .map(([reg, _]) => reg)
      };
    });
  }
  
  initializeSanitizers() {
    // XSS protection
    this.addSanitizer('xss', (value) => {
      if (typeof value !== 'string') return value;
      return validator.escape(value);
    });
    
    // SQL injection protection
    this.addSanitizer('sql', (value) => {
      if (typeof value !== 'string') return value;
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
        /([';])/g,
        /(--|\*\/|\/\*)/g
      ];
      
      let sanitized = value;
      sqlPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
      
      return sanitized.trim();
    });
    
    // PII sanitization
    this.addSanitizer('pii', (value) => {
      if (typeof value !== 'string') return value;
      
      // SSN pattern
      value = value.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, 'XXX-XX-XXXX');
      // Credit card pattern
      value = value.replace(/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, 'XXXX-XXXX-XXXX-XXXX');
      
      return value;
    });
    
    // Phone number normalization
    this.addSanitizer('phone', (value) => {
      if (typeof value !== 'string') return value;
      return value.replace(/[^\d+]/g, '');
    });
  }
  
  initializeLocalization() {
    const messages = {
      'en-US': {
        required: 'Field is required',
        invalid_email: 'Invalid email format',
        invalid_phone: 'Invalid phone number',
        invalid_url: 'Invalid URL format',
        min_length: 'Must be at least {min} characters',
        max_length: 'Cannot exceed {max} characters',
        invalid_number: 'Must be a number',
        out_of_range: 'Value must be between {min} and {max}',
        invalid_date: 'Invalid date format',
        date_in_past: 'Date cannot be in the past',
        invalid_currency: 'Invalid currency amount',
        negative_amount: 'Amount cannot be negative'
      },
      'es-ES': {
        required: 'El campo es obligatorio',
        invalid_email: 'Formato de email inválido',
        invalid_phone: 'Número de teléfono inválido',
        invalid_url: 'Formato de URL inválido',
        min_length: 'Debe tener al menos {min} caracteres',
        max_length: 'No puede exceder {max} caracteres',
        invalid_number: 'Debe ser un número',
        out_of_range: 'El valor debe estar entre {min} y {max}',
        invalid_date: 'Formato de fecha inválido',
        date_in_past: 'La fecha no puede estar en el pasado',
        invalid_currency: 'Monto de moneda inválido',
        negative_amount: 'El monto no puede ser negativo'
      },
      'fr-FR': {
        required: 'Le champ est requis',
        invalid_email: 'Format d\'email invalide',
        invalid_phone: 'Numéro de téléphone invalide',
        invalid_url: 'Format d\'URL invalide',
        min_length: 'Doit faire au moins {min} caractères',
        max_length: 'Ne peut pas dépasser {max} caractères',
        invalid_number: 'Doit être un nombre',
        out_of_range: 'La valeur doit être entre {min} et {max}',
        invalid_date: 'Format de date invalide',
        date_in_past: 'La date ne peut pas être dans le passé',
        invalid_currency: 'Montant de devise invalide',
        negative_amount: 'Le montant ne peut pas être négatif'
      },
      'de-DE': {
        required: 'Feld ist erforderlich',
        invalid_email: 'Ungültiges E-Mail-Format',
        invalid_phone: 'Ungültige Telefonnummer',
        invalid_url: 'Ungültiges URL-Format',
        min_length: 'Muss mindestens {min} Zeichen haben',
        max_length: 'Kann {max} Zeichen nicht überschreiten',
        invalid_number: 'Muss eine Zahl sein',
        out_of_range: 'Wert muss zwischen {min} und {max} liegen',
        invalid_date: 'Ungültiges Datumsformat',
        date_in_past: 'Datum kann nicht in der Vergangenheit liegen',
        invalid_currency: 'Ungültiger Währungsbetrag',
        negative_amount: 'Betrag kann nicht negativ sein'
      }
    };
    
    for (const [locale, msgs] of Object.entries(messages)) {
      this.localization.set(locale, msgs);
    }
  }
  
  addBusinessRule(name, rule) {
    this.businessRules.set(name, rule);
    this.emit('businessRuleAdded', { name, timestamp: new Date() });
  }
  
  addCustomValidator(name, validator) {
    this.customValidators.set(name, validator);
    this.emit('customValidatorAdded', { name, timestamp: new Date() });
  }
  
  addSanitizer(name, sanitizer) {
    this.sanitizers.set(name, sanitizer);
    this.emit('sanitizerAdded', { name, timestamp: new Date() });
  }
  
  getMessage(key, locale = 'en-US', params = {}) {
    const messages = this.localization.get(locale) || this.localization.get('en-US');
    let message = messages[key] || key;
    
    // Replace parameters
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(`{${param}}`, value);
    }
    
    return message;
  }
  
  sanitizeValue(value, sanitizers = ['xss'], context = {}) {
    if (value === null || value === undefined) return value;
    
    let sanitized = value;
    const appliedSanitizers = [];
    
    try {
      for (const sanitizerName of sanitizers) {
        const sanitizer = this.sanitizers.get(sanitizerName);
        if (sanitizer) {
          sanitized = sanitizer(sanitized, context);
          appliedSanitizers.push(sanitizerName);
        }
      }
      
      this.metrics.sanitizationsPerformed++;
      this.emit('valueSanitized', { 
        original: value, 
        sanitized, 
        sanitizers: appliedSanitizers,
        timestamp: new Date()
      });
      
      return sanitized;
      
    } catch (error) {
      this.emit('sanitizationError', { value, error: error.message, timestamp: new Date() });
      return value; // Return original if sanitization fails
    }
  }
  
  evaluateBusinessRules(value, rules = [], context = {}) {
    const results = {};
    const violations = [];
    
    try {
      for (const ruleName of rules) {
        const rule = this.businessRules.get(ruleName);
        if (rule) {
          const result = rule(value, context);
          results[ruleName] = result;
          
          if (!result.valid) {
            violations.push({
              rule: ruleName,
              ...result
            });
            this.metrics.businessRuleViolations++;
          }
        }
      }
      
      return {
        success: true,
        results,
        violations,
        overallValid: violations.length === 0
      };
      
    } catch (error) {
      this.emit('businessRuleError', { rules, error: error.message, timestamp: new Date() });
      return {
        success: false,
        error: error.message,
        results: {},
        violations: [],
        overallValid: false
      };
    }
  }
  
  validateSOXCompliance(value, context) {
    // SOX financial controls validation
    const requirements = {
      auditTrail: context.auditTrail || false,
      approvalProcess: context.approvalProcess || false,
      segregationOfDuties: context.segregationOfDuties || false
    };
    
    const compliant = Object.values(requirements).every(req => req === true);
    return { 
      compliant, 
      requirements,
      missingControls: Object.entries(requirements)
        .filter(([_, value]) => !value)
        .map(([key, _]) => key)
    };
  }
  
  validateGDPRCompliance(value, context) {
    // GDPR data protection validation
    const requirements = {
      dataProcessingLegal: context.dataProcessingLegal || false,
      consentObtained: context.consentObtained || false,
      dataMinimization: context.dataMinimization || false
    };
    
    const compliant = Object.values(requirements).every(req => req === true);
    return { 
      compliant, 
      requirements,
      missingRequirements: Object.entries(requirements)
        .filter(([_, value]) => !value)
        .map(([key, _]) => key)
    };
  }
  
  validateISOCompliance(value, context) {
    // ISO quality management validation
    const requirements = {
      qualityDocumentation: context.qualityDocumentation || false,
      processControl: context.processControl || false,
      continualImprovement: context.continualImprovement || false
    };
    
    const compliant = Object.values(requirements).every(req => req === true);
    return { 
      compliant, 
      requirements,
      improvementAreas: Object.entries(requirements)
        .filter(([_, value]) => !value)
        .map(([key, _]) => key)
    };
  }
  
  collectMetrics() {
    const now = Date.now();
    const timeSinceReset = now - this.metrics.lastResetTime;
    
    const metrics = {
      ...this.metrics,
      uptime: timeSinceReset,
      memoryUsage: process.memoryUsage(),
      cacheSize: this.cache.size,
      businessRulesCount: this.businessRules.size,
      customValidatorsCount: this.customValidators.size,
      sanitizersCount: this.sanitizers.size,
      successRate: this.metrics.validationsPerformed > 0 ? 
        ((this.metrics.validationsPerformed - this.metrics.validationErrors) / this.metrics.validationsPerformed) * 100 : 100
    };
    
    this.emit('metricsCollected', metrics);
    return metrics;
  }
  
  getStatistics() {
    return {
      ...this.collectMetrics(),
      status: 'healthy',
      lastUpdated: new Date()
    };
  }
  
  getHealthStatus() {
    const metrics = this.collectMetrics();
    const errorRate = (metrics.validationErrors / Math.max(metrics.validationsPerformed, 1)) * 100;
    const isHealthy = errorRate < 5 && metrics.cacheSize < 10000;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      errorRate,
      performance: {
        averageValidationTime: metrics.averageValidationTime,
        successRate: metrics.successRate,
        cacheHitRate: (metrics.cacheHits / Math.max(metrics.cacheHits + metrics.cacheMisses, 1)) * 100
      },
      resources: {
        memoryUsage: metrics.memoryUsage,
        cacheSize: metrics.cacheSize,
        businessRules: metrics.businessRulesCount
      }
    };
  }
  
  updateMetrics(operation, duration, success = true) {
    this.metrics.validationsPerformed++;
    if (!success) this.metrics.validationErrors++;
    
    // Update average validation time
    const currentAvg = this.metrics.averageValidationTime || 0;
    const count = this.metrics.validationsPerformed;
    this.metrics.averageValidationTime = ((currentAvg * (count - 1)) + duration) / count;
    
    this.emit('metricsUpdated', {
      operation,
      duration,
      success,
      totalValidations: count
    });
  }
}

/**
 * Enhanced Email Validation with Advanced Security and Business Rules
 * @param {string} email - Email to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validateEmail = (email, options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    allowInternational = true,
    checkDomainMX = false,
    blockDisposable = false
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization
    let cleanEmail = email;
    if (sanitize) {
      cleanEmail = validationEngine.sanitizeValue(email, ['xss'], context);
    }
    
    // Basic format validation
    const emailRegex = allowInternational 
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
      : /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(cleanEmail)) {
      const duration = Date.now() - startTime;
      validationEngine.updateMetrics('validateEmail', duration, false);
      
      return {
        isValid: false,
        error: validationEngine.getMessage('invalid_email', locale),
        code: 'INVALID_FORMAT',
        severity: 'error',
        sanitized: cleanEmail
      };
    }
    
    // Advanced email validation using validator library
    const validatorOptions = {
      allow_utf8_local_part: allowInternational,
      require_tld: true,
      allow_ip_domain: false
    };
    
    if (!validator.isEmail(cleanEmail, validatorOptions)) {
      const duration = Date.now() - startTime;
      validationEngine.updateMetrics('validateEmail', duration, false);
      
      return {
        isValid: false,
        error: validationEngine.getMessage('invalid_email', locale),
        code: 'INVALID_STRUCTURE',
        severity: 'error',
        sanitized: cleanEmail
      };
    }
    
    // Domain validation
    const domain = cleanEmail.split('@')[1].toLowerCase();
    const domainValidation = {
      isValid: true,
      warnings: []
    };
    
    // Check for disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
      'mailinator.com', 'yopmail.com', 'temp-mail.org'
    ];
    
    if (blockDisposable && disposableDomains.includes(domain)) {
      domainValidation.isValid = false;
      domainValidation.warnings.push('Disposable email domain not allowed');
    }
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(cleanEmail, businessRules, {
        ...context,
        domain,
        isDisposable: disposableDomains.includes(domain)
      });
    }
    
    const duration = Date.now() - startTime;
    const isValid = domainValidation.isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateEmail', duration, isValid);
    
    // Audit logging
    if (validationEngine.options.enableAuditLogging) {
      validationEngine.emit('validationPerformed', {
        type: 'email',
        input: email,
        sanitized: cleanEmail,
        result: isValid,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid,
      error: isValid ? null : validationEngine.getMessage('invalid_email', locale),
      sanitized: cleanEmail,
      domain: {
        name: domain,
        ...domainValidation
      },
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        internationalAllowed: allowInternational,
        disposableBlocked: blockDisposable
      },
      code: isValid ? 'VALID' : 'VALIDATION_FAILED',
      severity: isValid ? 'info' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateEmail', duration, false);
    validationEngine.emit('validationError', { type: 'email', error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: 'Email validation failed',
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Enhanced Phone Number Validation with International Support
 * @param {string} phone - Phone to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validatePhone = (phone, options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    country = 'US',
    format = 'E164',
    allowMobile = true,
    allowLandline = true
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization
    let cleanPhone = phone;
    if (sanitize) {
      cleanPhone = validationEngine.sanitizeValue(phone, ['phone'], context);
    }
    
    // Basic format validation
    const phoneRegex = /^[\d\+\-\(\)\s]{7,}$/;
    if (!phoneRegex.test(cleanPhone)) {
      const duration = Date.now() - startTime;
      validationEngine.updateMetrics('validatePhone', duration, false);
      
      return {
        isValid: false,
        error: validationEngine.getMessage('invalid_phone', locale),
        code: 'INVALID_FORMAT',
        severity: 'error',
        sanitized: cleanPhone
      };
    }
    
    // Advanced phone validation using validator library
    let isValidPhone = false;
    let phoneType = 'unknown';
    let formattedPhone = cleanPhone;
    
    try {
      // Remove all non-digit characters except +
      const digitsOnly = cleanPhone.replace(/[^\d+]/g, '');
      
      // Basic international format check
      if (digitsOnly.startsWith('+')) {
        isValidPhone = validator.isMobilePhone(digitsOnly);
        phoneType = 'mobile';
      } else {
        // Try to validate as mobile
        const withCountryCode = `+1${digitsOnly}`;
        isValidPhone = validator.isMobilePhone(withCountryCode, country) || 
                      validator.isMobilePhone(digitsOnly, country);
        phoneType = isValidPhone ? 'mobile' : 'unknown';
        
        // If not mobile, check landline patterns
        if (!isValidPhone && allowLandline) {
          const landlineRegex = /^[\d\-\(\)\s]{10,}$/;
          isValidPhone = landlineRegex.test(cleanPhone);
          phoneType = isValidPhone ? 'landline' : 'unknown';
        }
      }
      
      // Format phone number
      if (isValidPhone && format === 'E164') {
        const digits = cleanPhone.replace(/[^\d]/g, '');
        if (digits.length === 10) {
          formattedPhone = `+1${digits}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
          formattedPhone = `+${digits}`;
        }
      }
      
    } catch (validatorError) {
      // Fallback validation
      const fallbackRegex = /^(\+\d{1,3})?[\d\s\-\(\)]{7,}$/;
      isValidPhone = fallbackRegex.test(cleanPhone);
    }
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(cleanPhone, businessRules, {
        ...context,
        phoneType,
        country,
        formatted: formattedPhone
      });
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = isValidPhone && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validatePhone', duration, finalIsValid);
    
    // Audit logging
    if (validationEngine.options.enableAuditLogging) {
      validationEngine.emit('validationPerformed', {
        type: 'phone',
        input: phone,
        sanitized: cleanPhone,
        result: finalIsValid,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid: finalIsValid,
      error: finalIsValid ? null : validationEngine.getMessage('invalid_phone', locale),
      sanitized: cleanPhone,
      formatted: formattedPhone,
      phoneType,
      country,
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        allowMobile,
        allowLandline,
        format
      },
      code: finalIsValid ? 'VALID' : 'VALIDATION_FAILED',
      severity: finalIsValid ? 'info' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validatePhone', duration, false);
    validationEngine.emit('validationError', { type: 'phone', error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: 'Phone validation failed',
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Enhanced URL Validation with Security and Business Rules
 * @param {string} url - URL to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validateUrl = (url, options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    protocols = ['http', 'https'],
    requireTLD = true,
    allowLocalhost = false,
    blockSuspiciousDomains = true
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization
    let cleanUrl = url;
    if (sanitize) {
      cleanUrl = validationEngine.sanitizeValue(url, ['xss'], context);
    }
    
    // Basic URL validation
    let urlObj;
    try {
      urlObj = new URL(cleanUrl);
    } catch {
      const duration = Date.now() - startTime;
      validationEngine.updateMetrics('validateUrl', duration, false);
      
      return {
        isValid: false,
        error: validationEngine.getMessage('invalid_url', locale),
        code: 'INVALID_FORMAT',
        severity: 'error',
        sanitized: cleanUrl
      };
    }
    
    // Protocol validation
    if (!protocols.includes(urlObj.protocol.slice(0, -1))) {
      const duration = Date.now() - startTime;
      validationEngine.updateMetrics('validateUrl', duration, false);
      
      return {
        isValid: false,
        error: `Protocol must be one of: ${protocols.join(', ')}`,
        code: 'INVALID_PROTOCOL',
        severity: 'error',
        sanitized: cleanUrl,
        detectedProtocol: urlObj.protocol.slice(0, -1)
      };
    }
    
    // Domain validation
    const hostname = urlObj.hostname.toLowerCase();
    const domainValidation = {
      isValid: true,
      warnings: [],
      risks: []
    };
    
    // Check localhost
    if (!allowLocalhost && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.'))) {
      domainValidation.isValid = false;
      domainValidation.warnings.push('Localhost/private IP addresses not allowed');
    }
    
    // TLD validation
    if (requireTLD && !hostname.includes('.')) {
      domainValidation.isValid = false;
      domainValidation.warnings.push('Top-level domain required');
    }
    
    // Suspicious domain checking
    const suspiciousDomains = [
      'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
      'malware-test.com', 'phishing-test.org'
    ];
    
    if (blockSuspiciousDomains && suspiciousDomains.some(domain => hostname.includes(domain))) {
      domainValidation.risks.push('Potentially suspicious domain detected');
    }
    
    // Advanced URL validation using validator library
    const validatorOptions = {
      protocols: protocols,
      require_tld: requireTLD,
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true,
      allow_underscores: false,
      host_whitelist: false,
      host_blacklist: false,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false
    };
    
    const isValidUrl = validator.isURL(cleanUrl, validatorOptions);
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(cleanUrl, businessRules, {
        ...context,
        protocol: urlObj.protocol.slice(0, -1),
        hostname,
        domain: urlObj.hostname,
        path: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        suspicious: domainValidation.risks.length > 0
      });
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = isValidUrl && domainValidation.isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateUrl', duration, finalIsValid);
    
    // Audit logging
    if (validationEngine.options.enableAuditLogging) {
      validationEngine.emit('validationPerformed', {
        type: 'url',
        input: url,
        sanitized: cleanUrl,
        result: finalIsValid,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid: finalIsValid,
      error: finalIsValid ? null : validationEngine.getMessage('invalid_url', locale),
      sanitized: cleanUrl,
      parsed: {
        protocol: urlObj.protocol.slice(0, -1),
        hostname: urlObj.hostname,
        port: urlObj.port,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash
      },
      domain: domainValidation,
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        allowedProtocols: protocols,
        requireTLD,
        allowLocalhost
      },
      code: finalIsValid ? 'VALID' : 'VALIDATION_FAILED',
      severity: finalIsValid ? 'info' : domainValidation.risks.length > 0 ? 'warning' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateUrl', duration, false);
    validationEngine.emit('validationError', { type: 'url', error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: 'URL validation failed',
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Enhanced Required Field Validation with Business Context
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validateRequired = (value, fieldName = 'field', options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    allowEmptyString = false,
    allowZero = true,
    allowFalse = true,
    trimWhitespace = true
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization
    let cleanValue = value;
    if (sanitize && typeof value === 'string') {
      cleanValue = validationEngine.sanitizeValue(value, ['xss'], context);
      if (trimWhitespace) {
        cleanValue = cleanValue.trim();
      }
    }
    
    // Required validation logic
    let isValid = true;
    let validationDetails = { type: typeof cleanValue };
    
    if (cleanValue === null || cleanValue === undefined) {
      isValid = false;
      validationDetails.reason = 'null_or_undefined';
    } else if (typeof cleanValue === 'string') {
      if (!allowEmptyString && cleanValue === '') {
        isValid = false;
        validationDetails.reason = 'empty_string';
      } else if (trimWhitespace && cleanValue.trim() === '') {
        isValid = false;
        validationDetails.reason = 'whitespace_only';
      }
    } else if (typeof cleanValue === 'number') {
      if (!allowZero && cleanValue === 0) {
        isValid = false;
        validationDetails.reason = 'zero_not_allowed';
      } else if (isNaN(cleanValue)) {
        isValid = false;
        validationDetails.reason = 'not_a_number';
      }
    } else if (typeof cleanValue === 'boolean') {
      if (!allowFalse && cleanValue === false) {
        isValid = false;
        validationDetails.reason = 'false_not_allowed';
      }
    } else if (Array.isArray(cleanValue)) {
      if (cleanValue.length === 0) {
        isValid = false;
        validationDetails.reason = 'empty_array';
      }
    } else if (typeof cleanValue === 'object') {
      if (Object.keys(cleanValue).length === 0) {
        isValid = false;
        validationDetails.reason = 'empty_object';
      }
    }
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(cleanValue, businessRules, {
        ...context,
        fieldName,
        ...validationDetails
      });
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateRequired', duration, finalIsValid);
    
    // Audit logging
    if (validationEngine.options.enableAuditLogging) {
      validationEngine.emit('validationPerformed', {
        type: 'required',
        field: fieldName,
        input: value,
        sanitized: cleanValue,
        result: finalIsValid,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    const errorMessage = !finalIsValid 
      ? validationEngine.getMessage('field_required', locale).replace('{field}', fieldName)
      : null;
    
    return {
      isValid: finalIsValid,
      error: errorMessage,
      sanitized: cleanValue,
      details: validationDetails,
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        fieldName,
        allowEmptyString,
        allowZero,
        allowFalse
      },
      code: finalIsValid ? 'VALID' : 'REQUIRED_FIELD_MISSING',
      severity: finalIsValid ? 'info' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateRequired', duration, false);
    validationEngine.emit('validationError', { type: 'required', field: fieldName, error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: `Required field validation failed for ${fieldName}`,
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Enhanced Minimum Length Validation
 * @param {string} value - Value to check
 * @param {number} minLength - Minimum length
 * @param {string} fieldName - Field name for error message
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validateMinLength = (value, minLength, fieldName = 'Field', options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    trimWhitespace = true,
    countUnicodeCodePoints = false
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization
    let cleanValue = value;
    if (sanitize && typeof value === 'string') {
      cleanValue = validationEngine.sanitizeValue(value, ['xss'], context);
      if (trimWhitespace) {
        cleanValue = cleanValue.trim();
      }
    }
    
    // Length calculation
    let actualLength;
    if (typeof cleanValue === 'string') {
      actualLength = countUnicodeCodePoints 
        ? Array.from(cleanValue).length  // Count Unicode code points
        : cleanValue.length;              // Count UTF-16 code units
    } else if (Array.isArray(cleanValue)) {
      actualLength = cleanValue.length;
    } else {
      actualLength = 0;
    }
    
    const isValid = actualLength >= minLength;
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(cleanValue, businessRules, {
        ...context,
        fieldName,
        actualLength,
        minLength,
        deficit: Math.max(0, minLength - actualLength)
      });
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateMinLength', duration, finalIsValid);
    
    const errorMessage = !finalIsValid 
      ? validationEngine.getMessage('min_length_error', locale)
          .replace('{field}', fieldName)
          .replace('{minLength}', minLength)
          .replace('{actualLength}', actualLength)
      : null;
    
    return {
      isValid: finalIsValid,
      error: errorMessage,
      sanitized: cleanValue,
      actualLength,
      minLength,
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        fieldName,
        trimWhitespace,
        countUnicodeCodePoints
      },
      code: finalIsValid ? 'VALID' : 'MIN_LENGTH_VIOLATION',
      severity: finalIsValid ? 'info' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateMinLength', duration, false);
    validationEngine.emit('validationError', { type: 'minLength', field: fieldName, error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: `Length validation failed for ${fieldName}`,
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Enhanced Maximum Length Validation
 * @param {string} value - Value to check
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validateMaxLength = (value, maxLength, fieldName = 'Field', options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    trimWhitespace = true,
    countUnicodeCodePoints = false,
    truncateOnExcess = false
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization
    let cleanValue = value;
    if (sanitize && typeof value === 'string') {
      cleanValue = validationEngine.sanitizeValue(value, ['xss'], context);
      if (trimWhitespace) {
        cleanValue = cleanValue.trim();
      }
    }
    
    // Length calculation
    let actualLength;
    if (typeof cleanValue === 'string') {
      actualLength = countUnicodeCodePoints 
        ? Array.from(cleanValue).length  // Count Unicode code points
        : cleanValue.length;              // Count UTF-16 code units
    } else if (Array.isArray(cleanValue)) {
      actualLength = cleanValue.length;
    } else {
      actualLength = 0;
    }
    
    let isValid = actualLength <= maxLength;
    
    // Truncation handling
    if (!isValid && truncateOnExcess && typeof cleanValue === 'string') {
      if (countUnicodeCodePoints) {
        cleanValue = Array.from(cleanValue).slice(0, maxLength).join('');
      } else {
        cleanValue = cleanValue.substring(0, maxLength);
      }
      actualLength = maxLength;
      isValid = true;
    }
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(cleanValue, businessRules, {
        ...context,
        fieldName,
        actualLength,
        maxLength,
        excess: Math.max(0, actualLength - maxLength),
        wasTruncated: truncateOnExcess && actualLength === maxLength
      });
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateMaxLength', duration, finalIsValid);
    
    const errorMessage = !finalIsValid 
      ? validationEngine.getMessage('max_length_error', locale)
          .replace('{field}', fieldName)
          .replace('{maxLength}', maxLength)
          .replace('{actualLength}', actualLength)
      : null;
    
    return {
      isValid: finalIsValid,
      error: errorMessage,
      sanitized: cleanValue,
      actualLength,
      maxLength,
      wasTruncated: truncateOnExcess && actualLength === maxLength,
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        fieldName,
        trimWhitespace,
        countUnicodeCodePoints,
        truncateOnExcess
      },
      code: finalIsValid ? 'VALID' : 'MAX_LENGTH_VIOLATION',
      severity: finalIsValid ? 'info' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateMaxLength', duration, false);
    validationEngine.emit('validationError', { type: 'maxLength', field: fieldName, error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: `Length validation failed for ${fieldName}`,
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Enhanced Number Validation with Business Rules and Range Checking
 * @param {any} value - Value to validate
 * @param {object} options - Validation options
 * @param {string} fieldName - Field name for error messages
 * @returns {object} Enhanced validation result
 */
const validateNumber = (value, options = {}, fieldName = 'field') => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    min = null,
    max = null,
    allowDecimals = true,
    maxDecimalPlaces = null,
    allowNegative = true,
    allowZero = true,
    parseString = true
  } = { ...options };
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization and parsing
    let cleanValue = value;
    let parsedNumber;
    
    if (sanitize && typeof value === 'string') {
      cleanValue = validationEngine.sanitizeValue(value, ['number'], context);
    }
    
    // Parse value to number
    if (typeof cleanValue === 'string' && parseString) {
      // Remove currency symbols and thousand separators
      const numericString = cleanValue.replace(/[$,€£¥]/g, '').trim();
      parsedNumber = parseFloat(numericString);
    } else if (typeof cleanValue === 'number') {
      parsedNumber = cleanValue;
    } else {
      parsedNumber = Number(cleanValue);
    }
    
    // Basic number validation
    if (isNaN(parsedNumber) || !isFinite(parsedNumber)) {
      const duration = Date.now() - startTime;
      validationEngine.updateMetrics('validateNumber', duration, false);
      
      return {
        isValid: false,
        error: validationEngine.getMessage('invalid_number', locale),
        code: 'NOT_A_NUMBER',
        severity: 'error',
        input: value,
        sanitized: cleanValue
      };
    }
    
    // Range validation
    const rangeValidation = { isValid: true, violations: [] };
    
    if (min !== null && parsedNumber < min) {
      rangeValidation.isValid = false;
      rangeValidation.violations.push(`Value ${parsedNumber} is below minimum ${min}`);
    }
    
    if (max !== null && parsedNumber > max) {
      rangeValidation.isValid = false;
      rangeValidation.violations.push(`Value ${parsedNumber} is above maximum ${max}`);
    }
    
    // Special value validation
    if (!allowNegative && parsedNumber < 0) {
      rangeValidation.isValid = false;
      rangeValidation.violations.push('Negative values not allowed');
    }
    
    if (!allowZero && parsedNumber === 0) {
      rangeValidation.isValid = false;
      rangeValidation.violations.push('Zero value not allowed');
    }
    
    // Decimal validation
    const decimalValidation = { isValid: true, violations: [] };
    
    if (!allowDecimals && parsedNumber % 1 !== 0) {
      decimalValidation.isValid = false;
      decimalValidation.violations.push('Decimal values not allowed');
    } else if (maxDecimalPlaces !== null) {
      const decimalPlaces = (parsedNumber.toString().split('.')[1] || '').length;
      if (decimalPlaces > maxDecimalPlaces) {
        decimalValidation.isValid = false;
        decimalValidation.violations.push(`Too many decimal places (${decimalPlaces}), max allowed: ${maxDecimalPlaces}`);
      }
    }
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(parsedNumber, businessRules, {
        ...context,
        originalValue: value,
        isInteger: parsedNumber % 1 === 0,
        isNegative: parsedNumber < 0,
        isZero: parsedNumber === 0,
        decimalPlaces: (parsedNumber.toString().split('.')[1] || '').length
      });
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = rangeValidation.isValid && decimalValidation.isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateNumber', duration, finalIsValid);
    
    // Audit logging
    if (validationEngine.options.enableAuditLogging) {
      validationEngine.emit('validationPerformed', {
        type: 'number',
        input: value,
        sanitized: cleanValue,
        parsed: parsedNumber,
        result: finalIsValid,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid: finalIsValid,
      error: finalIsValid ? null : validationEngine.getMessage('invalid_number', locale),
      input: value,
      sanitized: cleanValue,
      parsed: parsedNumber,
      range: rangeValidation,
      decimal: decimalValidation,
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        min,
        max,
        allowDecimals,
        maxDecimalPlaces,
        allowNegative,
        allowZero
      },
      code: finalIsValid ? 'VALID' : 'NUMBER_VALIDATION_FAILED',
      severity: finalIsValid ? 'info' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateNumber', duration, false);
    validationEngine.emit('validationError', { type: 'number', error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: `${fieldName} validation failed`,
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Validate score (0-10 range)
 * @param {number} score - Score to validate
 * @returns {object} { isValid, error }
 */
const validateScore = (score) => {
  const scoreNum = parseFloat(score);

  if (isNaN(scoreNum)) {
    return {
      isValid: false,
      error: 'Score must be a number',
    };
  }

  if (scoreNum < 0 || scoreNum > 10) {
    return {
      isValid: false,
      error: 'Score must be between 0 and 10',
    };
  }

  return { isValid: true, error: null };
};

/**
 * Enhanced Date Validation with Business Rules and Compliance
 * @param {any} date - Date to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validateDate = (date, options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    canBePast = true,
    canBeFuture = true,
    min = null,
    max = null,
    format = null,
    businessDaysOnly = false,
    holidays = [],
    timezone = 'UTC'
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization
    let cleanDate = date;
    if (sanitize && typeof date === 'string') {
      cleanDate = validationEngine.sanitizeValue(date, ['xss'], context);
    }
    
    // Parse date
    let parsedDate;
    
    if (cleanDate instanceof Date) {
      parsedDate = cleanDate;
    } else if (typeof cleanDate === 'string') {
      // Try multiple date formats
      const dateFormats = [
        cleanDate, // ISO format
        new Date(cleanDate).toISOString(), // Standard parsing
      ];
      
      for (const dateStr of dateFormats) {
        const testDate = new Date(dateStr);
        if (!isNaN(testDate.getTime())) {
          parsedDate = testDate;
          break;
        }
      }
    } else if (typeof cleanDate === 'number') {
      parsedDate = new Date(cleanDate);
    }
    
    // Basic date validation
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      const duration = Date.now() - startTime;
      validationEngine.updateMetrics('validateDate', duration, false);
      
      return {
        isValid: false,
        error: validationEngine.getMessage('invalid_date', locale),
        code: 'INVALID_DATE_FORMAT',
        severity: 'error',
        input: date,
        sanitized: cleanDate
      };
    }
    
    // Date range validation
    const now = new Date();
    const dateValidation = { isValid: true, violations: [], warnings: [] };
    
    if (!canBePast && parsedDate < now) {
      dateValidation.isValid = false;
      dateValidation.violations.push('Date cannot be in the past');
    }
    
    if (!canBeFuture && parsedDate > now) {
      dateValidation.isValid = false;
      dateValidation.violations.push('Date cannot be in the future');
    }
    
    if (min && parsedDate < new Date(min)) {
      dateValidation.isValid = false;
      dateValidation.violations.push(`Date cannot be before ${min}`);
    }
    
    if (max && parsedDate > new Date(max)) {
      dateValidation.isValid = false;
      dateValidation.violations.push(`Date cannot be after ${max}`);
    }
    
    // Business days validation
    if (businessDaysOnly) {
      const dayOfWeek = parsedDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dateValidation.violations.push('Date must be a business day (Monday-Friday)');
        dateValidation.isValid = false;
      }
      
      // Check holidays
      const dateStr = parsedDate.toISOString().split('T')[0];
      if (holidays.includes(dateStr)) {
        dateValidation.violations.push('Date cannot be a holiday');
        dateValidation.isValid = false;
      }
    }
    
    // Format validation
    if (format && typeof cleanDate === 'string') {
      const formatRegex = {
        'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
        'MM/DD/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
        'DD/MM/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
        'ISO8601': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      };
      
      if (formatRegex[format] && !formatRegex[format].test(cleanDate)) {
        dateValidation.isValid = false;
        dateValidation.violations.push(`Date must match format: ${format}`);
      }
    }
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(parsedDate, businessRules, {
        ...context,
        dayOfWeek: parsedDate.getDay(),
        isWeekend: parsedDate.getDay() === 0 || parsedDate.getDay() === 6,
        isPast: parsedDate < now,
        isFuture: parsedDate > now,
        timezone,
        formatted: {
          iso: parsedDate.toISOString(),
          local: parsedDate.toLocaleDateString(locale),
          timestamp: parsedDate.getTime()
        }
      });
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = dateValidation.isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateDate', duration, finalIsValid);
    
    // Audit logging
    if (validationEngine.options.enableAuditLogging) {
      validationEngine.emit('validationPerformed', {
        type: 'date',
        input: date,
        sanitized: cleanDate,
        parsed: parsedDate,
        result: finalIsValid,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid: finalIsValid,
      error: finalIsValid ? null : validationEngine.getMessage('invalid_date', locale),
      input: date,
      sanitized: cleanDate,
      parsed: parsedDate,
      formatted: {
        iso: parsedDate.toISOString(),
        local: parsedDate.toLocaleDateString(locale),
        timestamp: parsedDate.getTime(),
        dayOfWeek: parsedDate.getDay(),
        weekday: parsedDate.toLocaleDateString(locale, { weekday: 'long' })
      },
      dateValidation,
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        canBePast,
        canBeFuture,
        businessDaysOnly,
        timezone,
        format
      },
      code: finalIsValid ? 'VALID' : 'DATE_VALIDATION_FAILED',
      severity: finalIsValid ? 'info' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateDate', duration, false);
    validationEngine.emit('validationError', { type: 'date', error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: 'Date validation failed',
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Enhanced Currency Validation with Multi-Currency Support
 * @param {any} amount - Amount to validate
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validateCurrency = (amount, options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US', 
    sanitize = true, 
    businessRules = [], 
    context = {},
    currency = 'USD',
    allowNegative = false,
    minAmount = null,
    maxAmount = null,
    maxDecimalPlaces = 2,
    supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
    exchangeRates = null,
    baseCurrency = 'USD'
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    // Input sanitization
    let cleanAmount = amount;
    if (sanitize && typeof amount === 'string') {
      cleanAmount = validationEngine.sanitizeValue(amount, ['number'], context);
    }
    
    // Parse amount
    let parsedAmount;
    
    if (typeof cleanAmount === 'string') {
      // Remove currency symbols and thousand separators
      const numericString = cleanAmount.replace(/[$,€£¥¢₹₩]/g, '').trim();
      parsedAmount = parseFloat(numericString);
    } else if (typeof cleanAmount === 'number') {
      parsedAmount = cleanAmount;
    } else {
      parsedAmount = Number(cleanAmount);
    }
    
    // Basic number validation
    if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
      const duration = Date.now() - startTime;
      validationEngine.updateMetrics('validateCurrency', duration, false);
      
      return {
        isValid: false,
        error: validationEngine.getMessage('invalid_currency_amount', locale),
        code: 'INVALID_AMOUNT',
        severity: 'error',
        input: amount,
        sanitized: cleanAmount
      };
    }
    
    // Currency validation
    const currencyValidation = { isValid: true, violations: [], warnings: [] };
    
    if (!supportedCurrencies.includes(currency)) {
      currencyValidation.isValid = false;
      currencyValidation.violations.push(`Currency ${currency} is not supported`);
    }
    
    // Amount validation
    if (!allowNegative && parsedAmount < 0) {
      currencyValidation.isValid = false;
      currencyValidation.violations.push('Negative amounts are not allowed');
    }
    
    if (minAmount !== null && parsedAmount < minAmount) {
      currencyValidation.isValid = false;
      currencyValidation.violations.push(`Amount must be at least ${minAmount} ${currency}`);
    }
    
    if (maxAmount !== null && parsedAmount > maxAmount) {
      currencyValidation.isValid = false;
      currencyValidation.violations.push(`Amount cannot exceed ${maxAmount} ${currency}`);
    }
    
    // Decimal places validation
    const decimalPlaces = (parsedAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > maxDecimalPlaces) {
      currencyValidation.isValid = false;
      currencyValidation.violations.push(`Too many decimal places (${decimalPlaces}), max allowed: ${maxDecimalPlaces}`);
    }
    
    // Currency formatting
    let formatted = null;
    let convertedAmounts = {};
    
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: maxDecimalPlaces
      });
      formatted = formatter.format(parsedAmount);
      
      // Exchange rate conversions
      if (exchangeRates && currency !== baseCurrency) {
        const baseRate = exchangeRates[currency];
        if (baseRate) {
          const convertedAmount = parsedAmount / baseRate;
          const baseFormatter = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: baseCurrency,
            maximumFractionDigits: maxDecimalPlaces
          });
          convertedAmounts[baseCurrency] = {
            amount: convertedAmount,
            formatted: baseFormatter.format(convertedAmount),
            rate: baseRate
          };
        }
      }
      
    } catch (formatError) {
      currencyValidation.warnings.push('Currency formatting may not be fully supported');
    }
    
    // Thresholds and warnings
    const currencyThresholds = {
      USD: { low: 1000, medium: 10000, high: 100000 },
      EUR: { low: 900, medium: 9000, high: 90000 },
      GBP: { low: 800, medium: 8000, high: 80000 }
    };
    
    const thresholds = currencyThresholds[currency] || currencyThresholds.USD;
    let riskLevel = 'low';
    
    if (parsedAmount >= thresholds.high) {
      riskLevel = 'high';
      currencyValidation.warnings.push('High-value transaction detected');
    } else if (parsedAmount >= thresholds.medium) {
      riskLevel = 'medium';
      currencyValidation.warnings.push('Medium-value transaction');
    }
    
    // Business rules evaluation
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(parsedAmount, businessRules, {
        ...context,
        currency,
        riskLevel,
        formatted,
        convertedAmounts,
        isNegative: parsedAmount < 0,
        decimalPlaces
      });
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = currencyValidation.isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateCurrency', duration, finalIsValid);
    
    // Audit logging
    if (validationEngine.options.enableAuditLogging) {
      validationEngine.emit('validationPerformed', {
        type: 'currency',
        input: amount,
        sanitized: cleanAmount,
        parsed: parsedAmount,
        currency,
        result: finalIsValid,
        riskLevel,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid: finalIsValid,
      error: finalIsValid ? null : validationEngine.getMessage('invalid_currency_amount', locale),
      input: amount,
      sanitized: cleanAmount,
      parsed: parsedAmount,
      currency,
      formatted,
      convertedAmounts,
      riskLevel,
      currencyValidation,
      businessRules: businessRuleResults,
      metadata: {
        validationTime: duration,
        allowNegative,
        minAmount,
        maxAmount,
        maxDecimalPlaces,
        supportedCurrencies,
        locale
      },
      code: finalIsValid ? 'VALID' : 'CURRENCY_VALIDATION_FAILED',
      severity: finalIsValid ? 'info' : 'error'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateCurrency', duration, false);
    validationEngine.emit('validationError', { type: 'currency', error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      error: 'Currency validation failed',
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

/**
 * Enhanced Form Validation with Enterprise Integration
 * @param {object} data - Form data to validate
 * @param {object} schema - Validation schema
 * @param {object} options - Validation options
 * @returns {object} Enhanced validation result
 */
const validateForm = (data, schema, options = {}) => {
  const startTime = Date.now();
  const { 
    locale = 'en-US',
    sanitize = true,
    businessRules = [],
    context = {},
    stopOnFirstError = false,
    returnSanitizedData = true,
    validateNested = true
  } = options;
  
  try {
    validationEngine.metrics.validationsPerformed++;
    
    const errors = {};
    const warnings = {};
    const sanitizedData = {};
    const fieldMetadata = {};
    let isValid = true;
    
    // Validate each field according to schema
    for (const field of Object.keys(schema)) {
      const rules = schema[field];
      const value = data[field];
      let fieldErrors = [];
      let fieldWarnings = [];
      let sanitizedValue = value;
      
      try {
        // Required field validation
        if (rules.required) {
          const validation = validateRequired(value, field, {
            locale,
            sanitize,
            context,
            allowEmptyString: rules.allowEmptyString,
            allowZero: rules.allowZero,
            allowFalse: rules.allowFalse,
            businessRules: rules.businessRules || []
          });
          
          if (!validation.isValid) {
            fieldErrors.push(validation.error);
            isValid = false;
            if (stopOnFirstError) break;
            continue; // Skip other validations if required field is missing
          }
          
          sanitizedValue = validation.sanitized;
          fieldMetadata[field] = { ...validation.metadata };
        }
        
        // Skip type validation if field is empty and not required
        if (!value && !rules.required) {
          if (returnSanitizedData) sanitizedData[field] = sanitizedValue;
          continue;
        }
        
        // Type-specific validation
        switch (rules.type) {
          case 'email':
            const emailValidation = validateEmail(value, {
              locale,
              sanitize,
              context,
              allowInternational: rules.allowInternational,
              businessRules: rules.businessRules || []
            });
            
            if (!emailValidation.isValid) {
              fieldErrors.push(emailValidation.error);
              isValid = false;
            } else {
              sanitizedValue = emailValidation.sanitized;
              if (emailValidation.domain?.warnings?.length) {
                fieldWarnings.push(...emailValidation.domain.warnings);
              }
            }
            break;
            
          case 'phone':
            const phoneValidation = validatePhone(value, {
              locale,
              sanitize,
              context,
              country: rules.country,
              allowMobile: rules.allowMobile,
              allowLandline: rules.allowLandline,
              businessRules: rules.businessRules || []
            });
            
            if (!phoneValidation.isValid) {
              fieldErrors.push(phoneValidation.error);
              isValid = false;
            } else {
              sanitizedValue = phoneValidation.sanitized;
            }
            break;
            
          case 'url':
            const urlValidation = validateUrl(value, {
              locale,
              sanitize,
              context,
              protocols: rules.protocols,
              requireTLD: rules.requireTLD,
              allowLocalhost: rules.allowLocalhost,
              businessRules: rules.businessRules || []
            });
            
            if (!urlValidation.isValid) {
              fieldErrors.push(urlValidation.error);
              isValid = false;
            } else {
              sanitizedValue = urlValidation.sanitized;
              if (urlValidation.domain?.risks?.length) {
                fieldWarnings.push(...urlValidation.domain.risks);
              }
            }
            break;
            
          case 'number':
            const numberValidation = validateNumber(value, {
              locale,
              sanitize,
              context,
              min: rules.min,
              max: rules.max,
              allowDecimals: rules.allowDecimals,
              maxDecimalPlaces: rules.maxDecimalPlaces,
              allowNegative: rules.allowNegative,
              businessRules: rules.businessRules || []
            }, field);
            
            if (!numberValidation.isValid) {
              fieldErrors.push(numberValidation.error);
              isValid = false;
            } else {
              sanitizedValue = numberValidation.parsed;
            }
            break;
            
          case 'score':
            const scoreValidation = validateScore(value, {
              locale,
              sanitize,
              context,
              minScore: rules.minScore,
              maxScore: rules.maxScore,
              scoringMethod: rules.scoringMethod,
              businessRules: rules.businessRules || []
            });
            
            if (!scoreValidation.isValid) {
              fieldErrors.push(scoreValidation.error);
              isValid = false;
            } else {
              sanitizedValue = scoreValidation.parsed;
              if (scoreValidation.scoreValidation?.warnings?.length) {
                fieldWarnings.push(...scoreValidation.scoreValidation.warnings);
              }
            }
            break;
            
          case 'date':
            const dateValidation = validateDate(value, {
              locale,
              sanitize,
              context,
              canBePast: rules.canBePast,
              canBeFuture: rules.canBeFuture,
              min: rules.min,
              max: rules.max,
              format: rules.format,
              businessDaysOnly: rules.businessDaysOnly,
              businessRules: rules.businessRules || []
            });
            
            if (!dateValidation.isValid) {
              fieldErrors.push(dateValidation.error);
              isValid = false;
            } else {
              sanitizedValue = dateValidation.parsed;
            }
            break;
            
          case 'currency':
            const currencyValidation = validateCurrency(value, {
              locale,
              sanitize,
              context,
              currency: rules.currency,
              allowNegative: rules.allowNegative,
              minAmount: rules.minAmount,
              maxAmount: rules.maxAmount,
              maxDecimalPlaces: rules.maxDecimalPlaces,
              businessRules: rules.businessRules || []
            });
            
            if (!currencyValidation.isValid) {
              fieldErrors.push(currencyValidation.error);
              isValid = false;
            } else {
              sanitizedValue = currencyValidation.parsed;
              if (currencyValidation.currencyValidation?.warnings?.length) {
                fieldWarnings.push(...currencyValidation.currencyValidation.warnings);
              }
            }
            break;
        }
        
        // Length validation
        if (rules.minLength && typeof sanitizedValue === 'string') {
          const lengthValidation = validateMinLength(sanitizedValue, rules.minLength, field);
          if (!lengthValidation.isValid) {
            fieldErrors.push(lengthValidation.error);
            isValid = false;
          }
        }
        
        if (rules.maxLength && typeof sanitizedValue === 'string') {
          const lengthValidation = validateMaxLength(sanitizedValue, rules.maxLength, field);
          if (!lengthValidation.isValid) {
            fieldErrors.push(lengthValidation.error);
            isValid = false;
          }
        }
        
        // Pattern validation
        if (rules.pattern && typeof sanitizedValue === 'string') {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(sanitizedValue)) {
            fieldErrors.push(rules.patternError || `${rules.label || field} format is invalid`);
            isValid = false;
          }
        }
        
        // Custom validation function
        if (rules.customValidator && typeof rules.customValidator === 'function') {
          const customResult = rules.customValidator(sanitizedValue, data, context);
          if (!customResult.isValid) {
            fieldErrors.push(customResult.error);
            isValid = false;
          }
          if (customResult.warnings) {
            fieldWarnings.push(...customResult.warnings);
          }
        }
        
        // Store results
        if (fieldErrors.length > 0) {
          errors[field] = fieldErrors;
        }
        
        if (fieldWarnings.length > 0) {
          warnings[field] = fieldWarnings;
        }
        
        if (returnSanitizedData) {
          sanitizedData[field] = sanitizedValue;
        }
        
        if (stopOnFirstError && fieldErrors.length > 0) {
          break;
        }
        
      } catch (fieldError) {
        fieldErrors.push(`Validation error for ${field}: ${fieldError.message}`);
        errors[field] = fieldErrors;
        isValid = false;
        
        if (stopOnFirstError) {
          break;
        }
      }
    }
    
    // Form-level business rules
    let businessRuleResults = { success: true, violations: [], overallValid: true };
    if (businessRules.length > 0) {
      businessRuleResults = validationEngine.evaluateBusinessRules(sanitizedData, businessRules, {
        ...context,
        originalData: data,
        schema,
        errors,
        warnings
      });
      
      if (!businessRuleResults.overallValid) {
        isValid = false;
        if (!errors._form) errors._form = [];
        errors._form.push(...businessRuleResults.violations);
      }
    }
    
    const duration = Date.now() - startTime;
    const finalIsValid = isValid && businessRuleResults.overallValid;
    
    validationEngine.updateMetrics('validateForm', duration, finalIsValid);
    
    // Audit logging
    if (validationEngine.options.enableAuditLogging) {
      validationEngine.emit('validationPerformed', {
        type: 'form',
        fieldCount: Object.keys(schema).length,
        errorCount: Object.keys(errors).length,
        warningCount: Object.keys(warnings).length,
        result: finalIsValid,
        duration,
        timestamp: new Date(),
        context
      });
    }
    
    return {
      isValid: finalIsValid,
      errors,
      warnings,
      sanitizedData: returnSanitizedData ? sanitizedData : undefined,
      businessRules: businessRuleResults,
      fieldMetadata,
      metadata: {
        validationTime: duration,
        fieldsValidated: Object.keys(schema).length,
        errorsFound: Object.keys(errors).length,
        warningsFound: Object.keys(warnings).length,
        stopOnFirstError,
        sanitized: returnSanitizedData
      },
      code: finalIsValid ? 'VALID' : 'FORM_VALIDATION_FAILED',
      severity: finalIsValid ? 'info' : Object.keys(errors).length > 1 ? 'error' : 'warning'
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationEngine.metrics.validationErrors++;
    validationEngine.updateMetrics('validateForm', duration, false);
    validationEngine.emit('validationError', { type: 'form', error: error.message, timestamp: new Date() });
    
    return {
      isValid: false,
      errors: { _form: ['Form validation failed'] },
      warnings: {},
      code: 'VALIDATION_ERROR',
      severity: 'error',
      details: error.message
    };
  }
};

// Initialize the validation engine
const validationEngine = new EnterpriseValidationEngine({
  enableAuditLogging: true,
  enableMetrics: true,
  enableCaching: true,
  cacheSize: 1000,
  securityLevel: 'high',
  defaultLocale: 'en-US'
});

module.exports = {
  // Core validation engine
  validationEngine,
  EnterpriseValidationEngine,
  
  // Enhanced validation functions
  validateEmail,
  validatePhone,
  validateUrl,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumber,
  validateScore,
  validateDate,
  validateCurrency,
  validateForm,
  
  // Engine methods for advanced usage
  createCustomValidator: (name, validatorFn) => validationEngine.addCustomValidator(name, validatorFn),
  addBusinessRule: (name, ruleFn) => validationEngine.addBusinessRule(name, ruleFn),
  setSanitizer: (type, sanitizerFn) => validationEngine.setSanitizer(type, sanitizerFn),
  getMetrics: () => validationEngine.collectMetrics(),
  getStatistics: () => validationEngine.getStatistics(),
  clearCache: () => validationEngine.cache.clear(),
  
  // Constants for convenience
  VALIDATION_CODES: {
    VALID: 'VALID',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_PHONE: 'INVALID_PHONE',
    INVALID_URL: 'INVALID_URL',
    INVALID_NUMBER: 'INVALID_NUMBER',
    INVALID_DATE: 'INVALID_DATE',
    INVALID_CURRENCY: 'INVALID_CURRENCY',
    INVALID_SCORE: 'INVALID_SCORE',
    REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
    MIN_LENGTH_VIOLATION: 'MIN_LENGTH_VIOLATION',
    MAX_LENGTH_VIOLATION: 'MAX_LENGTH_VIOLATION',
    BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
    VALIDATION_ERROR: 'VALIDATION_ERROR'
  },
  
  SEVERITY_LEVELS: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  }
};
