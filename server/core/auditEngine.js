/**
 * Audit Engine - Feature 10: Who/What/When Tracking
 * 
 * Tracks all procurement actions, decisions, approvals,
 * maintains audit trail for compliance, and generates audit reports
 */

class AuditEngine {
  /**
   * Audit event types
   */
  static EVENT_TYPES = {
    PROCUREMENT_CREATED: 'procurement_created',
    PROCUREMENT_UPDATED: 'procurement_updated',
    STAGE_CHANGED: 'stage_changed',
    DOCUMENT_UPLOADED: 'document_uploaded',
    DOCUMENT_APPROVED: 'document_approved',
    DOCUMENT_REJECTED: 'document_rejected',
    DOCUMENT_VERSIONED: 'document_versioned',
    EVALUATION_SUBMITTED: 'evaluation_submitted',
    APPROVAL_REQUESTED: 'approval_requested',
    APPROVAL_GIVEN: 'approval_given',
    APPROVAL_REJECTED: 'approval_rejected',
    AWARD_DECIDED: 'award_decided',
    CONTRACT_LINKED: 'contract_linked',
    CLARIFICATION_POSTED: 'clarification_posted',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    PERMISSION_CHANGED: 'permission_changed',
    ERROR_OCCURRED: 'error_occurred',
  };

  /**
   * Severity levels for audit events
   */
  static SEVERITY_LEVELS = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
  };

  /**
   * Log an audit event
   * @param {object} auditData - {eventType, userId, procurementId, action, details, severity}
   * @returns {object} Created audit entry
   */
  static logEvent(auditData = {}) {
    const requiredFields = ['eventType', 'userId', 'action'];
    const missingFields = requiredFields.filter(f => !auditData[f]);

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      };
    }

    const auditEntry = {
      id: this.generateAuditId(),
      timestamp: auditData.timestamp || new Date(),
      eventType: auditData.eventType,
      userId: auditData.userId,
      procurementId: auditData.procurementId || null,
      action: auditData.action,
      details: auditData.details || {},
      severity: auditData.severity || this.SEVERITY_LEVELS.INFO,
      ipAddress: auditData.ipAddress || null,
      userAgent: auditData.userAgent || null,
      changes: auditData.changes || null, // Before/after comparison
      status: 'logged',
    };

    return {
      success: true,
      auditEntry,
    };
  }

  /**
   * Generate unique audit ID
   * @private
   */
  static generateAuditId() {
    return `AUDIT_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Track document change with before/after
   * @param {string} procurementId
   * @param {string} documentId
   * @param {object} beforeData
   * @param {object} afterData
   * @param {string} userId
   * @returns {object} Audit entry for change
   */
  static trackDocumentChange(procurementId, documentId, beforeData, afterData, userId) {
    const changes = this.detectChanges(beforeData, afterData);

    return this.logEvent({
      eventType: this.EVENT_TYPES.DOCUMENT_UPDATED,
      userId,
      procurementId,
      action: 'Document updated',
      details: {
        documentId,
        changeCount: Object.keys(changes).length,
        changedFields: Object.keys(changes),
      },
      changes: {
        before: beforeData,
        after: afterData,
        differences: changes,
      },
      severity: this.determineSeverity(changes),
    });
  }

  /**
   * Detect specific field changes
   * @private
   */
  static detectChanges(beforeData = {}, afterData = {}) {
    const changes = {};

    // Check all fields in both objects
    const allKeys = new Set([
      ...Object.keys(beforeData),
      ...Object.keys(afterData),
    ]);

    allKeys.forEach(key => {
      const before = beforeData[key];
      const after = afterData[key];

      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changes[key] = {
          before,
          after,
          changed: true,
        };
      }
    });

    return changes;
  }

  /**
   * Determine severity based on changes
   * @private
   */
  static determineSeverity(changes) {
    const criticalFields = ['status', 'procurementType', 'estimatedBudget', 'evaluationCriteria'];
    
    for (const field of criticalFields) {
      if (changes[field]) {
        return this.SEVERITY_LEVELS.CRITICAL;
      }
    }

    return this.SEVERITY_LEVELS.INFO;
  }

  /**
   * Record approval decision
   * @param {string} procurementId
   * @param {string} approverId
   * @param {string} decision - 'approved', 'rejected', 'changes_requested'
   * @param {object} metadata - {reason, comments, timestamp}
   * @returns {object} Audit entry
   */
  static recordApproval(procurementId, approverId, decision, metadata = {}) {
    const eventTypeMap = {
      approved: this.EVENT_TYPES.APPROVAL_GIVEN,
      rejected: this.EVENT_TYPES.APPROVAL_REJECTED,
      changes_requested: this.EVENT_TYPES.APPROVAL_REQUESTED,
    };

    return this.logEvent({
      eventType: eventTypeMap[decision] || this.EVENT_TYPES.APPROVAL_REQUESTED,
      userId: approverId,
      procurementId,
      action: `Approval ${decision}`,
      details: {
        decision,
        approver: approverId,
        reason: metadata.reason,
        comments: metadata.comments,
      },
      severity: decision === 'rejected' ? this.SEVERITY_LEVELS.WARNING : this.SEVERITY_LEVELS.INFO,
      timestamp: metadata.timestamp,
    });
  }

  /**
   * Get audit trail for procurement
   * @param {string} procurementId
   * @param {array} auditLog - Complete audit log
   * @param {object} filters - {eventType, userId, severity, startDate, endDate}
   * @returns {array} Filtered audit entries
   */
  static getAuditTrail(procurementId, auditLog = [], filters = {}) {
    let trail = auditLog.filter(e => e.procurementId === procurementId);

    if (filters.eventType) {
      trail = trail.filter(e => e.eventType === filters.eventType);
    }

    if (filters.userId) {
      trail = trail.filter(e => e.userId === filters.userId);
    }

    if (filters.severity) {
      trail = trail.filter(e => e.severity === filters.severity);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      trail = trail.filter(e => new Date(e.timestamp) >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      trail = trail.filter(e => new Date(e.timestamp) <= end);
    }

    return trail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get user activity summary
   * @param {array} auditLog
   * @param {string} userId
   * @returns {object} User activity statistics
   */
  static getUserActivitySummary(auditLog = [], userId) {
    const userEvents = auditLog.filter(e => e.userId === userId);

    if (userEvents.length === 0) {
      return {
        userId,
        totalActions: 0,
        message: 'No activity found',
      };
    }

    const eventTypeCount = {};
    const procurementIds = new Set();
    const firstActivity = userEvents[userEvents.length - 1];
    const lastActivity = userEvents[0];

    userEvents.forEach(e => {
      eventTypeCount[e.eventType] = (eventTypeCount[e.eventType] || 0) + 1;
      if (e.procurementId) {
        procurementIds.add(e.procurementId);
      }
    });

    return {
      userId,
      totalActions: userEvents.length,
      firstActivity: firstActivity.timestamp,
      lastActivity: lastActivity.timestamp,
      procurementsInvolved: procurementIds.size,
      eventBreakdown: eventTypeCount,
    };
  }

  /**
   * Detect suspicious activities
   * @param {array} auditLog
   * @param {object} options - {timeWindowMinutes, actionThreshold}
   * @returns {array} Suspicious activities
   */
  static detectSuspiciousActivity(auditLog = [], options = {}) {
    const timeWindowMinutes = options.timeWindowMinutes || 60;
    const actionThreshold = options.actionThreshold || 20;
    const suspicious = [];

    // Group by user and time window
    const userActions = {};
    auditLog.forEach(event => {
      if (!userActions[event.userId]) {
        userActions[event.userId] = [];
      }
      userActions[event.userId].push(event);
    });

    // Check for excessive actions in time window
    Object.keys(userActions).forEach(userId => {
      const actions = userActions[userId].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      for (let i = 0; i < actions.length - 1; i++) {
        const timeDiff = (new Date(actions[i + 1].timestamp) - new Date(actions[i].timestamp)) / (1000 * 60);
        
        if (timeDiff <= timeWindowMinutes) {
          // Count actions in this window
          let actionCount = 1;
          let j = i + 1;
          
          while (j < actions.length && 
                 (new Date(actions[j].timestamp) - new Date(actions[i].timestamp)) / (1000 * 60) <= timeWindowMinutes) {
            actionCount++;
            j++;
          }

          if (actionCount >= actionThreshold) {
            suspicious.push({
              userId,
              timeWindow: `${timeWindowMinutes} minutes`,
              actionCount,
              threshold: actionThreshold,
              actions: actions.slice(i, j),
              riskLevel: 'high',
            });
            i = j - 1; // Skip ahead
          }
        }
      }
    });

    return suspicious;
  }

  /**
   * Generate compliance report
   * @param {array} auditLog
   * @param {string} procurementId
   * @returns {object} Compliance report
   */
  static generateComplianceReport(auditLog = [], procurementId) {
    const trail = auditLog.filter(e => e.procurementId === procurementId);

    if (trail.length === 0) {
      return {
        procurementId,
        message: 'No audit trail found',
      };
    }

    // Check for required events
    const requiredEvents = [
      this.EVENT_TYPES.PROCUREMENT_CREATED,
      this.EVENT_TYPES.DOCUMENT_UPLOADED,
      this.EVENT_TYPES.EVALUATION_SUBMITTED,
      this.EVENT_TYPES.APPROVAL_GIVEN,
      this.EVENT_TYPES.AWARD_DECIDED,
    ];

    const presentEvents = new Set(trail.map(e => e.eventType));
    const missingEvents = requiredEvents.filter(e => !presentEvents.has(e));

    // Count approvals
    const approvals = trail.filter(e => 
      e.eventType === this.EVENT_TYPES.APPROVAL_GIVEN || 
      e.eventType === this.EVENT_TYPES.APPROVAL_REJECTED
    );

    // Count rejections
    const rejections = trail.filter(e => e.eventType === this.EVENT_TYPES.APPROVAL_REJECTED);

    return {
      procurementId,
      totalAuditEvents: trail.length,
      compliant: missingEvents.length === 0,
      missingRequiredEvents: missingEvents,
      approvalCount: approvals.length,
      rejectionCount: rejections.length,
      uniqueUsers: new Set(trail.map(e => e.userId)).size,
      timelineSpan: {
        start: trail[trail.length - 1].timestamp,
        end: trail[0].timestamp,
      },
      eventSummary: this.getEventSummary(trail),
    };
  }

  /**
   * Get summary of events by type
   * @private
   */
  static getEventSummary(trail) {
    const summary = {};
    trail.forEach(event => {
      summary[event.eventType] = (summary[event.eventType] || 0) + 1;
    });
    return summary;
  }

  /**
   * Archive audit entries
   * @param {array} auditLog
   * @param {date} beforeDate
   * @returns {object} {archived: number, remaining: number}
   */
  static archiveOldEntries(auditLog = [], beforeDate) {
    const cutoffDate = new Date(beforeDate);
    const toArchive = auditLog.filter(e => new Date(e.timestamp) < cutoffDate);
    const remaining = auditLog.filter(e => new Date(e.timestamp) >= cutoffDate);

    return {
      archivedCount: toArchive.length,
      remainingCount: remaining.length,
      archivedEntries: toArchive,
      remainingEntries: remaining,
    };
  }

  /**
   * Export audit report
   * @param {array} auditLog
   * @param {object} options - {format: 'json|csv', filters}
   * @returns {object} Exported report
   */
  static exportReport(auditLog = [], options = {}) {
    const format = options.format || 'json';
    let report = auditLog;

    // Apply filters if provided
    if (options.filters) {
      report = this.getAuditTrail('', auditLog, options.filters);
    }

    if (format === 'csv') {
      return {
        format: 'csv',
        data: this.convertToCSV(report),
        timestamp: new Date(),
      };
    }

    return {
      format: 'json',
      data: report,
      timestamp: new Date(),
      recordCount: report.length,
    };
  }

  /**
   * Convert audit entries to CSV
   * @private
   */
  static convertToCSV(auditLog = []) {
    if (auditLog.length === 0) return 'No data';

    const headers = ['Timestamp', 'Event Type', 'User ID', 'Procurement ID', 'Action', 'Severity'];
    const rows = auditLog.map(e => [
      e.timestamp,
      e.eventType,
      e.userId,
      e.procurementId || 'N/A',
      e.action,
      e.severity,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csvContent;
  }
}

module.exports = AuditEngine;
