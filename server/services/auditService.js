const mongoose = require('mongoose');
const crypto = require('crypto');
const geoip = require('geoip-lite');

// Models
const AuditLog = require('../db/models/AuditLog');
const User = require('../db/models/User');

// Services
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

// Constants
const AUDIT_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  APPROVE: 'approve',
  REJECT: 'reject',
  EXPORT: 'export',
  IMPORT: 'import',
  ACCESS: 'access',
  DOWNLOAD: 'download',
  UPLOAD: 'upload'
};

const AUDIT_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  SYSTEM_ADMIN: 'system_admin',
  BUSINESS_PROCESS: 'business_process',
  COMPLIANCE: 'compliance',
  SECURITY: 'security'
};

const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const ENTITY_TYPES = {
  USER: 'user',
  PROCUREMENT: 'procurement',
  CONTRACT: 'contract',
  APPROVAL: 'approval',
  DOCUMENT: 'document',
  RFQ: 'rfq',
  SUBMISSION: 'submission',
  TEMPLATE: 'template',
  AWARD: 'award',
  EVALUATION: 'evaluation'
};

class AuditService {
  /**
   * Create comprehensive audit log entry
   */
  static async logAction(auditData) {
    try {
      const {
        action,
        entityType,
        entityId,
        userId,
        metadata = {},
        ipAddress,
        userAgent,
        sessionId,
        correlationId
      } = auditData;

      // Validate required fields
      if (!action || !entityType || !userId) {
        throw new Error('Missing required audit fields: action, entityType, userId');
      }

      // Get user information for context
      const user = await User.findById(userId).select('username email department roles');
      if (!user) {
        throw new Error('User not found for audit logging');
      }

      // Calculate risk level and category
      const riskLevel = this.calculateRiskLevel(action, entityType, metadata);
      const category = this.categorizeAction(action, entityType);

      // Get geographic information from IP
      let geoLocation = null;
      if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
        const geo = geoip.lookup(ipAddress);
        if (geo) {
          geoLocation = {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            timezone: geo.timezone,
            coordinates: [geo.ll[1], geo.ll[0]] // [longitude, latitude] for GeoJSON
          };
        }
      }

      // Build comprehensive audit entry
      const auditEntry = new AuditLog({
        action,
        entityType,
        entityId: entityId ? new mongoose.Types.ObjectId(entityId) : null,
        userId: new mongoose.Types.ObjectId(userId),
        category,
        riskLevel,
        timestamp: new Date(),
        sessionInfo: {
          sessionId,
          ipAddress,
          userAgent,
          geoLocation
        },
        userInfo: {
          username: user.username,
          email: user.email,
          department: user.department,
          roles: user.roles
        },
        metadata: {
          ...metadata,
          correlationId: correlationId || this.generateCorrelationId(),
          serverTimestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        fingerprint: this.generateFingerprint(auditData),
        complianceFlags: this.assessComplianceFlags(action, entityType, metadata),
        retention: this.calculateRetentionPeriod(category, riskLevel)
      });

      // Save audit entry
      const savedAudit = await auditEntry.save();

      // Real-time processing for high-risk activities
      if (riskLevel === RISK_LEVELS.HIGH || riskLevel === RISK_LEVELS.CRITICAL) {
        await this.processHighRiskActivity(savedAudit);
      }

      // Check for anomalies
      const anomalyDetected = await this.detectAnomalies(userId, action, entityType, metadata);
      if (anomalyDetected) {
        await this.handleAnomalyDetection(savedAudit, anomalyDetected);
      }

      logger.info('Audit log created', {
        auditId: savedAudit._id,
        action,
        entityType,
        userId: user.username,
        riskLevel,
        category
      });

      return savedAudit;

    } catch (error) {
      logger.error('Error creating audit log', {
        error: error.message,
        auditData,
        stack: error.stack
      });
      throw new Error(`Failed to create audit log: ${error.message}`);
    }
  }

  /**
   * Log user authentication events
   */
  static async logAuthentication(userId, action, result, metadata = {}) {
    try {
      const auditData = {
        action: `${action}_${result}`, // login_success, login_failed, etc.
        entityType: ENTITY_TYPES.USER,
        entityId: userId,
        userId,
        metadata: {
          ...metadata,
          authenticationMethod: metadata.authenticationMethod || 'password',
          attemptCount: metadata.attemptCount || 1,
          result,
          timestamp: new Date()
        }
      };

      return await this.logAction(auditData);

    } catch (error) {
      logger.error('Error logging authentication event', { error: error.message });
      throw error;
    }
  }

  /**
   * Log approval workflow events
   */
  static async logApprovalCreated(approval, requesterId, session = null) {
    try {
      const auditData = {
        action: AUDIT_ACTIONS.CREATE,
        entityType: ENTITY_TYPES.APPROVAL,
        entityId: approval._id,
        userId: requesterId,
        metadata: {
          approvalType: approval.type,
          approvalValue: approval.value,
          approvalStatus: approval.status,
          approvalLevel: approval.currentLevel,
          department: approval.department,
          priority: approval.priority
        }
      };

      const auditEntry = await this.logAction(auditData);

      // If part of a transaction, add to session
      if (session) {
        auditEntry.$session(session);
      }

      return auditEntry;

    } catch (error) {
      logger.error('Error logging approval creation', { error: error.message });
      throw error;
    }
  }

  /**
   * Log approval action events (approve/reject)
   */
  static async logApprovalAction(approval, approverId, actionType, actionData, session = null) {
    try {
      const auditData = {
        action: actionType,
        entityType: ENTITY_TYPES.APPROVAL,
        entityId: approval._id,
        userId: approverId,
        metadata: {
          approvalType: approval.type,
          approvalValue: approval.value,
          previousStatus: approval.status,
          newStatus: actionType === AUDIT_ACTIONS.APPROVE ? 'approved' : 'rejected',
          approvalLevel: actionData.level,
          comments: actionData.comments,
          conditions: actionData.conditions,
          department: approval.department
        }
      };

      const auditEntry = await this.logAction(auditData);

      if (session) {
        auditEntry.$session(session);
      }

      return auditEntry;

    } catch (error) {
      logger.error('Error logging approval action', { error: error.message });
      throw error;
    }
  }

  /**
   * Log data access events with detailed tracking
   */
  static async logDataAccess(userId, entityType, entityId, accessType, metadata = {}) {
    try {
      const auditData = {
        action: accessType || AUDIT_ACTIONS.READ,
        entityType,
        entityId,
        userId,
        metadata: {
          ...metadata,
          accessType,
          dataClassification: metadata.dataClassification || 'internal',
          accessMethod: metadata.accessMethod || 'web_ui',
          recordCount: metadata.recordCount || 1
        }
      };

      return await this.logAction(auditData);

    } catch (error) {
      logger.error('Error logging data access', { error: error.message });
      throw error;
    }
  }

  /**
   * Log bulk operations with detailed tracking
   */
  static async logBulkOperation(userId, operationType, entityType, operationData) {
    try {
      const auditData = {
        action: `bulk_${operationType}`,
        entityType,
        entityId: null,
        userId,
        metadata: {
          operationType,
          entityType,
          recordCount: operationData.recordCount || 0,
          successCount: operationData.successCount || 0,
          failureCount: operationData.failureCount || 0,
          duration: operationData.duration,
          filters: operationData.filters,
          affectedIds: operationData.affectedIds?.slice(0, 100) // Limit to first 100 IDs
        }
      };

      return await this.logAction(auditData);

    } catch (error) {
      logger.error('Error logging bulk operation', { error: error.message });
      throw error;
    }
  }

  /**
   * Search audit logs with advanced filtering
   */
  static async searchAuditLogs(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        includeUserDetails = true,
        includeMetadata = true
      } = options;

      // Build aggregation pipeline
      const pipeline = [];

      // Match stage with filters
      const matchStage = {};

      if (filters.userId) {
        matchStage.userId = new mongoose.Types.ObjectId(filters.userId);
      }

      if (filters.entityType) {
        matchStage.entityType = Array.isArray(filters.entityType) 
          ? { $in: filters.entityType }
          : filters.entityType;
      }

      if (filters.action) {
        matchStage.action = Array.isArray(filters.action) 
          ? { $in: filters.action }
          : filters.action;
      }

      if (filters.category) {
        matchStage.category = Array.isArray(filters.category) 
          ? { $in: filters.category }
          : filters.category;
      }

      if (filters.riskLevel) {
        matchStage.riskLevel = Array.isArray(filters.riskLevel) 
          ? { $in: filters.riskLevel }
          : filters.riskLevel;
      }

      if (filters.startDate || filters.endDate) {
        matchStage.timestamp = {};
        if (filters.startDate) matchStage.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.timestamp.$lte = new Date(filters.endDate);
      }

      if (filters.ipAddress) {
        matchStage['sessionInfo.ipAddress'] = filters.ipAddress;
      }

      if (filters.department) {
        matchStage['userInfo.department'] = filters.department;
      }

      if (filters.correlationId) {
        matchStage['metadata.correlationId'] = filters.correlationId;
      }

      pipeline.push({ $match: matchStage });

      // Lookup user details if requested
      if (includeUserDetails) {
        pipeline.push({
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              { $project: { password: 0, refreshTokens: 0 } }
            ]
          }
        });
      }

      // Add computed fields
      pipeline.push({
        $addFields: {
          user: { $arrayElemAt: ['$user', 0] },
          dayOfWeek: { $dayOfWeek: '$timestamp' },
          hour: { $hour: '$timestamp' },
          isWeekend: { $in: [{ $dayOfWeek: '$timestamp' }, [1, 7]] },
          isAfterHours: {
            $or: [
              { $lt: [{ $hour: '$timestamp' }, 8] },
              { $gte: [{ $hour: '$timestamp' }, 18] }
            ]
          }
        }
      });

      // Sort
      const sortStage = {};
      sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
      pipeline.push({ $sort: sortStage });

      // Pagination
      const skip = (page - 1) * limit;
      pipeline.push({ $skip: skip }, { $limit: limit });

      // Project fields based on options
      if (!includeMetadata) {
        pipeline.push({
          $project: {
            metadata: 0,
            'sessionInfo.userAgent': 0
          }
        });
      }

      // Execute aggregation
      const [results, totalCount] = await Promise.all([
        AuditLog.aggregate(pipeline),
        AuditLog.countDocuments(matchStage)
      ]);

      return {
        auditLogs: results,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1,
          itemsPerPage: limit
        },
        filters: filters,
        summary: {
          totalRecords: totalCount,
          pageRecords: results.length,
          searchCriteria: Object.keys(matchStage)
        }
      };

    } catch (error) {
      logger.error('Error searching audit logs', { error: error.message, filters });
      throw new Error(`Failed to search audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit trail for specific entity
   */
  static async getEntityAuditTrail(entityType, entityId, options = {}) {
    try {
      const {
        includeRelated = false,
        startDate,
        endDate,
        actions = []
      } = options;

      const filters = {
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId)
      };

      if (startDate || endDate) {
        filters.timestamp = {};
        if (startDate) filters.timestamp.$gte = new Date(startDate);
        if (endDate) filters.timestamp.$lte = new Date(endDate);
      }

      if (actions.length > 0) {
        filters.action = { $in: actions };
      }

      const auditTrail = await AuditLog.find(filters)
        .populate('userId', 'username email department')
        .sort({ timestamp: 1 })
        .lean();

      // Include related entity activities if requested
      let relatedActivities = [];
      if (includeRelated) {
        relatedActivities = await this.getRelatedActivities(entityType, entityId);
      }

      return {
        entityType,
        entityId,
        totalEvents: auditTrail.length,
        auditTrail,
        relatedActivities,
        timeline: this.buildTimeline(auditTrail),
        summary: this.summarizeAuditTrail(auditTrail)
      };

    } catch (error) {
      logger.error('Error getting entity audit trail', { error: error.message });
      throw new Error(`Failed to get audit trail: ${error.message}`);
    }
  }

  /**
   * Get user activity summary
   */
  static async getUserActivitySummary(userId, period = '30d') {
    try {
      const startDate = this.getDateFromPeriod(period);
      
      const activities = await AuditLog.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              action: '$action',
              entityType: '$entityType'
            },
            count: { $sum: 1 },
            lastActivity: { $max: '$timestamp' },
            riskLevels: { $push: '$riskLevel' }
          }
        },
        {
          $group: {
            _id: null,
            totalActivities: { $sum: '$count' },
            actionBreakdown: {
              $push: {
                action: '$_id.action',
                entityType: '$_id.entityType',
                count: '$count',
                lastActivity: '$lastActivity'
              }
            },
            riskDistribution: { $push: '$riskLevels' }
          }
        }
      ]);

      const summary = activities[0] || {
        totalActivities: 0,
        actionBreakdown: [],
        riskDistribution: []
      };

      // Calculate additional metrics
      const timeDistribution = await this.getTimeDistribution(userId, startDate);
      const securityMetrics = await this.getSecurityMetrics(userId, startDate);

      return {
        userId,
        period,
        ...summary,
        timeDistribution,
        securityMetrics,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error getting user activity summary', { error: error.message });
      throw new Error(`Failed to get user activity summary: ${error.message}`);
    }
  }

  /**
   * Detect compliance violations
   */
  static async detectComplianceViolations(filters = {}) {
    try {
      const violations = [];

      // Check for segregation of duties violations
      const sodViolations = await this.checkSegregationOfDuties(filters);
      violations.push(...sodViolations);

      // Check for unauthorized access patterns
      const unauthorizedAccess = await this.checkUnauthorizedAccess(filters);
      violations.push(...unauthorizedAccess);

      // Check for data retention policy violations
      const retentionViolations = await this.checkRetentionPolicyViolations();
      violations.push(...retentionViolations);

      // Check for approval policy violations
      const approvalViolations = await this.checkApprovalPolicyViolations(filters);
      violations.push(...approvalViolations);

      return {
        totalViolations: violations.length,
        violations: violations,
        categorizedViolations: this.categorizeViolations(violations),
        riskAssessment: this.assessViolationRisk(violations),
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error detecting compliance violations', { error: error.message });
      throw new Error(`Failed to detect compliance violations: ${error.message}`);
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days default
        endDate = new Date(),
        departments = [],
        includeViolations = true,
        includeRecommendations = true
      } = options;

      const filters = {
        timestamp: { $gte: startDate, $lte: endDate }
      };

      if (departments.length > 0) {
        filters['userInfo.department'] = { $in: departments };
      }

      // Get compliance-relevant audit logs
      const complianceLogs = await AuditLog.find({
        ...filters,
        $or: [
          { category: AUDIT_CATEGORIES.COMPLIANCE },
          { riskLevel: { $in: [RISK_LEVELS.HIGH, RISK_LEVELS.CRITICAL] } },
          { 'complianceFlags.requiresReview': true }
        ]
      }).populate('userId', 'username email department roles');

      // Analyze compliance posture
      const complianceAnalysis = {
        totalEvents: complianceLogs.length,
        riskDistribution: this.analyzeRiskDistribution(complianceLogs),
        departmentActivity: this.analyzeDepartmentActivity(complianceLogs),
        timelineAnalysis: this.analyzeComplianceTimeline(complianceLogs),
        userBehaviorAnalysis: this.analyzeUserBehavior(complianceLogs)
      };

      // Detect violations if requested
      let violations = [];
      if (includeViolations) {
        const violationResult = await this.detectComplianceViolations(filters);
        violations = violationResult.violations;
      }

      // Generate recommendations if requested
      let recommendations = [];
      if (includeRecommendations) {
        recommendations = await this.generateComplianceRecommendations(complianceLogs, violations);
      }

      const report = {
        reportId: this.generateReportId(),
        generatedAt: new Date(),
        period: { startDate, endDate },
        scope: { departments: departments.length > 0 ? departments : 'All Departments' },
        complianceAnalysis,
        violations,
        recommendations,
        executiveSummary: {
          overallRiskLevel: this.calculateOverallRisk(complianceLogs),
          criticalViolations: violations.filter(v => v.severity === 'critical').length,
          complianceScore: this.calculateComplianceScore(complianceLogs, violations)
        }
      };

      return report;

    } catch (error) {
      logger.error('Error generating compliance report', { error: error.message });
      throw new Error(`Failed to generate compliance report: ${error.message}`);
    }
  }

  /**
   * Archive old audit logs based on retention policy
   */
  static async archiveOldLogs(dryRun = true) {
    try {
      const retentionPolicies = {
        [RISK_LEVELS.CRITICAL]: 7 * 365, // 7 years
        [RISK_LEVELS.HIGH]: 5 * 365, // 5 years
        [RISK_LEVELS.MEDIUM]: 3 * 365, // 3 years
        [RISK_LEVELS.LOW]: 1 * 365 // 1 year
      };

      const archiveResults = [];

      for (const [riskLevel, retentionDays] of Object.entries(retentionPolicies)) {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        
        const logsToArchive = await AuditLog.find({
          riskLevel,
          timestamp: { $lt: cutoffDate },
          archived: { $ne: true }
        });

        if (!dryRun && logsToArchive.length > 0) {
          await AuditLog.updateMany(
            {
              _id: { $in: logsToArchive.map(log => log._id) }
            },
            {
              $set: {
                archived: true,
                archivedAt: new Date(),
                archivedReason: 'retention_policy'
              }
            }
          );
        }

        archiveResults.push({
          riskLevel,
          retentionDays,
          cutoffDate,
          logsToArchive: logsToArchive.length,
          archived: !dryRun
        });
      }

      logger.info('Audit log archival completed', {
        dryRun,
        results: archiveResults,
        totalLogsProcessed: archiveResults.reduce((sum, result) => sum + result.logsToArchive, 0)
      });

      return {
        dryRun,
        results: archiveResults,
        totalLogsProcessed: archiveResults.reduce((sum, result) => sum + result.logsToArchive, 0),
        archivedAt: new Date()
      };

    } catch (error) {
      logger.error('Error archiving audit logs', { error: error.message });
      throw new Error(`Failed to archive audit logs: ${error.message}`);
    }
  }

  // Risk assessment and categorization methods
  static calculateRiskLevel(action, entityType, metadata = {}) {
    let riskScore = 0;

    // Base risk by action
    const actionRisk = {
      [AUDIT_ACTIONS.DELETE]: 5,
      [AUDIT_ACTIONS.APPROVE]: 4,
      [AUDIT_ACTIONS.REJECT]: 4,
      [AUDIT_ACTIONS.CREATE]: 3,
      [AUDIT_ACTIONS.UPDATE]: 2,
      [AUDIT_ACTIONS.EXPORT]: 3,
      [AUDIT_ACTIONS.READ]: 1,
      [AUDIT_ACTIONS.LOGIN]: 1
    };

    riskScore += actionRisk[action] || 2;

    // Entity type risk multiplier
    const entityRisk = {
      [ENTITY_TYPES.USER]: 2.0,
      [ENTITY_TYPES.CONTRACT]: 1.8,
      [ENTITY_TYPES.PROCUREMENT]: 1.6,
      [ENTITY_TYPES.APPROVAL]: 1.4,
      [ENTITY_TYPES.DOCUMENT]: 1.2
    };

    riskScore *= entityRisk[entityType] || 1.0;

    // Value-based risk adjustment
    if (metadata.value) {
      if (metadata.value >= 1000000) riskScore += 3;
      else if (metadata.value >= 100000) riskScore += 2;
      else if (metadata.value >= 10000) riskScore += 1;
    }

    // Time-based risk adjustment (after hours, weekends)
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    if (hour < 8 || hour > 18) riskScore += 1; // After hours
    if (dayOfWeek === 0 || dayOfWeek === 6) riskScore += 1; // Weekends

    // Critical metadata flags
    if (metadata.emergency) riskScore += 2;
    if (metadata.override) riskScore += 2;
    if (metadata.bulkOperation) riskScore += 1;

    // Convert score to risk level
    if (riskScore >= 10) return RISK_LEVELS.CRITICAL;
    if (riskScore >= 7) return RISK_LEVELS.HIGH;
    if (riskScore >= 4) return RISK_LEVELS.MEDIUM;
    return RISK_LEVELS.LOW;
  }

  static categorizeAction(action, entityType) {
    if (action.includes('login') || action.includes('logout')) {
      return AUDIT_CATEGORIES.AUTHENTICATION;
    }
    
    if (action.includes('permission') || action.includes('role')) {
      return AUDIT_CATEGORIES.AUTHORIZATION;
    }

    if (['create', 'update', 'delete'].includes(action)) {
      return AUDIT_CATEGORIES.DATA_MODIFICATION;
    }

    if (['read', 'access', 'download'].includes(action)) {
      return AUDIT_CATEGORIES.DATA_ACCESS;
    }

    if (action.includes('approve') || action.includes('reject')) {
      return AUDIT_CATEGORIES.BUSINESS_PROCESS;
    }

    if (entityType === 'system' || action.includes('admin')) {
      return AUDIT_CATEGORIES.SYSTEM_ADMIN;
    }

    return AUDIT_CATEGORIES.BUSINESS_PROCESS;
  }

  static assessComplianceFlags(action, entityType, metadata) {
    const flags = {
      requiresReview: false,
      retentionRequired: false,
      sensitiveData: false,
      financialImpact: false,
      personalData: false
    };

    // High-risk actions require review
    if (['delete', 'approve', 'reject'].includes(action)) {
      flags.requiresReview = true;
    }

    // Financial transactions
    if (metadata.value || entityType === 'procurement' || entityType === 'contract') {
      flags.financialImpact = true;
      flags.retentionRequired = true;
    }

    // Personal data handling
    if (entityType === 'user' || metadata.containsPersonalData) {
      flags.personalData = true;
      flags.sensitiveData = true;
    }

    // Sensitive documents
    if (metadata.classification === 'confidential' || metadata.classification === 'secret') {
      flags.sensitiveData = true;
      flags.retentionRequired = true;
    }

    return flags;
  }

  static calculateRetentionPeriod(category, riskLevel) {
    const baseRetention = {
      [AUDIT_CATEGORIES.SECURITY]: 7 * 365, // 7 years
      [AUDIT_CATEGORIES.COMPLIANCE]: 7 * 365, // 7 years
      [AUDIT_CATEGORIES.AUTHORIZATION]: 5 * 365, // 5 years
      [AUDIT_CATEGORIES.DATA_MODIFICATION]: 3 * 365, // 3 years
      [AUDIT_CATEGORIES.BUSINESS_PROCESS]: 5 * 365, // 5 years
      [AUDIT_CATEGORIES.DATA_ACCESS]: 1 * 365 // 1 year
    };

    const riskMultiplier = {
      [RISK_LEVELS.CRITICAL]: 2,
      [RISK_LEVELS.HIGH]: 1.5,
      [RISK_LEVELS.MEDIUM]: 1,
      [RISK_LEVELS.LOW]: 0.5
    };

    const baseDays = baseRetention[category] || 365; // Default 1 year
    const multiplier = riskMultiplier[riskLevel] || 1;

    return Math.ceil(baseDays * multiplier);
  }

  // Utility methods
  static generateCorrelationId() {
    return `CORR-${Date.now()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  }

  static generateReportId() {
    return `RPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  static generateFingerprint(auditData) {
    const fingerprintData = `${auditData.action}:${auditData.entityType}:${auditData.userId}:${auditData.ipAddress}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
  }

  static getDateFromPeriod(period) {
    const days = parseInt(period.replace('d', '')) || 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  // Anomaly detection methods
  static async detectAnomalies(userId, action, entityType, metadata) {
    try {
      // Simple anomaly detection based on user behavior patterns
      const recentActivity = await AuditLog.find({
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      const currentHour = new Date().getHours();
      const userHours = recentActivity.map(log => new Date(log.timestamp).getHours());
      const typicalHours = this.getMostCommonHours(userHours);

      // Check for unusual time access
      if (!typicalHours.includes(currentHour) && (currentHour < 8 || currentHour > 18)) {
        return {
          type: 'unusual_time_access',
          severity: 'medium',
          description: 'User accessing system outside typical hours'
        };
      }

      // Check for high-volume activity
      const todayActivity = recentActivity.filter(log => {
        const logDate = new Date(log.timestamp);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
      });

      if (todayActivity.length > 100) { // Threshold for high activity
        return {
          type: 'high_volume_activity',
          severity: 'high',
          description: 'Unusually high activity volume detected'
        };
      }

      return null;

    } catch (error) {
      logger.error('Error detecting anomalies', { error: error.message });
      return null;
    }
  }

  static async processHighRiskActivity(auditEntry) {
    try {
      // Send immediate notification for critical risk activities
      if (auditEntry.riskLevel === RISK_LEVELS.CRITICAL) {
        await notificationService.sendNotification({
          type: 'critical_audit_activity',
          title: 'Critical Risk Activity Detected',
          message: `High-risk ${auditEntry.action} on ${auditEntry.entityType} by ${auditEntry.userInfo.username}`,
          priority: 'critical',
          recipients: await this.getSecurityOfficers(),
          data: {
            auditId: auditEntry._id,
            action: auditEntry.action,
            entityType: auditEntry.entityType,
            user: auditEntry.userInfo.username,
            riskLevel: auditEntry.riskLevel
          }
        });
      }

      // Log the high-risk processing
      logger.warn('High-risk audit activity processed', {
        auditId: auditEntry._id,
        riskLevel: auditEntry.riskLevel,
        action: auditEntry.action,
        user: auditEntry.userInfo.username
      });

    } catch (error) {
      logger.error('Error processing high-risk activity', { error: error.message });
    }
  }

  static async handleAnomalyDetection(auditEntry, anomaly) {
    try {
      // Update audit entry with anomaly information
      await AuditLog.findByIdAndUpdate(auditEntry._id, {
        $set: {
          'metadata.anomaly': anomaly,
          'complianceFlags.anomalyDetected': true
        }
      });

      // Send notification for significant anomalies
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        await notificationService.sendNotification({
          type: 'anomaly_detected',
          title: 'Security Anomaly Detected',
          message: `${anomaly.description} - User: ${auditEntry.userInfo.username}`,
          priority: anomaly.severity,
          recipients: await this.getSecurityOfficers(),
          data: {
            auditId: auditEntry._id,
            anomalyType: anomaly.type,
            severity: anomaly.severity,
            user: auditEntry.userInfo.username
          }
        });
      }

    } catch (error) {
      logger.error('Error handling anomaly detection', { error: error.message });
    }
  }

  static getMostCommonHours(hours) {
    const hourCounts = hours.reduce((counts, hour) => {
      counts[hour] = (counts[hour] || 0) + 1;
      return counts;
    }, {});

    const sortedHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8) // Top 8 most common hours
      .map(([hour]) => parseInt(hour));

    return sortedHours;
  }

  static async getSecurityOfficers() {
    try {
      const officers = await User.find({
        roles: { $in: ['security_officer', 'audit_manager', 'admin'] },
        status: 'active'
      }).select('_id');
      
      return officers.map(officer => officer._id);
    } catch (error) {
      logger.error('Error getting security officers', { error: error.message });
      return [];
    }
  }

  // Placeholder methods for advanced analytics (to be implemented)
  static buildTimeline(auditTrail) { return []; }
  static summarizeAuditTrail(auditTrail) { return {}; }
  static getRelatedActivities(entityType, entityId) { return []; }
  static getTimeDistribution(userId, startDate) { return {}; }
  static getSecurityMetrics(userId, startDate) { return {}; }
  static checkSegregationOfDuties(filters) { return []; }
  static checkUnauthorizedAccess(filters) { return []; }
  static checkRetentionPolicyViolations() { return []; }
  static checkApprovalPolicyViolations(filters) { return []; }
  static categorizeViolations(violations) { return {}; }
  static assessViolationRisk(violations) { return {}; }
  static analyzeRiskDistribution(logs) { return {}; }
  static analyzeDepartmentActivity(logs) { return {}; }
  static analyzeComplianceTimeline(logs) { return {}; }
  static analyzeUserBehavior(logs) { return {}; }
  static generateComplianceRecommendations(logs, violations) { return []; }
  static calculateOverallRisk(logs) { return RISK_LEVELS.MEDIUM; }
  static calculateComplianceScore(logs, violations) { return 85; }
}

module.exports = AuditService;
