/**
 * Audit Pack Service
 * 
 * Advanced audit trail generation, compliance reporting, and security monitoring
 * Feature 11: Comprehensive audit trail logging with analytics and compliance
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Models
const AuditLog = require('../db/models/AuditLog');
const User = require('../db/models/User');
const Procurement = require('../db/models/Procurement');

// Services
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

// Constants
const AUDIT_CATEGORIES = {
  SECURITY: 'security',
  COMPLIANCE: 'compliance',
  OPERATIONAL: 'operational',
  FINANCIAL: 'financial',
  ADMINISTRATIVE: 'administrative'
};

const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const AUDIT_TYPES = {
  ENTITY_AUDIT: 'entity_audit',
  USER_AUDIT: 'user_audit',
  COMPLIANCE_AUDIT: 'compliance_audit',
  SECURITY_AUDIT: 'security_audit',
  FINANCIAL_AUDIT: 'financial_audit',
  COMPREHENSIVE_AUDIT: 'comprehensive_audit'
};

class AuditPackService {
  /**
   * Generate comprehensive entity audit with detailed analysis
   */
  static async generateEntityAudit(entityType, entityId, options = {}) {
    try {
      const {
        startDate,
        endDate,
        includeDetails = true,
        includeAnalytics = true,
        includeTimeline = true,
        includeUsers = true,
        format = 'json'
      } = options;

      // Build query filters
      const filters = { 
        entityType: entityType.toLowerCase(),
        entityId: new mongoose.Types.ObjectId(entityId)
      };

      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate);
        if (endDate) filters.createdAt.$lte = new Date(endDate);
      }

      // Get audit logs with detailed information
      const logs = await AuditLog.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $addFields: {
            user: { $arrayElemAt: ['$userInfo', 0] },
            riskScore: this.calculateActionRiskScore('$action', '$entityType')
          }
        },
        {
          $project: {
            'userInfo.password': 0,
            'userInfo.refreshTokens': 0
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      // Generate analytics
      let analytics = {};
      if (includeAnalytics) {
        analytics = await this.generateEntityAnalytics(logs, entityType, entityId);
      }

      // Generate timeline
      let timeline = [];
      if (includeTimeline) {
        timeline = this.generateAuditTimeline(logs);
      }

      // Get entity details
      const entityDetails = await this.getEntityDetails(entityType, entityId);

      // Build comprehensive report
      const report = {
        auditId: this.generateAuditId(),
        generatedAt: new Date(),
        auditType: AUDIT_TYPES.ENTITY_AUDIT,
        entity: {
          type: entityType,
          id: entityId,
          details: entityDetails
        },
        period: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          actualRange: {
            earliest: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
            latest: logs.length > 0 ? logs[0].createdAt : null
          }
        },
        summary: {
          totalActions: logs.length,
          uniqueUsers: new Set(logs.map(l => l.userId.toString())).size,
          actionTypes: this.countActions(logs),
          riskProfile: this.calculateRiskProfile(logs),
          complianceScore: this.calculateComplianceScore(logs)
        },
        analytics,
        timeline,
        logs: includeDetails ? logs : logs.slice(0, 100), // Limit logs if details not requested
        metadata: {
          includeDetails,
          includeAnalytics,
          includeTimeline,
          includeUsers,
          format
        }
      };

      // Format output based on requested format
      if (format === 'pdf') {
        return await this.generatePDFReport(report);
      } else if (format === 'excel') {
        return await this.generateExcelReport(report);
      }

      // Log audit generation
      await this.logAuditGeneration(AUDIT_TYPES.ENTITY_AUDIT, { entityType, entityId }, options);

      return report;

    } catch (error) {
      logger.error('Error generating entity audit', { 
        entityType, 
        entityId, 
        error: error.message,
        stack: error.stack 
      });
      throw new Error(`Failed to generate entity audit: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive user audit with activity analysis
   */
  static async generateUserAudit(userId, options = {}) {
    try {
      const {
        startDate,
        endDate,
        includeSecurityEvents = true,
        includeSystemAccess = true,
        includeDataChanges = true,
        includePermissionChanges = true,
        riskThreshold = RISK_LEVELS.MEDIUM,
        format = 'json'
      } = options;

      // Build filters
      const filters = { userId: new mongoose.Types.ObjectId(userId) };
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate);
        if (endDate) filters.createdAt.$lte = new Date(endDate);
      }

      // Get user information
      const user = await User.findById(userId).select('-password -refreshTokens');
      if (!user) {
        throw new Error('User not found');
      }

      // Get comprehensive audit logs
      const logs = await AuditLog.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: 'users',
            localField: 'targetUserId',
            foreignField: '_id',
            as: 'targetUserInfo'
          }
        },
        {
          $addFields: {
            targetUser: { $arrayElemAt: ['$targetUserInfo', 0] },
            riskScore: this.calculateActionRiskScore('$action', '$entityType'),
            category: this.categorizeAuditAction('$action', '$entityType')
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      // Filter based on options
      let filteredLogs = logs;
      if (!includeSecurityEvents) {
        filteredLogs = filteredLogs.filter(log => log.category !== AUDIT_CATEGORIES.SECURITY);
      }

      // Generate user activity analytics
      const analytics = await this.generateUserAnalytics(filteredLogs, userId);

      // Generate security profile
      const securityProfile = await this.generateUserSecurityProfile(filteredLogs, userId);

      // Generate compliance assessment
      const complianceAssessment = await this.generateUserComplianceAssessment(filteredLogs, user);

      // Build report
      const report = {
        auditId: this.generateAuditId(),
        generatedAt: new Date(),
        auditType: AUDIT_TYPES.USER_AUDIT,
        user: {
          id: userId,
          username: user.username,
          email: user.email,
          department: user.department,
          roles: user.roles,
          lastLogin: user.lastLogin,
          accountCreated: user.createdAt
        },
        period: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          actualRange: {
            earliest: filteredLogs.length > 0 ? filteredLogs[filteredLogs.length - 1].createdAt : null,
            latest: filteredLogs.length > 0 ? filteredLogs[0].createdAt : null
          }
        },
        summary: {
          totalActions: filteredLogs.length,
          actionsByCategory: this.groupByCategory(filteredLogs),
          riskProfile: this.calculateRiskProfile(filteredLogs),
          mostActiveHour: this.findMostActiveHour(filteredLogs),
          deviceCount: this.countUniqueDevices(filteredLogs),
          locationCount: this.countUniqueLocations(filteredLogs)
        },
        analytics,
        securityProfile,
        complianceAssessment,
        logs: filteredLogs,
        recommendations: await this.generateUserRecommendations(filteredLogs, user),
        metadata: {
          includeSecurityEvents,
          includeSystemAccess,
          includeDataChanges,
          includePermissionChanges,
          riskThreshold,
          format
        }
      };

      // Format output
      if (format === 'pdf') {
        return await this.generatePDFReport(report);
      } else if (format === 'excel') {
        return await this.generateExcelReport(report);
      }

      // Log audit generation
      await this.logAuditGeneration(AUDIT_TYPES.USER_AUDIT, { userId }, options);

      return report;

    } catch (error) {
      logger.error('Error generating user audit', { 
        userId, 
        error: error.message,
        stack: error.stack 
      });
      throw new Error(`Failed to generate user audit: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive compliance audit with regulatory analysis
   */
  static async generateComplianceAudit(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default: 90 days
        endDate = new Date(),
        departments = [],
        complianceFrameworks = ['SOX', 'GDPR', 'HIPAA', 'ISO27001'],
        includeRecommendations = true,
        includeRiskAssessment = true,
        includeMetrics = true,
        format = 'json'
      } = options;

      // Build comprehensive filters
      const filters = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (departments.length > 0) {
        filters['metadata.department'] = { $in: departments };
      }

      // Get all audit logs for the period
      const logs = await AuditLog.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $addFields: {
            user: { $arrayElemAt: ['$userInfo', 0] },
            riskScore: this.calculateActionRiskScore('$action', '$entityType'),
            category: this.categorizeAuditAction('$action', '$entityType'),
            complianceRelevance: this.assessComplianceRelevance('$action', '$entityType')
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      // Generate comprehensive analytics
      const analytics = await this.generateComplianceAnalytics(logs, complianceFrameworks);

      // Generate risk assessment
      let riskAssessment = {};
      if (includeRiskAssessment) {
        riskAssessment = await this.generateRiskAssessment(logs);
      }

      // Generate compliance metrics
      let metrics = {};
      if (includeMetrics) {
        metrics = await this.generateComplianceMetrics(logs, complianceFrameworks);
      }

      // Generate recommendations
      let recommendations = [];
      if (includeRecommendations) {
        recommendations = await this.generateComplianceRecommendations(logs, analytics);
      }

      // Identify violations and anomalies
      const violations = await this.identifyComplianceViolations(logs);
      const anomalies = await this.detectAnomalies(logs);

      // Build comprehensive compliance report
      const report = {
        auditId: this.generateAuditId(),
        generatedAt: new Date(),
        auditType: AUDIT_TYPES.COMPLIANCE_AUDIT,
        period: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          durationDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        },
        scope: {
          departments: departments.length > 0 ? departments : 'All Departments',
          complianceFrameworks,
          totalLogs: logs.length,
          uniqueUsers: new Set(logs.map(l => l.userId.toString())).size
        },
        executive_summary: {
          overallComplianceScore: this.calculateOverallComplianceScore(metrics),
          criticalFindings: violations.filter(v => v.severity === 'critical').length,
          recommendationsCount: recommendations.length,
          riskLevel: this.calculateOverallRiskLevel(riskAssessment)
        },
        analytics,
        riskAssessment,
        metrics,
        violations,
        anomalies,
        recommendations,
        detailed_findings: {
          userActivity: this.groupByUser(logs),
          entityActivity: this.groupByEntity(logs),
          timeDistribution: this.analyzeTimeDistribution(logs),
          geographicDistribution: this.analyzeGeographicDistribution(logs)
        },
        appendices: {
          criticalActions: this.filterCriticalActions(logs),
          failedAttempts: this.filterFailedAttempts(logs),
          privilegedAccess: this.filterPrivilegedAccess(logs)
        },
        metadata: {
          generatedBy: 'AuditPackService',
          reportVersion: '2.0',
          complianceStandards: complianceFrameworks,
          includeRecommendations,
          includeRiskAssessment,
          includeMetrics,
          format
        }
      };

      // Format output
      if (format === 'pdf') {
        return await this.generatePDFReport(report);
      } else if (format === 'excel') {
        return await this.generateExcelReport(report);
      }

      // Log compliance audit generation
      await this.logAuditGeneration(AUDIT_TYPES.COMPLIANCE_AUDIT, { 
        startDate, 
        endDate, 
        departments, 
        complianceFrameworks 
      }, options);

      // Send notifications for critical findings
      if (violations.filter(v => v.severity === 'critical').length > 0) {
        await this.notifyCriticalFindings(report);
      }

      return report;

    } catch (error) {
      logger.error('Error generating compliance audit', { 
        error: error.message,
        stack: error.stack 
      });
      throw new Error(`Failed to generate compliance audit: ${error.message}`);
    }
  }

  /**
   * Generate security-focused audit with threat analysis
   */
  static async generateSecurityAudit(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: 30 days
        endDate = new Date(),
        includeFailedAttempts = true,
        includePrivilegedActions = true,
        includeThreatAnalysis = true,
        riskThreshold = RISK_LEVELS.MEDIUM
      } = options;

      // Security-focused filters
      const securityActions = [
        'login_failed', 'login_success', 'logout', 'password_change',
        'permission_change', 'role_change', 'account_lock', 'account_unlock',
        'admin_access', 'data_export', 'system_config_change', 'backup_access'
      ];

      const logs = await AuditLog.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        $or: [
          { action: { $in: securityActions } },
          { 'metadata.securityRelevant': true },
          { riskLevel: { $in: [RISK_LEVELS.HIGH, RISK_LEVELS.CRITICAL] } }
        ]
      }).populate('userId', 'username email department');

      // Analyze security events
      const securityAnalysis = {
        failedLoginAttempts: this.analyzeFailedLogins(logs),
        privilegedAccess: this.analyzePrivilegedAccess(logs),
        suspiciousActivity: this.detectSuspiciousActivity(logs),
        threatIndicators: includeThreatAnalysis ? await this.analyzeThreatIndicators(logs) : null
      };

      const report = {
        auditId: this.generateAuditId(),
        generatedAt: new Date(),
        auditType: AUDIT_TYPES.SECURITY_AUDIT,
        period: { startDate: new Date(startDate), endDate: new Date(endDate) },
        summary: {
          totalSecurityEvents: logs.length,
          criticalEvents: logs.filter(l => l.riskLevel === RISK_LEVELS.CRITICAL).length,
          uniqueUsers: new Set(logs.map(l => l.userId.toString())).size
        },
        securityAnalysis,
        recommendations: await this.generateSecurityRecommendations(securityAnalysis),
        logs: logs
      };

      await this.logAuditGeneration(AUDIT_TYPES.SECURITY_AUDIT, { startDate, endDate }, options);
      
      return report;

    } catch (error) {
      logger.error('Error generating security audit', { error: error.message });
      throw new Error(`Failed to generate security audit: ${error.message}`);
    }
  }

  /**
   * Generate financial audit focused on procurement and contracts
   */
  static async generateFinancialAudit(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Default: 1 year
        endDate = new Date(),
        minimumValue = 0,
        includeContracts = true,
        includeProcurements = true,
        includeApprovals = true
      } = options;

      // Financial-related entity types
      const financialEntityTypes = ['procurement', 'contract', 'award', 'approval', 'budget'];
      
      const logs = await AuditLog.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            entityType: { $in: financialEntityTypes }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $addFields: {
            user: { $arrayElemAt: ['$userInfo', 0] },
            financialValue: { $toDouble: { $ifNull: ['$metadata.value', 0] } }
          }
        },
        {
          $match: {
            financialValue: { $gte: minimumValue }
          }
        }
      ]);

      // Analyze financial patterns
      const financialAnalysis = {
        totalValue: logs.reduce((sum, log) => sum + (log.financialValue || 0), 0),
        transactionsByType: this.groupByEntityType(logs),
        approvalPatterns: this.analyzeApprovalPatterns(logs),
        valueDistribution: this.analyzeValueDistribution(logs),
        complianceChecks: this.performFinancialComplianceChecks(logs)
      };

      const report = {
        auditId: this.generateAuditId(),
        generatedAt: new Date(),
        auditType: AUDIT_TYPES.FINANCIAL_AUDIT,
        period: { startDate: new Date(startDate), endDate: new Date(endDate) },
        scope: { minimumValue, includeContracts, includeProcurements, includeApprovals },
        summary: {
          totalTransactions: logs.length,
          totalValue: financialAnalysis.totalValue,
          averageValue: logs.length > 0 ? financialAnalysis.totalValue / logs.length : 0,
          highValueTransactions: logs.filter(l => l.financialValue > 100000).length
        },
        financialAnalysis,
        recommendations: await this.generateFinancialRecommendations(financialAnalysis),
        logs: logs
      };

      await this.logAuditGeneration(AUDIT_TYPES.FINANCIAL_AUDIT, { startDate, endDate, minimumValue }, options);
      
      return report;

    } catch (error) {
      logger.error('Error generating financial audit', { error: error.message });
      throw new Error(`Failed to generate financial audit: ${error.message}`);
    }
  }

  // Analytics and calculation methods
  static async generateEntityAnalytics(logs, entityType, entityId) {
    return {
      actionFrequency: this.calculateActionFrequency(logs),
      userInvolvement: this.analyzeUserInvolvement(logs),
      timePatterns: this.analyzeTimePatterns(logs),
      riskAssessment: this.assessEntityRisk(logs, entityType)
    };
  }

  static async generateUserAnalytics(logs, userId) {
    return {
      activityPatterns: this.analyzeActivityPatterns(logs),
      entityInteractions: this.analyzeEntityInteractions(logs),
      behaviorProfile: this.generateBehaviorProfile(logs),
      productivityMetrics: this.calculateProductivityMetrics(logs)
    };
  }

  static async generateComplianceAnalytics(logs, frameworks) {
    const analytics = {};
    
    for (const framework of frameworks) {
      analytics[framework] = {
        score: this.calculateFrameworkScore(logs, framework),
        violations: this.identifyFrameworkViolations(logs, framework),
        recommendations: this.getFrameworkRecommendations(logs, framework)
      };
    }
    
    return analytics;
  }

  // Risk calculation methods
  static calculateActionRiskScore(action, entityType) {
    const riskMatrix = {
      'delete': 5,
      'approve': 4,
      'reject': 4,
      'create': 3,
      'update': 2,
      'view': 1,
      'login': 1
    };

    const entityRiskMultiplier = {
      'user': 2,
      'contract': 1.8,
      'procurement': 1.6,
      'approval': 1.4,
      'document': 1.2
    };

    const baseScore = riskMatrix[action] || 2;
    const multiplier = entityRiskMultiplier[entityType] || 1;
    
    return Math.min(baseScore * multiplier, 10);
  }

  static calculateRiskProfile(logs) {
    if (logs.length === 0) return { level: RISK_LEVELS.LOW, score: 0 };

    const totalRisk = logs.reduce((sum, log) => sum + (log.riskScore || 0), 0);
    const averageRisk = totalRisk / logs.length;

    let level;
    if (averageRisk >= 8) level = RISK_LEVELS.CRITICAL;
    else if (averageRisk >= 6) level = RISK_LEVELS.HIGH;
    else if (averageRisk >= 4) level = RISK_LEVELS.MEDIUM;
    else level = RISK_LEVELS.LOW;

    return {
      level,
      score: averageRisk,
      totalRisk,
      distribution: this.getRiskDistribution(logs)
    };
  }

  static calculateComplianceScore(logs) {
    // Implementation would analyze logs against compliance requirements
    const violations = logs.filter(log => log.complianceViolation === true).length;
    const score = Math.max(0, 100 - (violations / logs.length * 100));
    
    return {
      score: Math.round(score),
      violations,
      grade: this.getComplianceGrade(score)
    };
  }

  // Grouping and categorization methods
  static countActions(logs) {
    return logs.reduce((counts, log) => {
      counts[log.action] = (counts[log.action] || 0) + 1;
      return counts;
    }, {});
  }

  static groupByEntity(logs) {
    return logs.reduce((groups, log) => {
      const key = log.entityType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
      return groups;
    }, {});
  }

  static groupByUser(logs) {
    return logs.reduce((groups, log) => {
      const key = log.userId.toString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
      return groups;
    }, {});
  }

  static groupByCategory(logs) {
    return logs.reduce((groups, log) => {
      const category = log.category || this.categorizeAuditAction(log.action, log.entityType);
      if (!groups[category]) groups[category] = [];
      groups[category].push(log);
      return groups;
    }, {});
  }

  static categorizeAuditAction(action, entityType) {
    const securityActions = ['login', 'logout', 'password_change', 'permission_change'];
    const financialActions = ['approve', 'create_procurement', 'create_contract'];
    
    if (securityActions.includes(action)) return AUDIT_CATEGORIES.SECURITY;
    if (financialActions.includes(action)) return AUDIT_CATEGORIES.FINANCIAL;
    if (entityType === 'compliance') return AUDIT_CATEGORIES.COMPLIANCE;
    
    return AUDIT_CATEGORIES.OPERATIONAL;
  }

  // Detection and analysis methods
  static filterCriticalActions(logs) {
    const criticalActions = ['delete', 'approve', 'reject', 'create_user', 'change_permissions'];
    return logs.filter(log => 
      criticalActions.includes(log.action) || 
      log.riskLevel === RISK_LEVELS.CRITICAL
    );
  }

  static async detectAnomalies(logs) {
    const anomalies = [];
    
    // Detect unusual time patterns
    const timeAnomalies = this.detectTimeAnomalies(logs);
    anomalies.push(...timeAnomalies);
    
    // Detect unusual user behavior
    const behaviorAnomalies = this.detectBehaviorAnomalies(logs);
    anomalies.push(...behaviorAnomalies);
    
    // Detect volume anomalies
    const volumeAnomalies = this.detectVolumeAnomalies(logs);
    anomalies.push(...volumeAnomalies);
    
    return anomalies;
  }

  static async identifyComplianceViolations(logs) {
    const violations = [];
    
    // Check for segregation of duties violations
    const sodViolations = this.checkSegregationOfDuties(logs);
    violations.push(...sodViolations);
    
    // Check for approval policy violations
    const approvalViolations = this.checkApprovalPolicies(logs);
    violations.push(...approvalViolations);
    
    // Check for data retention violations
    const retentionViolations = this.checkDataRetention(logs);
    violations.push(...retentionViolations);
    
    return violations;
  }

  // Report generation methods
  static async generatePDFReport(report) {
    // Implementation would generate PDF using PDFKit
    return {
      format: 'pdf',
      filename: `audit_report_${report.auditId}.pdf`,
      data: 'PDF_CONTENT_BASE64'
    };
  }

  static async generateExcelReport(report) {
    // Implementation would generate Excel using ExcelJS
    return {
      format: 'excel',
      filename: `audit_report_${report.auditId}.xlsx`,
      data: 'EXCEL_CONTENT_BASE64'
    };
  }

  // Utility methods
  static generateAuditId() {
    return `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  static async getEntityDetails(entityType, entityId) {
    try {
      let model;
      switch (entityType.toLowerCase()) {
        case 'procurement':
          model = Procurement;
          break;
        case 'user':
          model = User;
          break;
        default:
          return null;
      }
      
      return await model.findById(entityId).select('-password -refreshTokens');
    } catch (error) {
      logger.error('Error getting entity details', { entityType, entityId, error: error.message });
      return null;
    }
  }

  static generateAuditTimeline(logs) {
    return logs.map(log => ({
      timestamp: log.createdAt,
      action: log.action,
      user: log.user ? log.user.username : 'Unknown',
      description: this.generateTimelineDescription(log),
      riskLevel: log.riskLevel
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  static generateTimelineDescription(log) {
    return `${log.action} performed on ${log.entityType} by ${log.user?.username || 'Unknown User'}`;
  }

  static async logAuditGeneration(auditType, parameters, options) {
    try {
      await AuditLog.create({
        action: 'generate_audit',
        entityType: 'audit_pack',
        entityId: null,
        userId: null, // System generated
        metadata: {
          auditType,
          parameters,
          options,
          generatedAt: new Date()
        },
        riskLevel: RISK_LEVELS.LOW
      });
    } catch (error) {
      logger.error('Error logging audit generation', { error: error.message });
    }
  }

  static async notifyCriticalFindings(report) {
    try {
      const criticalViolations = report.violations?.filter(v => v.severity === 'critical') || [];
      
      if (criticalViolations.length > 0) {
        await notificationService.sendNotification({
          type: 'critical_audit_findings',
          title: 'Critical Audit Findings Detected',
          message: `${criticalViolations.length} critical compliance violations found in audit ${report.auditId}`,
          priority: 'critical',
          recipients: await this.getComplianceOfficers(),
          data: {
            auditId: report.auditId,
            violationsCount: criticalViolations.length,
            reportType: report.auditType
          }
        });
      }
    } catch (error) {
      logger.error('Error sending critical findings notification', { error: error.message });
    }
  }

  static async getComplianceOfficers() {
    try {
      const officers = await User.find({
        roles: { $in: ['compliance_officer', 'audit_manager', 'admin'] },
        status: 'active'
      }).select('_id');
      
      return officers.map(officer => officer._id);
    } catch (error) {
      logger.error('Error getting compliance officers', { error: error.message });
      return [];
    }
  }

  // Placeholder methods for advanced analytics (to be implemented)
  static analyzeFailedLogins(logs) { return []; }
  static analyzePrivilegedAccess(logs) { return []; }
  static detectSuspiciousActivity(logs) { return []; }
  static analyzeThreatIndicators(logs) { return []; }
  static generateSecurityRecommendations(analysis) { return []; }
  static generateFinancialRecommendations(analysis) { return []; }
  static generateUserRecommendations(logs, user) { return []; }
  static generateComplianceRecommendations(logs, analytics) { return []; }
  
  // Additional placeholder methods
  static calculateActionFrequency(logs) { return {}; }
  static analyzeUserInvolvement(logs) { return {}; }
  static analyzeTimePatterns(logs) { return {}; }
  static assessEntityRisk(logs, entityType) { return {}; }
  static detectTimeAnomalies(logs) { return []; }
  static detectBehaviorAnomalies(logs) { return []; }
  static detectVolumeAnomalies(logs) { return []; }
  static checkSegregationOfDuties(logs) { return []; }
  static checkApprovalPolicies(logs) { return []; }
  static checkDataRetention(logs) { return []; }
}

module.exports = AuditPackService;

  /**
   * Generate comprehensive compliance audit with regulatory analysis
   */
  static async generateComplianceAudit(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default: 90 days
        endDate = new Date(),
        departments = [],
        complianceFrameworks = ['SOX', 'GDPR', 'HIPAA', 'ISO27001'],
        includeRecommendations = true,
        includeRiskAssessment = true,
        includeMetrics = true,
        format = 'json'
      } = options;

      // Build comprehensive filters
      const filters = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (departments.length > 0) {
        filters['metadata.department'] = { $in: departments };
      }

      // Get all audit logs for the period
      const logs = await AuditLog.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $addFields: {
            user: { $arrayElemAt: ['$userInfo', 0] },
            riskScore: this.calculateActionRiskScore('$action', '$entityType'),
            category: this.categorizeAuditAction('$action', '$entityType'),
            complianceRelevance: this.assessComplianceRelevance('$action', '$entityType')
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      // Generate comprehensive analytics
      const analytics = await this.generateComplianceAnalytics(logs, complianceFrameworks);

      // Generate risk assessment
      let riskAssessment = {};
      if (includeRiskAssessment) {
        riskAssessment = await this.generateRiskAssessment(logs);
      }

      // Generate compliance metrics
      let metrics = {};
      if (includeMetrics) {
        metrics = await this.generateComplianceMetrics(logs, complianceFrameworks);
      }

      // Generate recommendations
      let recommendations = [];
      if (includeRecommendations) {
        recommendations = await this.generateComplianceRecommendations(logs, analytics);
      }

      // Identify violations and anomalies
      const violations = await this.identifyComplianceViolations(logs);
      const anomalies = await this.detectAnomalies(logs);

      // Build comprehensive compliance report
      const report = {
        auditId: this.generateAuditId(),
        generatedAt: new Date(),
        auditType: AUDIT_TYPES.COMPLIANCE_AUDIT,
        period: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          durationDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        },
        scope: {
          departments: departments.length > 0 ? departments : 'All Departments',
          complianceFrameworks,
          totalLogs: logs.length,
          uniqueUsers: new Set(logs.map(l => l.userId.toString())).size
        },
        executive_summary: {
          overallComplianceScore: this.calculateOverallComplianceScore(metrics),
          criticalFindings: violations.filter(v => v.severity === 'critical').length,
          recommendationsCount: recommendations.length,
          riskLevel: this.calculateOverallRiskLevel(riskAssessment)
        },
        analytics,
        riskAssessment,
        metrics,
        violations,
        anomalies,
        recommendations,
        detailed_findings: {
          userActivity: this.groupByUser(logs),
          entityActivity: this.groupByEntity(logs),
          timeDistribution: this.analyzeTimeDistribution(logs),
          geographicDistribution: this.analyzeGeographicDistribution(logs)
        },
        appendices: {
          criticalActions: this.filterCriticalActions(logs),
          failedAttempts: this.filterFailedAttempts(logs),
          privilegedAccess: this.filterPrivilegedAccess(logs)
        },
        metadata: {
          generatedBy: 'AuditPackService',
          reportVersion: '2.0',
          complianceStandards: complianceFrameworks,
          includeRecommendations,
          includeRiskAssessment,
          includeMetrics,
          format
        }
      };

      // Format output
      if (format === 'pdf') {
        return await this.generatePDFReport(report);
      } else if (format === 'excel') {
        return await this.generateExcelReport(report);
      }

      // Log compliance audit generation
      await this.logAuditGeneration(AUDIT_TYPES.COMPLIANCE_AUDIT, { 
        startDate, 
        endDate, 
        departments, 
        complianceFrameworks 
      }, options);

      // Send notifications for critical findings
      if (violations.filter(v => v.severity === 'critical').length > 0) {
        await this.notifyCriticalFindings(report);
      }

      return report;

    } catch (error) {
      logger.error('Error generating compliance audit', { 
        error: error.message,
        stack: error.stack 
      });
      throw new Error(`Failed to generate compliance audit: ${error.message}`);
    }
  };    
