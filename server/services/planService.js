/**
 * Plan Service - UPDATED for STEP System
 * 
 * Comprehensive procurement planning with:
 * - Excel import from ERT Procurement Plan
 * - STEP system compliance (7 methods, Prior/Post review)
 * - Strategic planning and budget management
 * - Timeline tracking with 15 stages
 * - Approval workflows
 * - Advanced planning analytics
 */

const Plan = require('../db/models/Plan');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const approvalService = require('./approvalService');
const { validateInput, sanitize } = require('../utils/validation');
const { formatDate, formatCurrency, calculateDateDifference } = require('../utils/helpers');
const { assessPlanRisk, validateBudgetAllocation } = require('../utils/planningAnalytics');

// STEP Procurement Methods (7 methods)
const PROCUREMENT_METHODS = {
  RFB: 'RFB',           // Request for Bids
  RFQ: 'RFQ',           // Request for Quotations
  DIR: 'DIR',           // Direct Selection
  QCBS: 'QCBS',         // Quality and Cost Based Selection
  CQS: 'CQS',           // Consultant Qualification Selection
  CDS: 'CDS',           // Consultant Direct Selection
  INDV: 'INDV'          // Individual Consultant Selection
};

// STEP Review Types
const REVIEW_TYPES = {
  PRIOR: 'Prior',       // Requires Bank approval
  POST: 'Post'          // Internal review only
};

// STEP Process Status
const PROCESS_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  CLEARED: 'Cleared',
  SIGNED: 'Signed',
  CANCELED: 'Canceled',
  PENDING_IMPLEMENTATION: 'Pending Implementation'
};

// Procurement Categories
const CATEGORIES = {
  GOODS: 'Goods',
  WORKS: 'Works',
  CIVIL_WORKS: 'Civil Works',
  CONSULTING_SERVICES: 'Consulting Services',
  NON_CONSULTING_SERVICES: 'Non-Consulting Services'
};

// Market Approaches
const MARKET_APPROACHES = {
  OPEN_NATIONAL: 'Open - National',
  OPEN_INTERNATIONAL: 'Open - International',
  RESTRICTED: 'Restricted'
};

// Plan Events
const PLAN_EVENTS = {
  CREATED: 'plan_created',
  UPDATED: 'plan_updated',
  IMPORTED: 'plan_imported_from_excel',
  SUBMITTED: 'plan_submitted',
  APPROVED: 'plan_approved',
  ACTIVATED: 'plan_activated',
  COMPLETED: 'plan_completed',
  CANCELLED: 'plan_cancelled'
};

class PlanService {
  /**
   * ========================================
   * EXCEL IMPORT METHODS
   * ========================================
   */

  /**
   * Import single procurement plan from Excel row
   */
  static async importPlanFromExcel(excelData, options = {}, userId = 'system') {
    try {
      const {
        workplanId,
        sheetName,      // RFB/RFQ/DIR/QCBS/CQS/CDS/INDV
        rowNumber,
        ipAddress,
        userAgent
      } = options;

      logger.info('Importing plan from Excel', { sheetName, rowNumber });

      // Import using Plan model's importFromExcel method
      const plan = await Plan.importFromExcel({
        workplanId,
        excelData,
        sheetName,
        rowNumber,
        createdBy: userId
      });

      // Create audit trail
      await this.createAuditLog({
        action: PLAN_EVENTS.IMPORTED,
        entityType: 'plan',
        entityId: plan.id,
        userId,
        metadata: {
          referenceNumber: plan.referenceNumber,
          sheetName,
          rowNumber,
          procurementMethod: plan.procurementMethod,
          estimatedAmountUSD: plan.estimatedAmountUSD,
          ipAddress,
          userAgent
        }
      });

      // Send notification
      await this.sendPlanCreationNotification(plan, userId);

      return {
        success: true,
        message: 'Plan imported from Excel successfully',
        plan: this.formatPlanResponse(plan)
      };

    } catch (error) {
      logger.error('Error importing plan from Excel', { 
        error: error.message,
        sheetName: options.sheetName,
        rowNumber: options.rowNumber
      });
      throw new Error(`Excel import failed: ${error.message}`);
    }
  }

  /**
   * Batch import multiple plans from Excel
   */
  static async batchImportFromExcel(excelRows, options = {}, userId = 'system') {
    try {
      const {
        workplanId,
        sheetName,
        ipAddress,
        userAgent
      } = options;

      logger.info('Batch importing plans from Excel', { 
        sheetName, 
        rowCount: excelRows.length 
      });

      // Use Plan model's batch import
      const results = await Plan.batchImportFromExcel({
        workplanId,
        excelRows,
        sheetName,
        createdBy: userId
      });

      // Create audit log for batch import
      await this.createAuditLog({
        action: 'batch_import_completed',
        entityType: 'plan',
        entityId: workplanId,
        userId,
        metadata: {
          sheetName,
          totalRows: results.total,
          successful: results.successful,
          failed: results.failed,
          errors: results.errors,
          ipAddress,
          userAgent
        }
      });

      // Send notification about batch import
      await this.sendBatchImportNotification(results, sheetName, userId);

      return {
        success: true,
        message: `Batch import completed: ${results.successful}/${results.total} plans imported successfully`,
        results
      };

    } catch (error) {
      logger.error('Error in batch Excel import', { 
        error: error.message,
        sheetName: options.sheetName
      });
      throw new Error(`Batch import failed: ${error.message}`);
    }
  }

  /**
   * Import entire Excel workbook (all 7 sheets)
   */
  static async importExcelWorkbook(workbookData, workplanId, userId = 'system') {
    try {
      const results = {
        workplanId,
        totalPlans: 0,
        successful: 0,
        failed: 0,
        byMethod: {},
        errors: []
      };

      // Import each sheet (7 procurement methods)
      for (const method of Object.keys(PROCUREMENT_METHODS)) {
        if (workbookData[method] && workbookData[method].length > 0) {
          logger.info(`Importing ${method} sheet`, { 
            rowCount: workbookData[method].length 
          });

          const methodResults = await this.batchImportFromExcel(
            workbookData[method],
            { workplanId, sheetName: method },
            userId
          );

          results.byMethod[method] = methodResults.results;
          results.totalPlans += methodResults.results.total;
          results.successful += methodResults.results.successful;
          results.failed += methodResults.results.failed;
          results.errors.push(...methodResults.results.errors);
        }
      }

      logger.info('Workbook import completed', results);

      return {
        success: true,
        message: `Workbook imported: ${results.successful}/${results.totalPlans} plans`,
        results
      };

    } catch (error) {
      logger.error('Error importing Excel workbook', { error: error.message });
      throw new Error(`Workbook import failed: ${error.message}`);
    }
  }

  /**
   * ========================================
   * STEP-SPECIFIC METHODS
   * ========================================
   */

  /**
   * Get plans by procurement method
   */
  static async getPlansByMethod(procurementMethod, filters = {}, userId = 'system') {
    try {
      const plans = await Plan.getByMethod(procurementMethod, filters);

      return {
        success: true,
        procurementMethod,
        count: plans.length,
        plans: plans.map(p => this.formatPlanResponse(p))
      };

    } catch (error) {
      logger.error('Error getting plans by method', { 
        error: error.message,
        procurementMethod 
      });
      throw new Error(`Failed to get plans by method: ${error.message}`);
    }
  }

  /**
   * Get plans pending Bank approval (Prior Review)
   */
  static async getPendingBankApproval(workplanId = null, userId = 'system') {
    try {
      const plans = await Plan.getPendingBankApproval(workplanId);

      return {
        success: true,
        count: plans.length,
        workplanId,
        plans: plans.map(p => this.formatPlanResponse(p))
      };

    } catch (error) {
      logger.error('Error getting pending bank approvals', { error: error.message });
      throw new Error(`Failed to get pending approvals: ${error.message}`);
    }
  }

  /**
   * Get plans by workplan
   */
  static async getPlansByWorkplan(workplanId, filters = {}, userId = 'system') {
    try {
      const plans = await Plan.getByWorkplan(workplanId, filters);

      // Get workplan summary
      const summary = this.calculateWorkplanSummary(plans);

      return {
        success: true,
        workplanId,
        count: plans.length,
        summary,
        plans: plans.map(p => this.formatPlanResponse(p))
      };

    } catch (error) {
      logger.error('Error getting plans by workplan', { 
        error: error.message,
        workplanId 
      });
      throw new Error(`Failed to get workplan plans: ${error.message}`);
    }
  }

  /**
   * Find plan by reference number
   */
  static async findByReferenceNumber(referenceNumber, userId = 'system') {
    try {
      const plan = await Plan.findByReferenceNumber(referenceNumber);

      if (!plan) {
        throw new Error('Plan not found');
      }

      return {
        success: true,
        plan: this.formatPlanResponse(plan)
      };

    } catch (error) {
      logger.error('Error finding plan by reference number', { 
        error: error.message,
        referenceNumber 
      });
      throw new Error(`Plan lookup failed: ${error.message}`);
    }
  }

  /**
   * Get STEP analytics with procurement method breakdown
   */
  static async getSTEPAnalytics(filters = {}, userId = 'system') {
    try {
      const analytics = await Plan.getAnalytics(filters);

      // Enhance with additional STEP metrics
      const enhanced = {
        ...analytics,
        
        // Prior review performance
        priorReview: {
          total: analytics.reviewTypeBreakdown.Prior || 0,
          pendingApproval: analytics.pendingBankApproval || 0,
          approvalRate: this.calculateApprovalRate(analytics),
          averageApprovalTime: 0 // TODO: Calculate from actual data
        },
        
        // Method distribution percentages
        methodDistribution: this.calculateMethodDistribution(analytics.methodBreakdown, analytics.totalPlans),
        
        // Status progression
        statusProgression: this.calculateStatusProgression(analytics.statusBreakdown),
        
        // Value analysis by method
        valueByMethod: {}, // TODO: Calculate from detailed data
        
        // Compliance score
        complianceScore: this.calculateComplianceScore(analytics)
      };

      return {
        success: true,
        analytics: enhanced
      };

    } catch (error) {
      logger.error('Error getting STEP analytics', { error: error.message });
      throw new Error(`Analytics retrieval failed: ${error.message}`);
    }
  }

  /**
   * ========================================
   * CORE PLAN MANAGEMENT
   * ========================================
   */

  /**
   * Create comprehensive procurement plan
   */
  static async createPlan(planData, userId = 'system', requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      // Validate required STEP fields
      this.validateSTEPFields(planData);

      // Sanitize inputs
      const sanitizedData = this.sanitizePlanData(planData);

      // Create plan using Plan model
      const plan = await Plan.create({
        ...sanitizedData,
        procurementId: sanitizedData.procurementId || `proc_${Date.now()}`,
        departmentInfo: sanitizedData.departmentInfo || { name: 'general' },
        createdBy: userId
      });

      // Create audit trail
      await this.createAuditLog({
        action: PLAN_EVENTS.CREATED,
        entityType: 'plan',
        entityId: plan.id,
        userId,
        metadata: {
          referenceNumber: plan.referenceNumber,
          procurementMethod: plan.procurementMethod,
          reviewType: plan.reviewType,
          estimatedAmountUSD: plan.estimatedAmountUSD,
          ipAddress,
          userAgent
        }
      });

      // Send notifications
      await this.sendPlanCreationNotification(plan, userId);

      return {
        success: true,
        message: 'Procurement plan created successfully',
        plan: this.formatPlanResponse(plan)
      };

    } catch (error) {
      logger.error('Error creating plan', { 
        error: error.message,
        planData 
      });
      throw new Error(`Plan creation failed: ${error.message}`);
    }
  }

  /**
   * Update plan
   */
  static async updatePlan(planId, updateData, userId = 'system', requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      // Get current plan
      const currentPlan = await Plan.findById(planId);
      if (!currentPlan) {
        throw new Error('Plan not found');
      }

      // Sanitize update data
      const sanitizedUpdates = this.sanitizePlanData(updateData);

      // Perform update using Plan model
      const updatedPlan = await Plan.update(
        planId,
        {
          ...sanitizedUpdates,
          updatedBy: userId,
          updateReason: updateData.updateReason
        },
        currentPlan.partitionKey
      );

      // Create audit trail
      await this.createAuditLog({
        action: PLAN_EVENTS.UPDATED,
        entityType: 'plan',
        entityId: planId,
        userId,
        metadata: {
          referenceNumber: updatedPlan.referenceNumber,
          changes: Object.keys(sanitizedUpdates),
          ipAddress,
          userAgent
        }
      });

      // Send update notifications if significant changes
      if (this.hasSignificantChanges(sanitizedUpdates)) {
        await this.sendPlanUpdateNotification(updatedPlan, userId);
      }

      return {
        success: true,
        message: 'Plan updated successfully',
        plan: this.formatPlanResponse(updatedPlan)
      };

    } catch (error) {
      logger.error('Error updating plan', { 
        error: error.message,
        planId 
      });
      throw new Error(`Plan update failed: ${error.message}`);
    }
  }

  /**
   * Get plan details
   */
  static async getPlan(planId, userId = 'system', options = {}) {
    try {
      const {
        includeMetrics = true,
        includeHistory = false
      } = options;

      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const response = {
        ...this.formatPlanResponse(plan),
        metrics: includeMetrics ? await this.calculatePlanMetrics(plan) : null,
        history: includeHistory ? await this.getPlanHistory(planId) : null
      };

      return {
        success: true,
        plan: response
      };

    } catch (error) {
      logger.error('Error getting plan', { 
        error: error.message,
        planId 
      });
      throw new Error(`Plan retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get filtered list of plans
   */
  static async getPlans(filters = {}, userId = 'system', options = {}) {
    try {
      const {
        page = 1,
        limit = 50
      } = options;

      const result = await Plan.getAll(filters, page, limit);

      return {
        success: true,
        plans: result.items.map(p => this.formatPlanResponse(p)),
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: result.limit
        }
      };

    } catch (error) {
      logger.error('Error getting plans', { error: error.message });
      throw new Error(`Plans retrieval failed: ${error.message}`);
    }
  }

  /**
   * Submit plan for approval
   */
  static async submitPlanForApproval(planId, userId = 'system', submissionData = {}) {
    try {
      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Update status based on review type
      const newStatus = plan.reviewType === REVIEW_TYPES.PRIOR 
        ? PROCESS_STATUS.SUBMITTED 
        : PROCESS_STATUS.UNDER_REVIEW;

      await Plan.update(planId, {
        processStatus: newStatus,
        activityStatus: 'Pending Approval',
        'lifecycle.statusHistory': [
          ...plan.metadata.auditTrail,
          {
            action: 'submitted_for_approval',
            timestamp: new Date(),
            user: userId,
            details: submissionData.reason || 'Plan submitted for approval'
          }
        ],
        updatedBy: userId
      }, plan.partitionKey);

      // Send approval notifications
      await this.sendApprovalNotifications(plan, userId);

      // Create audit trail
      await this.createAuditLog({
        action: PLAN_EVENTS.SUBMITTED,
        entityType: 'plan',
        entityId: planId,
        userId,
        metadata: {
          referenceNumber: plan.referenceNumber,
          reviewType: plan.reviewType,
          newStatus
        }
      });

      return {
        success: true,
        message: 'Plan submitted for approval successfully',
        reviewType: plan.reviewType,
        requiresBankApproval: plan.reviewType === REVIEW_TYPES.PRIOR
      };

    } catch (error) {
      logger.error('Error submitting plan for approval', { 
        error: error.message,
        planId 
      });
      throw new Error(`Plan submission failed: ${error.message}`);
    }
  }

  /**
   * Delete/Cancel plan
   */
  static async deletePlan(planId, userId = 'system', reason = '') {
    try {
      const plan = await Plan.delete(planId, null, userId);

      // Create audit trail
      await this.createAuditLog({
        action: PLAN_EVENTS.CANCELLED,
        entityType: 'plan',
        entityId: planId,
        userId,
        metadata: {
          referenceNumber: plan.referenceNumber,
          reason
        }
      });

      return {
        success: true,
        message: 'Plan cancelled successfully'
      };

    } catch (error) {
      logger.error('Error deleting plan', { 
        error: error.message,
        planId 
      });
      throw new Error(`Plan deletion failed: ${error.message}`);
    }
  }

  /**
   * ========================================
   * HELPER METHODS
   * ========================================
   */

  /**
   * Validate STEP required fields
   */
  static validateSTEPFields(planData) {
    const required = ['description', 'procurementMethod', 'category', 'estimatedAmountUSD'];
    const missing = required.filter(field => !planData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required STEP fields: ${missing.join(', ')}`);
    }

    // Validate procurement method
    if (!Object.values(PROCUREMENT_METHODS).includes(planData.procurementMethod)) {
      throw new Error(`Invalid procurement method. Must be one of: ${Object.values(PROCUREMENT_METHODS).join(', ')}`);
    }

    // Validate review type if provided
    if (planData.reviewType && !Object.values(REVIEW_TYPES).includes(planData.reviewType)) {
      throw new Error(`Invalid review type. Must be 'Prior' or 'Post'`);
    }
  }

  /**
   * Sanitize plan data
   */
  static sanitizePlanData(data) {
    const sanitized = { ...data };
    
    if (data.description) {
      sanitized.description = sanitize(data.description);
    }
    
    if (data.specifications) {
      sanitized.specifications = sanitize(data.specifications);
    }

    return sanitized;
  }

  /**
   * Format plan response
   */
  static formatPlanResponse(plan) {
    return {
      id: plan.id,
      referenceNumber: plan.referenceNumber,
      description: plan.description,
      procurementMethod: plan.procurementMethod,
      reviewType: plan.reviewType,
      category: plan.category,
      processStatus: plan.processStatus,
      estimatedAmountUSD: plan.estimatedAmountUSD,
      loanCreditNumber: plan.loanCreditNumber,
      component: plan.component,
      unspscCode: plan.unspscCode,
      workplanId: plan.workplanId,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    };
  }

  /**
   * Calculate workplan summary
   */
  static calculateWorkplanSummary(plans) {
    return {
      totalPlans: plans.length,
      totalValue: plans.reduce((sum, p) => sum + (p.estimatedAmountUSD || 0), 0),
      byMethod: this.groupByMethod(plans),
      byReviewType: this.groupByReviewType(plans),
      byStatus: this.groupByStatus(plans),
      byCategory: this.groupByCategory(plans)
    };
  }

  /**
   * Group plans by method
   */
  static groupByMethod(plans) {
    const grouped = {};
    plans.forEach(plan => {
      const method = plan.procurementMethod || 'Unknown';
      if (!grouped[method]) {
        grouped[method] = { count: 0, totalValue: 0 };
      }
      grouped[method].count++;
      grouped[method].totalValue += plan.estimatedAmountUSD || 0;
    });
    return grouped;
  }

  /**
   * Group plans by review type
   */
  static groupByReviewType(plans) {
    const grouped = { Prior: 0, Post: 0 };
    plans.forEach(plan => {
      if (plan.reviewType === 'Prior') {
        grouped.Prior++;
      } else {
        grouped.Post++;
      }
    });
    return grouped;
  }

  /**
   * Group plans by status
   */
  static groupByStatus(plans) {
    const grouped = {};
    plans.forEach(plan => {
      const status = plan.processStatus || 'Unknown';
      grouped[status] = (grouped[status] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Group plans by category
   */
  static groupByCategory(plans) {
    const grouped = {};
    plans.forEach(plan => {
      const category = plan.category || 'Unknown';
      grouped[category] = (grouped[category] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Calculate plan metrics
   */
  static async calculatePlanMetrics(plan) {
    return {
      estimatedValue: plan.estimatedAmountUSD,
      currency: 'USD',
      procurementMethod: plan.procurementMethod,
      reviewType: plan.reviewType,
      requiresBankApproval: plan.reviewType === REVIEW_TYPES.PRIOR,
      status: plan.processStatus,
      createdDaysAgo: Math.floor((new Date() - new Date(plan.createdAt)) / (1000 * 60 * 60 * 24))
    };
  }

  /**
   * Check if updates are significant
   */
  static hasSignificantChanges(updates) {
    const significantFields = [
      'processStatus',
      'estimatedAmountUSD',
      'reviewType',
      'procurementMethod'
    ];
    return Object.keys(updates).some(key => significantFields.includes(key));
  }

  /**
   * Calculate approval rate
   */
  static calculateApprovalRate(analytics) {
    const total = analytics.reviewTypeBreakdown.Prior || 0;
    const approved = analytics.statusBreakdown.Cleared || 0;
    return total > 0 ? Math.round((approved / total) * 100) : 0;
  }

  /**
   * Calculate method distribution percentages
   */
  static calculateMethodDistribution(methodBreakdown, totalPlans) {
    const distribution = {};
    Object.keys(methodBreakdown).forEach(method => {
      distribution[method] = {
        count: methodBreakdown[method],
        percentage: totalPlans > 0 ? Math.round((methodBreakdown[method] / totalPlans) * 100) : 0
      };
    });
    return distribution;
  }

  /**
   * Calculate status progression
   */
  static calculateStatusProgression(statusBreakdown) {
    const progression = {
      draft: statusBreakdown.Draft || 0,
      inReview: (statusBreakdown.Submitted || 0) + (statusBreakdown['Under Review'] || 0),
      cleared: statusBreakdown.Cleared || 0,
      signed: statusBreakdown.Signed || 0,
      canceled: statusBreakdown.Canceled || 0
    };
    return progression;
  }

  /**
   * Calculate compliance score
   */
  static calculateComplianceScore(analytics) {
    // Simple compliance score based on UNSPSC code presence, review type adherence, etc.
    let score = 100;
    
    // Deduct points for missing UNSPSC codes (if we can track this)
    // Deduct points for delayed approvals
    // Deduct points for missing documentation
    
    return score;
  }

  /**
   * Get plan history (placeholder)
   */
  static async getPlanHistory(planId) {
    // TODO: Implement history retrieval from audit logs
    return [];
  }

  /**
   * ========================================
   * NOTIFICATION METHODS
   * ========================================
   */

  /**
   * Send plan creation notification
   */
  static async sendPlanCreationNotification(plan, userId) {
    try {
      await notificationService.sendNotification({
        recipients: [userId],
        subject: `Procurement Plan Created: ${plan.referenceNumber}`,
        message: `Plan "${plan.description}" has been created successfully.`,
        notificationType: 'plan_created',
        priority: 'normal',
        channels: ['email', 'in_app'],
        entityType: 'plan',
        entityId: plan.id,
        metadata: {
          referenceNumber: plan.referenceNumber,
          procurementMethod: plan.procurementMethod,
          estimatedAmountUSD: plan.estimatedAmountUSD
        }
      }, userId);
    } catch (error) {
      logger.warn('Failed to send plan creation notification', { error: error.message });
    }
  }

  /**
   * Send batch import notification
   */
  static async sendBatchImportNotification(results, sheetName, userId) {
    try {
      await notificationService.sendNotification({
        recipients: [userId],
        subject: `Excel Import Completed: ${sheetName}`,
        message: `Batch import completed: ${results.successful}/${results.total} plans imported successfully.`,
        notificationType: 'batch_import',
        priority: 'normal',
        channels: ['email', 'in_app'],
        metadata: {
          sheetName,
          totalRows: results.total,
          successful: results.successful,
          failed: results.failed
        }
      }, userId);
    } catch (error) {
      logger.warn('Failed to send batch import notification', { error: error.message });
    }
  }

  /**
   * Send plan update notification
   */
  static async sendPlanUpdateNotification(plan, userId) {
    try {
      await notificationService.sendNotification({
        recipients: [userId],
        subject: `Plan Updated: ${plan.referenceNumber}`,
        message: `Plan "${plan.description}" has been updated.`,
        notificationType: 'plan_updated',
        priority: 'normal',
        channels: ['in_app'],
        entityType: 'plan',
        entityId: plan.id,
        metadata: {
          referenceNumber: plan.referenceNumber
        }
      }, userId);
    } catch (error) {
      logger.warn('Failed to send plan update notification', { error: error.message });
    }
  }

  /**
   * Send approval notifications
   */
  static async sendApprovalNotifications(plan, userId) {
    try {
      const subject = plan.reviewType === REVIEW_TYPES.PRIOR
        ? `Bank Approval Required: ${plan.referenceNumber}`
        : `Approval Required: ${plan.referenceNumber}`;

      await notificationService.sendNotification({
        recipients: [userId], // TODO: Get actual approvers
        subject,
        message: `Plan "${plan.description}" has been submitted for approval.`,
        notificationType: 'approval_required',
        priority: 'high',
        channels: ['email', 'in_app'],
        requiresAcknowledgment: true,
        entityType: 'plan',
        entityId: plan.id,
        metadata: {
          referenceNumber: plan.referenceNumber,
          reviewType: plan.reviewType,
          estimatedAmountUSD: plan.estimatedAmountUSD
        }
      }, userId);
    } catch (error) {
      logger.warn('Failed to send approval notifications', { error: error.message });
    }
  }

  /**
   * ========================================
   * AUDIT METHODS
   * ========================================
   */

  /**
   * Create audit log
   */
  static async createAuditLog(auditData) {
    try {
      if (auditService && auditService.logAuditEvent) {
        await auditService.logAuditEvent(auditData);
      }
    } catch (error) {
      logger.warn('Failed to create audit log', { error: error.message });
    }
  }

  /**
   * ========================================
   * LEGACY COMPATIBILITY METHODS
   * ========================================
   */

  static async list(query = {}, options = {}) {
    return await this.getPlans(query, query.userId || 'system', options);
  }

  static async get(id, userId = 'system') {
    return await this.getPlan(id, userId);
  }

  static async create(data, userId = 'system') {
    return await this.createPlan(data, userId);
  }

  static async update(id, data, userId = 'system') {
    return await this.updatePlan(id, data, userId);
  }

  static async remove(id, userId = 'system') {
    return await this.deletePlan(id, userId);
  }
}

module.exports = PlanService;