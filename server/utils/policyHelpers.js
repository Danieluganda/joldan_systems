/**
 * Enterprise Policy and Access Control Management System
 * 
 * Comprehensive policy evaluation engine for procurement systems with
 * advanced access control, context-aware permissions, policy inheritance,
 * dynamic policy loading, audit logging, and compliance features
 * 
 * Features:
 * - Context-aware policy evaluation with dynamic conditions
 * - Role-based and attribute-based access control (RBAC/ABAC)
 * - Policy inheritance and hierarchical permissions
 * - Dynamic policy loading and hot-reload capabilities
 * - Advanced caching with TTL and invalidation strategies
 * - Comprehensive audit logging for compliance
 * - Policy versioning and rollback capabilities
 * - Conditional access with time, location, and context constraints
 * - Policy templates and rule builders
 * - Integration with external policy engines
 * - Real-time policy updates and notifications
 * - Performance optimization and monitoring
 * - Policy testing and validation frameworks
 * - Compliance reporting and governance
 */

const { PERMISSIONS, ROLES, hasPermission } = require('../config/permissions');
const crypto = require('crypto');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

// Enhanced policy configuration
const POLICY_CONFIG = {
  enableCaching: process.env.POLICY_CACHE_ENABLED !== 'false',
  cacheTimeout: parseInt(process.env.POLICY_CACHE_TIMEOUT) || 300000, // 5 minutes
  enableAuditLogging: process.env.POLICY_AUDIT_ENABLED !== 'false',
  enableDynamicLoading: process.env.POLICY_DYNAMIC_LOADING !== 'false',
  enableContextEvaluation: process.env.POLICY_CONTEXT_ENABLED !== 'false',
  maxPolicyDepth: parseInt(process.env.POLICY_MAX_DEPTH) || 10,
  policyRefreshInterval: parseInt(process.env.POLICY_REFRESH_INTERVAL) || 60000, // 1 minute
  enablePerformanceTracking: process.env.POLICY_PERFORMANCE_TRACKING !== 'false'
};

// Policy evaluation contexts
const POLICY_CONTEXTS = {
  TIME_OF_DAY: 'timeOfDay',
  DAY_OF_WEEK: 'dayOfWeek',
  IP_ADDRESS: 'ipAddress',
  LOCATION: 'location',
  DEVICE_TYPE: 'deviceType',
  SESSION_DURATION: 'sessionDuration',
  LAST_LOGIN: 'lastLogin',
  RESOURCE_SENSITIVITY: 'resourceSensitivity',
  PROCUREMENT_VALUE: 'procurementValue',
  VENDOR_RELATIONSHIP: 'vendorRelationship',
  APPROVAL_CHAIN: 'approvalChain',
  SECURITY_CLEARANCE: 'securityClearance'
};

// Advanced policy evaluation operators
const POLICY_OPERATORS = {
  EQUALS: 'eq',
  NOT_EQUALS: 'neq',
  GREATER_THAN: 'gt',
  LESS_THAN: 'lt',
  GREATER_EQUAL: 'gte',
  LESS_EQUAL: 'lte',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  IN: 'in',
  NOT_IN: 'not_in',
  MATCHES: 'matches',
  NOT_MATCHES: 'not_matches',
  BETWEEN: 'between',
  NOT_BETWEEN: 'not_between',
  IS_NULL: 'is_null',
  IS_NOT_NULL: 'is_not_null'
};

// Policy decision outcomes
const POLICY_DECISIONS = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  CONDITIONAL: 'CONDITIONAL',
  REQUIRES_MFA: 'REQUIRES_MFA',
  REQUIRES_APPROVAL: 'REQUIRES_APPROVAL',
  AUDIT_ONLY: 'AUDIT_ONLY'
};

// Policy evaluation metrics
const policyMetrics = {
  evaluationsCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageEvaluationTime: 0,
  deniedRequests: 0,
  conditionalRequests: 0,
  mfaRequests: 0,
  lastEvaluationTime: Date.now()
};

/**
 * Enterprise Policy Engine Class
 */
class EnterprisePolicyEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = { ...POLICY_CONFIG, ...options };
    this.policyCache = new Map();
    this.contextProviders = new Map();
    this.policyRules = new Map();
    this.roleHierarchy = new Map();
    this.auditLog = [];
    this.startTime = Date.now();
    
    // Initialize policy engine
    this.initializePolicyEngine();
    
    // Setup periodic tasks
    if (this.config.enableDynamicLoading) {
      this.startPolicyRefresh();
    }
    
    if (this.config.enablePerformanceTracking) {
      this.startPerformanceTracking();
    }
    
    this.emit('initialized', { config: this.config });
  }

  /**
   * Initialize the policy engine with default rules and providers
   */
  async initializePolicyEngine() {
    try {
      // Load default policy rules
      await this.loadDefaultPolicies();
      
      // Setup role hierarchy
      await this.setupRoleHierarchy();
      
      // Register context providers
      this.registerDefaultContextProviders();
      
      // Load external policies if configured
      if (this.config.enableDynamicLoading) {
        await this.loadExternalPolicies();
      }
      
      console.log(`🛡️ Policy engine initialized with ${this.policyRules.size} rules`);

    } catch (error) {
      console.error('Policy engine initialization error:', error);
    }
  }

  /**
   * Load default procurement-specific policies
   */
  async loadDefaultPolicies() {
    const defaultPolicies = [
      {
        id: 'procurement-creation-policy',
        name: 'Procurement Creation Policy',
        resource: 'procurement',
        action: 'create',
        conditions: [
          {
            context: POLICY_CONTEXTS.PROCUREMENT_VALUE,
            operator: POLICY_OPERATORS.LESS_THAN,
            value: 100000,
            decision: POLICY_DECISIONS.ALLOW
          },
          {
            context: POLICY_CONTEXTS.PROCUREMENT_VALUE,
            operator: POLICY_OPERATORS.GREATER_EQUAL,
            value: 100000,
            decision: POLICY_DECISIONS.REQUIRES_APPROVAL
          }
        ],
        requiredRoles: ['PROCUREMENT_OFFICER', 'SENIOR_PROCUREMENT_OFFICER'],
        priority: 100,
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        audit: true
      },
      {
        id: 'high-value-approval-policy',
        name: 'High Value Approval Policy',
        resource: 'procurement',
        action: 'approve',
        conditions: [
          {
            context: POLICY_CONTEXTS.PROCUREMENT_VALUE,
            operator: POLICY_OPERATORS.GREATER_THAN,
            value: 500000,
            decision: POLICY_DECISIONS.REQUIRES_MFA
          },
          {
            context: POLICY_CONTEXTS.TIME_OF_DAY,
            operator: POLICY_OPERATORS.BETWEEN,
            value: [9, 17], // Business hours
            decision: POLICY_DECISIONS.ALLOW
          }
        ],
        requiredRoles: ['SENIOR_MANAGER', 'DIRECTOR'],
        priority: 200,
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        audit: true
      },
      {
        id: 'vendor-evaluation-policy',
        name: 'Vendor Evaluation Policy',
        resource: 'evaluation',
        action: 'create',
        conditions: [
          {
            context: POLICY_CONTEXTS.VENDOR_RELATIONSHIP,
            operator: POLICY_OPERATORS.NOT_EQUALS,
            value: 'BLACKLISTED',
            decision: POLICY_DECISIONS.ALLOW
          },
          {
            context: POLICY_CONTEXTS.SECURITY_CLEARANCE,
            operator: POLICY_OPERATORS.GREATER_EQUAL,
            value: 2,
            decision: POLICY_DECISIONS.ALLOW
          }
        ],
        requiredRoles: ['EVALUATOR', 'SENIOR_EVALUATOR'],
        priority: 150,
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        audit: true
      },
      {
        id: 'audit-access-policy',
        name: 'Audit Access Policy',
        resource: 'audit',
        action: 'view',
        conditions: [
          {
            context: POLICY_CONTEXTS.IP_ADDRESS,
            operator: POLICY_OPERATORS.MATCHES,
            value: '^(10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.)',
            decision: POLICY_DECISIONS.ALLOW
          },
          {
            context: POLICY_CONTEXTS.SESSION_DURATION,
            operator: POLICY_OPERATORS.LESS_THAN,
            value: 28800, // 8 hours
            decision: POLICY_DECISIONS.ALLOW
          }
        ],
        requiredRoles: ['AUDITOR', 'COMPLIANCE_OFFICER', 'ADMIN'],
        priority: 300,
        enabled: true,
        version: '1.0.0',
        createdAt: new Date(),
        audit: true
      }
    ];

    defaultPolicies.forEach(policy => {
      this.policyRules.set(policy.id, policy);
    });
  }

  /**
   * Setup role hierarchy for inherited permissions
   */
  async setupRoleHierarchy() {
    const hierarchy = {
      ADMIN: ['DIRECTOR', 'SENIOR_MANAGER', 'MANAGER', 'SENIOR_PROCUREMENT_OFFICER', 'PROCUREMENT_OFFICER'],
      DIRECTOR: ['SENIOR_MANAGER', 'MANAGER', 'SENIOR_PROCUREMENT_OFFICER', 'PROCUREMENT_OFFICER'],
      SENIOR_MANAGER: ['MANAGER', 'SENIOR_PROCUREMENT_OFFICER', 'PROCUREMENT_OFFICER'],
      MANAGER: ['SENIOR_PROCUREMENT_OFFICER', 'PROCUREMENT_OFFICER'],
      SENIOR_PROCUREMENT_OFFICER: ['PROCUREMENT_OFFICER'],
      COMPLIANCE_OFFICER: ['AUDITOR'],
      SENIOR_EVALUATOR: ['EVALUATOR']
    };

    Object.entries(hierarchy).forEach(([role, inherits]) => {
      this.roleHierarchy.set(role, inherits);
    });
  }

  /**
   * Register default context providers
   */
  registerDefaultContextProviders() {
    // Time-based context provider
    this.contextProviders.set(POLICY_CONTEXTS.TIME_OF_DAY, (req) => {
      return new Date().getHours();
    });

    this.contextProviders.set(POLICY_CONTEXTS.DAY_OF_WEEK, (req) => {
      return new Date().getDay();
    });

    // Request-based context providers
    this.contextProviders.set(POLICY_CONTEXTS.IP_ADDRESS, (req) => {
      return req?.ip || req?.connection?.remoteAddress || 'unknown';
    });

    this.contextProviders.set(POLICY_CONTEXTS.DEVICE_TYPE, (req) => {
      const userAgent = req?.headers?.['user-agent'] || '';
      if (/mobile/i.test(userAgent)) return 'mobile';
      if (/tablet/i.test(userAgent)) return 'tablet';
      return 'desktop';
    });

    // Session-based context providers
    this.contextProviders.set(POLICY_CONTEXTS.SESSION_DURATION, (req) => {
      const sessionStart = req?.session?.startTime || Date.now();
      return Math.floor((Date.now() - sessionStart) / 1000);
    });

    this.contextProviders.set(POLICY_CONTEXTS.LAST_LOGIN, (req) => {
      return req?.user?.lastLogin || null;
    });

    // Resource-based context providers
    this.contextProviders.set(POLICY_CONTEXTS.PROCUREMENT_VALUE, (req, resource) => {
      return resource?.value || resource?.totalValue || 0;
    });

    this.contextProviders.set(POLICY_CONTEXTS.VENDOR_RELATIONSHIP, (req, resource) => {
      return resource?.vendor?.status || 'UNKNOWN';
    });

    this.contextProviders.set(POLICY_CONTEXTS.SECURITY_CLEARANCE, (req) => {
      return req?.user?.securityClearance || 0;
    });
  }

  /**
   * Load external policy files
   */
  async loadExternalPolicies() {
    try {
      const policyDir = path.join(process.cwd(), 'config', 'policies');
      const files = await fs.readdir(policyDir).catch(() => []);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(policyDir, file);
          const policyData = await fs.readFile(filePath, 'utf8');
          const policies = JSON.parse(policyData);
          
          if (Array.isArray(policies)) {
            policies.forEach(policy => {
              this.policyRules.set(policy.id, {
                ...policy,
                source: 'external',
                loadedFrom: file
              });
            });
          }
        }
      }

    } catch (error) {
      console.error('External policy loading error:', error);
    }
  }

  /**
   * Core policy evaluation method
   */
  async evaluatePolicy(user, resource, action, context = {}) {
    const startTime = Date.now();
    let decision = POLICY_DECISIONS.DENY;
    let matchedPolicies = [];
    let evaluationDetails = [];

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(user, resource, action, context);
      
      // Check cache first
      if (this.config.enableCaching && this.policyCache.has(cacheKey)) {
        policyMetrics.cacheHits++;
        const cached = this.policyCache.get(cacheKey);
        
        if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
          return cached.result;
        } else {
          this.policyCache.delete(cacheKey);
        }
      }
      
      policyMetrics.cacheMisses++;

      // Get user roles with inheritance
      const userRoles = this.getUserRolesWithInheritance(user.role || user.roles);
      
      // Find applicable policies
      const applicablePolicies = this.findApplicablePolicies(resource, action, userRoles);
      
      // Evaluate policies in priority order
      for (const policy of applicablePolicies) {
        const evaluation = await this.evaluateSinglePolicy(policy, user, resource, action, context);
        evaluationDetails.push(evaluation);
        
        if (evaluation.matched) {
          matchedPolicies.push(policy);
          
          // Handle different decision types
          if (evaluation.decision === POLICY_DECISIONS.ALLOW) {
            decision = POLICY_DECISIONS.ALLOW;
          } else if (evaluation.decision === POLICY_DECISIONS.REQUIRES_MFA) {
            decision = POLICY_DECISIONS.REQUIRES_MFA;
            break; // MFA requirement takes precedence
          } else if (evaluation.decision === POLICY_DECISIONS.REQUIRES_APPROVAL) {
            decision = POLICY_DECISIONS.REQUIRES_APPROVAL;
          } else if (evaluation.decision === POLICY_DECISIONS.CONDITIONAL) {
            decision = POLICY_DECISIONS.CONDITIONAL;
          }
        }
      }

      // Prepare result
      const result = {
        decision,
        allowed: decision === POLICY_DECISIONS.ALLOW || decision === POLICY_DECISIONS.CONDITIONAL,
        requiresMFA: decision === POLICY_DECISIONS.REQUIRES_MFA,
        requiresApproval: decision === POLICY_DECISIONS.REQUIRES_APPROVAL,
        matchedPolicies: matchedPolicies.map(p => ({
          id: p.id,
          name: p.name,
          priority: p.priority
        })),
        evaluationDetails,
        evaluationTime: Date.now() - startTime,
        evaluatedAt: new Date(),
        cacheKey
      };

      // Cache result
      if (this.config.enableCaching) {
        this.policyCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
      }

      // Audit logging
      if (this.config.enableAuditLogging) {
        await this.logPolicyEvaluation(user, resource, action, context, result);
      }

      // Update metrics
      this.updateEvaluationMetrics(startTime, decision);

      // Emit evaluation event
      this.emit('policyEvaluated', {
        user: user.id || user.username,
        resource: typeof resource === 'string' ? resource : resource?.type,
        action,
        decision,
        evaluationTime: result.evaluationTime
      });

      return result;

    } catch (error) {
      console.error('Policy evaluation error:', error);
      
      // Default to deny on error
      const errorResult = {
        decision: POLICY_DECISIONS.DENY,
        allowed: false,
        error: error.message,
        evaluationTime: Date.now() - startTime,
        evaluatedAt: new Date()
      };

      // Log error evaluation
      if (this.config.enableAuditLogging) {
        await this.logPolicyEvaluation(user, resource, action, context, errorResult);
      }

      return errorResult;
    }
  }

  /**
   * Evaluate a single policy against context
   */
  async evaluateSinglePolicy(policy, user, resource, action, context) {
    try {
      const evaluation = {
        policyId: policy.id,
        policyName: policy.name,
        matched: false,
        decision: POLICY_DECISIONS.DENY,
        conditionsEvaluated: [],
        reason: ''
      };

      // Check if policy is enabled
      if (!policy.enabled) {
        evaluation.reason = 'Policy is disabled';
        return evaluation;
      }

      // Check role requirements
      const userRoles = this.getUserRolesWithInheritance(user.role || user.roles);
      const hasRequiredRole = policy.requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        evaluation.reason = 'User does not have required role';
        return evaluation;
      }

      // Evaluate conditions
      let conditionsMet = true;
      let finalDecision = POLICY_DECISIONS.ALLOW;

      if (policy.conditions && policy.conditions.length > 0) {
        for (const condition of policy.conditions) {
          const conditionResult = await this.evaluateCondition(condition, user, resource, context);
          evaluation.conditionsEvaluated.push(conditionResult);
          
          if (!conditionResult.met) {
            conditionsMet = false;
            evaluation.reason = conditionResult.reason;
            break;
          } else if (conditionResult.decision !== POLICY_DECISIONS.ALLOW) {
            finalDecision = conditionResult.decision;
          }
        }
      }

      if (conditionsMet) {
        evaluation.matched = true;
        evaluation.decision = finalDecision;
        evaluation.reason = 'All conditions met';
      }

      return evaluation;

    } catch (error) {
      return {
        policyId: policy.id,
        policyName: policy.name,
        matched: false,
        decision: POLICY_DECISIONS.DENY,
        error: error.message,
        reason: 'Policy evaluation error'
      };
    }
  }

  /**
   * Evaluate a single condition
   */
  async evaluateCondition(condition, user, resource, context) {
    try {
      // Get context value
      let contextValue;
      
      if (this.contextProviders.has(condition.context)) {
        const provider = this.contextProviders.get(condition.context);
        contextValue = await provider(context.request || {}, resource);
      } else if (context[condition.context] !== undefined) {
        contextValue = context[condition.context];
      } else {
        return {
          met: false,
          reason: `Context '${condition.context}' not available`,
          contextValue: null,
          expectedValue: condition.value
        };
      }

      // Evaluate condition based on operator
      const met = this.evaluateOperator(condition.operator, contextValue, condition.value);
      
      return {
        met,
        decision: met ? (condition.decision || POLICY_DECISIONS.ALLOW) : POLICY_DECISIONS.DENY,
        reason: met ? 'Condition satisfied' : `Condition not met: ${contextValue} ${condition.operator} ${condition.value}`,
        contextValue,
        expectedValue: condition.value,
        operator: condition.operator,
        context: condition.context
      };

    } catch (error) {
      return {
        met: false,
        reason: `Condition evaluation error: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Evaluate operator logic
   */
  evaluateOperator(operator, actualValue, expectedValue) {
    switch (operator) {
      case POLICY_OPERATORS.EQUALS:
        return actualValue === expectedValue;
        
      case POLICY_OPERATORS.NOT_EQUALS:
        return actualValue !== expectedValue;
        
      case POLICY_OPERATORS.GREATER_THAN:
        return Number(actualValue) > Number(expectedValue);
        
      case POLICY_OPERATORS.LESS_THAN:
        return Number(actualValue) < Number(expectedValue);
        
      case POLICY_OPERATORS.GREATER_EQUAL:
        return Number(actualValue) >= Number(expectedValue);
        
      case POLICY_OPERATORS.LESS_EQUAL:
        return Number(actualValue) <= Number(expectedValue);
        
      case POLICY_OPERATORS.CONTAINS:
        return String(actualValue).includes(String(expectedValue));
        
      case POLICY_OPERATORS.NOT_CONTAINS:
        return !String(actualValue).includes(String(expectedValue));
        
      case POLICY_OPERATORS.IN:
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
        
      case POLICY_OPERATORS.NOT_IN:
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
        
      case POLICY_OPERATORS.MATCHES:
        return new RegExp(expectedValue).test(String(actualValue));
        
      case POLICY_OPERATORS.NOT_MATCHES:
        return !new RegExp(expectedValue).test(String(actualValue));
        
      case POLICY_OPERATORS.BETWEEN:
        const [min, max] = Array.isArray(expectedValue) ? expectedValue : [expectedValue[0], expectedValue[1]];
        return Number(actualValue) >= Number(min) && Number(actualValue) <= Number(max);
        
      case POLICY_OPERATORS.NOT_BETWEEN:
        const [minVal, maxVal] = Array.isArray(expectedValue) ? expectedValue : [expectedValue[0], expectedValue[1]];
        return Number(actualValue) < Number(minVal) || Number(actualValue) > Number(maxVal);
        
      case POLICY_OPERATORS.IS_NULL:
        return actualValue == null;
        
      case POLICY_OPERATORS.IS_NOT_NULL:
        return actualValue != null;
        
      default:
        return false;
    }
  }

  /**
   * Find applicable policies for resource and action
   */
  findApplicablePolicies(resource, action, userRoles) {
    const resourceType = typeof resource === 'string' ? resource : resource?.type || 'unknown';
    
    const applicable = Array.from(this.policyRules.values())
      .filter(policy => {
        return policy.enabled &&
               (policy.resource === resourceType || policy.resource === '*') &&
               (policy.action === action || policy.action === '*') &&
               policy.requiredRoles.some(role => userRoles.includes(role));
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Higher priority first

    return applicable;
  }

  /**
   * Get user roles with inheritance
   */
  getUserRolesWithInheritance(userRole) {
    const roles = Array.isArray(userRole) ? userRole : [userRole];
    const allRoles = new Set(roles);
    
    roles.forEach(role => {
      if (this.roleHierarchy.has(role)) {
        this.roleHierarchy.get(role).forEach(inheritedRole => {
          allRoles.add(inheritedRole);
        });
      }
    });
    
    return Array.from(allRoles);
  }

  /**
   * Generate cache key for policy evaluation
   */
  generateCacheKey(user, resource, action, context) {
    const keyData = {
      userId: user.id || user.username,
      userRole: user.role || user.roles,
      resourceType: typeof resource === 'string' ? resource : resource?.type,
      resourceId: resource?.id,
      action,
      contextHash: this.hashObject(context)
    };
    
    return crypto
      .createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Hash object for consistent cache keys
   */
  hashObject(obj) {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(obj, Object.keys(obj || {}).sort()))
      .digest('hex');
  }

  /**
   * Log policy evaluation for audit trail
   */
  async logPolicyEvaluation(user, resource, action, context, result) {
    try {
      const auditEntry = {
        timestamp: new Date(),
        eventType: 'POLICY_EVALUATION',
        userId: user.id || user.username,
        userRole: user.role || user.roles,
        resource: typeof resource === 'string' ? resource : {
          type: resource?.type,
          id: resource?.id,
          sensitive: !!resource?.sensitive
        },
        action,
        decision: result.decision,
        allowed: result.allowed,
        requiresMFA: result.requiresMFA,
        requiresApproval: result.requiresApproval,
        matchedPolicies: result.matchedPolicies?.length || 0,
        evaluationTime: result.evaluationTime,
        sessionId: context.sessionId,
        requestId: context.requestId,
        ipAddress: context.request?.ip,
        userAgent: context.request?.headers?.['user-agent']
      };

      this.auditLog.push(auditEntry);
      
      // Emit audit event
      this.emit('auditLog', auditEntry);

      // Keep audit log size manageable
      if (this.auditLog.length > 10000) {
        this.auditLog = this.auditLog.slice(-5000);
      }

    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  /**
   * Update evaluation metrics
   */
  updateEvaluationMetrics(startTime, decision) {
    const evaluationTime = Date.now() - startTime;
    
    policyMetrics.evaluationsCount++;
    policyMetrics.averageEvaluationTime = Math.round(
      (policyMetrics.averageEvaluationTime + evaluationTime) / 2
    );
    policyMetrics.lastEvaluationTime = Date.now();
    
    switch (decision) {
      case POLICY_DECISIONS.DENY:
        policyMetrics.deniedRequests++;
        break;
      case POLICY_DECISIONS.CONDITIONAL:
        policyMetrics.conditionalRequests++;
        break;
      case POLICY_DECISIONS.REQUIRES_MFA:
        policyMetrics.mfaRequests++;
        break;
    }
  }

  /**
   * Start periodic policy refresh
   */
  startPolicyRefresh() {
    setInterval(async () => {
      try {
        await this.loadExternalPolicies();
        this.emit('policiesRefreshed', { timestamp: new Date() });
      } catch (error) {
        console.error('Policy refresh error:', error);
      }
    }, this.config.policyRefreshInterval);
  }

  /**
   * Start performance tracking
   */
  startPerformanceTracking() {
    setInterval(() => {
      this.emit('performanceMetrics', {
        ...policyMetrics,
        cacheSize: this.policyCache.size,
        policyRulesCount: this.policyRules.size,
        uptime: Date.now() - this.startTime
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Add or update policy rule
   */
  addPolicy(policy) {
    if (!policy.id || !policy.resource || !policy.action) {
      throw new Error('Policy must have id, resource, and action');
    }

    policy.version = policy.version || '1.0.0';
    policy.createdAt = policy.createdAt || new Date();
    policy.enabled = policy.enabled !== false;
    
    this.policyRules.set(policy.id, policy);
    this.clearRelevantCache(policy);
    
    this.emit('policyAdded', policy);
    return policy;
  }

  /**
   * Remove policy rule
   */
  removePolicy(policyId) {
    const policy = this.policyRules.get(policyId);
    if (policy) {
      this.policyRules.delete(policyId);
      this.clearRelevantCache(policy);
      this.emit('policyRemoved', { id: policyId, policy });
      return true;
    }
    return false;
  }

  /**
   * Clear cache entries relevant to a policy
   */
  clearRelevantCache(policy) {
    const keysToDelete = [];
    
    for (const [key, value] of this.policyCache.entries()) {
      // Clear cache if policy could affect the cached evaluation
      if (value.result.matchedPolicies?.some(p => p.id === policy.id)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.policyCache.delete(key));
  }

  /**
   * Get policy engine statistics
   */
  getStatistics() {
    return {
      policies: {
        total: this.policyRules.size,
        enabled: Array.from(this.policyRules.values()).filter(p => p.enabled).length,
        external: Array.from(this.policyRules.values()).filter(p => p.source === 'external').length
      },
      cache: {
        size: this.policyCache.size,
        hitRate: policyMetrics.evaluationsCount > 0 
          ? Math.round((policyMetrics.cacheHits / policyMetrics.evaluationsCount) * 100) 
          : 0
      },
      performance: {
        ...policyMetrics,
        uptime: Date.now() - this.startTime
      },
      roleHierarchy: Object.fromEntries(this.roleHierarchy),
      contextProviders: Array.from(this.contextProviders.keys())
    };
  }

  /**
   * Get audit trail
   */
  getAuditTrail(filters = {}) {
    let filtered = this.auditLog;
    
    if (filters.userId) {
      filtered = filtered.filter(entry => entry.userId === filters.userId);
    }
    
    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action);
    }
    
    if (filters.decision) {
      filtered = filtered.filter(entry => entry.decision === filters.decision);
    }
    
    if (filters.startDate) {
      filtered = filtered.filter(entry => entry.timestamp >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(entry => entry.timestamp <= new Date(filters.endDate));
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }
}

// Create singleton policy engine
const policyEngine = new EnterprisePolicyEngine();

/**
 * Legacy compatibility wrapper with enhanced features
 */
const enhancedPolicyHelpers = {
  // Legacy methods with context awareness
  canCreateProcurement: async (user, context = {}) => {
    const result = await policyEngine.evaluatePolicy(user, 'procurement', 'create', context);
    return result.allowed;
  },

  canApprove: async (user, resource, context = {}) => {
    const result = await policyEngine.evaluatePolicy(user, resource || 'procurement', 'approve', context);
    return result.allowed;
  },

  canEvaluate: async (user, context = {}) => {
    const result = await policyEngine.evaluatePolicy(user, 'evaluation', 'create', context);
    return result.allowed;
  },

  canViewAudit: async (user, context = {}) => {
    const result = await policyEngine.evaluatePolicy(user, 'audit', 'view', context);
    return result.allowed;
  },

  canPublishRFQ: async (user, context = {}) => {
    const result = await policyEngine.evaluatePolicy(user, 'rfq', 'publish', context);
    return result.allowed;
  },

  canManageUsers: async (user, context = {}) => {
    const result = await policyEngine.evaluatePolicy(user, 'user', 'manage', context);
    return result.allowed;
  },

  // Enhanced capability assessment
  getUserCapabilities: async (user, context = {}) => {
    const capabilities = {};
    
    // Evaluate all standard capabilities
    const actions = [
      { key: 'canCreateProcurement', resource: 'procurement', action: 'create' },
      { key: 'canApprove', resource: 'procurement', action: 'approve' },
      { key: 'canEvaluate', resource: 'evaluation', action: 'create' },
      { key: 'canViewAudit', resource: 'audit', action: 'view' },
      { key: 'canPublishRFQ', resource: 'rfq', action: 'publish' },
      { key: 'canManageUsers', resource: 'user', action: 'manage' }
    ];

    await Promise.all(actions.map(async ({ key, resource, action }) => {
      try {
        const result = await policyEngine.evaluatePolicy(user, resource, action, context);
        capabilities[key] = {
          allowed: result.allowed,
          requiresMFA: result.requiresMFA,
          requiresApproval: result.requiresApproval,
          conditions: result.matchedPolicies
        };
      } catch (error) {
        capabilities[key] = {
          allowed: false,
          error: error.message
        };
      }
    }));

    return capabilities;
  },

  // Advanced policy evaluation
  evaluatePolicy: async (user, resource, action, context = {}) => {
    return await policyEngine.evaluatePolicy(user, resource, action, context);
  },

  // Context-aware permission checking
  checkPermissionWithContext: async (user, permission, resource = null, context = {}) => {
    // Map permission to resource/action if needed
    const resourceType = resource?.type || 'general';
    const action = permission.toLowerCase().includes('create') ? 'create' :
                   permission.toLowerCase().includes('approve') ? 'approve' :
                   permission.toLowerCase().includes('view') ? 'view' :
                   permission.toLowerCase().includes('manage') ? 'manage' : 'access';
    
    const result = await policyEngine.evaluatePolicy(user, resourceType, action, context);
    return result;
  },

  // Bulk permission checking
  checkMultiplePermissions: async (user, permissions, context = {}) => {
    const results = {};
    
    await Promise.all(permissions.map(async (perm) => {
      try {
        if (typeof perm === 'string') {
          // Legacy permission check
          results[perm] = hasPermission(user.role || user.roles, perm);
        } else {
          // Enhanced permission check
          const result = await policyEngine.evaluatePolicy(
            user, 
            perm.resource, 
            perm.action, 
            context
          );
          results[`${perm.resource}:${perm.action}`] = result;
        }
      } catch (error) {
        results[perm] = { allowed: false, error: error.message };
      }
    }));
    
    return results;
  },

  // Policy management
  addPolicy: (policy) => policyEngine.addPolicy(policy),
  removePolicy: (policyId) => policyEngine.removePolicy(policyId),
  
  // Monitoring and statistics
  getStatistics: () => policyEngine.getStatistics(),
  getAuditTrail: (filters) => policyEngine.getAuditTrail(filters),
  getMetrics: () => policyEngine.getStatistics().performance,
  
  // Cache management
  clearCache: () => {
    policyEngine.policyCache.clear();
    return true;
  },
  
  // Access to policy engine
  engine: policyEngine,
  
  // Constants
  POLICY_DECISIONS,
  POLICY_CONTEXTS,
  POLICY_OPERATORS,
  
  // Configuration
  config: POLICY_CONFIG
};

module.exports = enhancedPolicyHelpers;
