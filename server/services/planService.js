/**
 * Plan Service
 * 
 * Comprehensive procurement planning with strategic planning, budget management,
 * timeline tracking, approval workflows, and advanced planning analytics
 * Feature 12: Strategic procurement planning and management
 */

const mongoose = require('mongoose');
const Plan = require('../db/models/Plan');
const PlanTemplate = require('../db/models/PlanTemplate');
const Budget = require('../db/models/Budget');
const User = require('../db/models/User');
const Procurement = require('../db/models/Procurement');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const approvalService = require('./approvalService');
const { validateInput, sanitize } = require('../utils/validation');
const { formatDate, formatCurrency, generatePlanId, calculateDateDifference } = require('../utils/helpers');
const { assessPlanRisk, validateBudgetAllocation } = require('../utils/planningAnalytics');
const { generatePlanReport } = require('../utils/reportGenerator');

// Plan types and categories
const PLAN_TYPES = {
  STRATEGIC: 'strategic',
  ANNUAL: 'annual',
  QUARTERLY: 'quarterly',
  PROJECT: 'project',
  EMERGENCY: 'emergency',
  FRAMEWORK: 'framework',
  CATEGORY: 'category',
  SUPPLIER: 'supplier'
};

const PLAN_STATUS = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

const PLANNING_PHASES = {
  INITIATION: 'initiation',
  ANALYSIS: 'analysis',
  STRATEGY: 'strategy',
  BUDGETING: 'budgeting',
  APPROVAL: 'approval',
  EXECUTION: 'execution',
  MONITORING: 'monitoring',
  CLOSURE: 'closure'
};

const PRIORITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

const BUDGET_CATEGORIES = {
  GOODS: 'goods',
  SERVICES: 'services',
  WORKS: 'works',
  CONSULTANCY: 'consultancy',
  ICT: 'ict',
  MAINTENANCE: 'maintenance',
  UTILITIES: 'utilities',
  TRAVEL: 'travel'
};

const PLAN_EVENTS = {
  CREATED: 'plan_created',
  UPDATED: 'plan_updated',
  SUBMITTED: 'plan_submitted',
  APPROVED: 'plan_approved',
  ACTIVATED: 'plan_activated',
  COMPLETED: 'plan_completed',
  CANCELLED: 'plan_cancelled'
};

class PlanService {
  /**
   * Create comprehensive procurement plan
   */
  static async createPlan(planData, userId, requestInfo = {}) {
    try {
      const {
        title,
        description,
        planType = PLAN_TYPES.ANNUAL,
        planPeriod,
        objectives = [],
        scope,
        budgetAllocation,
        procurementItems = [],
        timeline,
        stakeholders = [],
        riskAssessment = {},
        complianceRequirements = [],
        approvalWorkflow = [],
        templateId = null,
        parentPlanId = null,
        departmentId = null,
        organizationUnit = null,
        priority = PRIORITY_LEVELS.MEDIUM,
        metadata = {}
      } = planData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!title || !planPeriod || !budgetAllocation) {
        throw new Error('Title, plan period, and budget allocation are required');
      }

      // Sanitize inputs
      const sanitizedTitle = sanitize(title);
      const sanitizedDescription = sanitize(description || '');

      // Validate plan period
      this.validatePlanPeriod(planPeriod);

      // Validate budget allocation
      const budgetValidation = await validateBudgetAllocation(budgetAllocation, planType);
      if (!budgetValidation.valid) {
        throw new Error(`Budget validation failed: ${budgetValidation.reason}`);
      }

      // Generate plan ID
      const planId = generatePlanId(planType);

      // Load template if specified
      let templateData = null;
      if (templateId) {
        templateData = await this.loadPlanTemplate(templateId);
      }

      // Calculate plan metrics
      const planMetrics = await this.calculatePlanMetrics(procurementItems, budgetAllocation, timeline);

      // Assess planning risks
      const riskAnalysis = await assessPlanRisk(procurementItems, budgetAllocation, timeline, riskAssessment);

      // Create plan record
      const plan = new Plan({
        planId,
        title: sanitizedTitle,
        description: sanitizedDescription,
        
        // Plan classification
        planType,
        priority,
        phase: PLANNING_PHASES.INITIATION,
        status: PLAN_STATUS.DRAFT,
        
        // Planning period
        period: {
          startDate: new Date(planPeriod.startDate),
          endDate: new Date(planPeriod.endDate),
          financialYear: planPeriod.financialYear,
          quarter: planPeriod.quarter,
          duration: calculateDateDifference(planPeriod.startDate, planPeriod.endDate)
        },
        
        // Strategic alignment
        strategy: {
          objectives: objectives.map(obj => ({
            id: obj.id || new mongoose.Types.ObjectId(),
            title: sanitize(obj.title),
            description: sanitize(obj.description || ''),
            weight: obj.weight || 1,
            measurableOutcomes: obj.outcomes || [],
            successCriteria: obj.criteria || [],
            dependencies: obj.dependencies || []
          })),
          scope: sanitize(scope || ''),
          strategicAlignment: planData.strategicAlignment || [],
          performanceIndicators: planData.kpis || []
        },
        
        // Budget management
        budget: {
          totalAllocation: budgetAllocation.total,
          currency: budgetAllocation.currency || 'USD',
          categories: Object.keys(BUDGET_CATEGORIES).map(category => ({
            category,
            allocation: budgetAllocation.categories?.[category] || 0,
            spent: 0,
            committed: 0,
            available: budgetAllocation.categories?.[category] || 0,
            variance: 0
          })),
          contingency: budgetAllocation.contingency || 0,
          approvedBudget: 0,
          budgetSource: budgetAllocation.source || 'general',
          costCenter: budgetAllocation.costCenter,
          budgetCode: budgetAllocation.budgetCode
        },
        
        // Procurement items
        items: procurementItems.map(item => ({
          id: item.id || new mongoose.Types.ObjectId(),
          category: item.category,
          description: sanitize(item.description),
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalValue: (item.quantity || 1) * (item.unitPrice || 0),
          budgetCategory: item.budgetCategory || BUDGET_CATEGORIES.GOODS,
          priority: item.priority || PRIORITY_LEVELS.MEDIUM,
          plannedDate: item.plannedDate ? new Date(item.plannedDate) : null,
          specifications: item.specifications || {},
          vendor: item.preferredVendor || null,
          procurementMethod: item.procurementMethod || 'open_tender',
          approvalLevel: item.approvalLevel || 'standard',
          riskLevel: item.riskLevel || 'medium',
          dependencies: item.dependencies || [],
          status: 'planned'
        })),
        
        // Timeline and milestones
        timeline: {
          milestones: (timeline?.milestones || []).map(milestone => ({
            id: milestone.id || new mongoose.Types.ObjectId(),
            title: sanitize(milestone.title),
            description: sanitize(milestone.description || ''),
            dueDate: new Date(milestone.dueDate),
            dependencies: milestone.dependencies || [],
            deliverables: milestone.deliverables || [],
            responsible: milestone.responsible,
            status: 'pending',
            completedDate: null,
            notes: ''
          })),
          criticalPath: timeline?.criticalPath || [],
          bufferTime: timeline?.bufferTime || 0,
          totalDuration: planMetrics.totalDuration
        },
        
        // Stakeholder management
        stakeholders: stakeholders.map(stakeholder => ({
          userId: stakeholder.userId ? new mongoose.Types.ObjectId(stakeholder.userId) : null,
          role: stakeholder.role,
          responsibility: stakeholder.responsibility,
          department: stakeholder.department,
          contactInfo: {
            email: stakeholder.email,
            phone: stakeholder.phone
          },
          involvement: stakeholder.involvement || 'informed',
          influence: stakeholder.influence || 'medium',
          interest: stakeholder.interest || 'medium'
        })),
        
        // Risk management
        risk: {
          assessment: {
            overallRisk: riskAnalysis.overallRisk,
            riskScore: riskAnalysis.riskScore,
            riskFactors: riskAnalysis.factors || []
          },
          risks: (riskAssessment.risks || []).map(risk => ({
            id: risk.id || new mongoose.Types.ObjectId(),
            title: sanitize(risk.title),
            description: sanitize(risk.description),
            category: risk.category,
            probability: risk.probability || 'medium',
            impact: risk.impact || 'medium',
            riskLevel: risk.riskLevel || 'medium',
            mitigation: {
              strategy: risk.mitigation?.strategy || '',
              actions: risk.mitigation?.actions || [],
              responsible: risk.mitigation?.responsible,
              timeline: risk.mitigation?.timeline,
              cost: risk.mitigation?.cost || 0
            },
            status: 'identified',
            lastReview: new Date()
          })),
          mitigationPlan: riskAssessment.mitigationPlan || [],
          contingencyPlans: riskAssessment.contingencyPlans || []
        },
        
        // Compliance and governance
        compliance: {
          requirements: complianceRequirements.map(req => ({
            standard: req.standard,
            requirement: sanitize(req.requirement),
            status: req.status || 'pending',
            evidence: req.evidence || [],
            responsible: req.responsible,
            dueDate: req.dueDate ? new Date(req.dueDate) : null
          })),
          frameworks: planData.complianceFrameworks || [],
          auditRequirements: planData.auditRequirements || [],
          reportingRequirements: planData.reportingRequirements || []
        },
        
        // Approval workflow
        approval: {
          workflow: approvalWorkflow.map(step => ({
            level: step.level,
            approver: step.approver ? new mongoose.Types.ObjectId(step.approver) : null,
            role: step.role,
            department: step.department,
            sequence: step.sequence || 1,
            required: step.required !== false,
            status: 'pending',
            approvedAt: null,
            comments: '',
            conditions: step.conditions || []
          })),
          currentLevel: 0,
          overallStatus: 'pending',
          submittedAt: null,
          finalApprovalAt: null
        },
        
        // Performance tracking
        performance: {
          metrics: planMetrics,
          tracking: {
            completionRate: 0,
            budgetUtilization: 0,
            timelineAdherence: 100,
            qualityScore: 0,
            stakeholderSatisfaction: 0
          },
          benchmarks: planData.benchmarks || [],
          targets: planData.targets || []
        },
        
        // Organizational context
        organization: {
          departmentId: departmentId ? new mongoose.Types.ObjectId(departmentId) : null,
          organizationUnit,
          parentPlanId: parentPlanId ? new mongoose.Types.ObjectId(parentPlanId) : null,
          childPlans: [],
          relatedPlans: []
        },
        
        // Template and versioning
        template: templateData ? {
          templateId: templateData._id,
          version: templateData.version,
          appliedAt: new Date()
        } : null,
        
        // Lifecycle management
        lifecycle: {
          version: '1.0',
          createdAt: new Date(),
          createdBy: userId,
          lastModified: new Date(),
          modifiedBy: userId,
          statusHistory: [{
            status: PLAN_STATUS.DRAFT,
            phase: PLANNING_PHASES.INITIATION,
            changedAt: new Date(),
            changedBy: userId,
            reason: 'Plan creation'
          }]
        },
        
        // System tracking
        system: {
          creationIP: ipAddress,
          creationUserAgent: userAgent,
          lastAccessIP: ipAddress,
          lastAccessAt: new Date(),
          accessCount: 1,
          editCount: 0
        },
        
        // Metadata and tags
        metadata: {
          tags: metadata.tags || [],
          customFields: metadata.customFields || {},
          externalReferences: metadata.externalReferences || [],
          attachments: metadata.attachments || []
        }
      });

      await plan.save();

      // Create initial budget records
      await this.createPlanBudgetRecords(plan);

      // Set up approval workflow
      if (approvalWorkflow.length > 0) {
        await this.initializeApprovalWorkflow(plan, userId);
      }

      // Create notification for stakeholders
      await this.sendPlanCreationNotifications(plan, userId);

      // Create audit trail
      await auditService.logAuditEvent({
        action: PLAN_EVENTS.CREATED,
        entityType: 'plan',
        entityId: plan._id,
        userId,
        metadata: {
          planId: plan.planId,
          planType,
          totalBudget: budgetAllocation.total,
          itemCount: procurementItems.length,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: 'Procurement plan created successfully',
        plan: {
          id: plan._id,
          planId: plan.planId,
          title: plan.title,
          planType: plan.planType,
          status: plan.status,
          totalBudget: plan.budget.totalAllocation,
          itemCount: plan.items.length,
          period: plan.period
        }
      };

    } catch (error) {
      logger.error('Error creating procurement plan', { 
        error: error.message, 
        planData, 
        userId 
      });
      throw new Error(`Plan creation failed: ${error.message}`);
    }
  }

  /**
   * Update plan with comprehensive tracking
   */
  static async updatePlan(planId, updateData, userId, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Check permissions
      const canUpdate = await this.checkPlanPermission(plan, userId, 'update');
      if (!canUpdate) {
        throw new Error('Insufficient permissions to update plan');
      }

      // Track changes
      const changeLog = this.generateChangeLog(plan, updateData, userId);

      // Apply updates
      const updatedFields = {};
      
      if (updateData.title) {
        updatedFields.title = sanitize(updateData.title);
      }

      if (updateData.description) {
        updatedFields.description = sanitize(updateData.description);
      }

      if (updateData.status && updateData.status !== plan.status) {
        updatedFields.status = updateData.status;
        updatedFields['lifecycle.statusHistory'] = [
          ...plan.lifecycle.statusHistory,
          {
            status: updateData.status,
            changedAt: new Date(),
            changedBy: userId,
            reason: updateData.statusChangeReason || 'Status update'
          }
        ];
      }

      if (updateData.phase && updateData.phase !== plan.phase) {
        updatedFields.phase = updateData.phase;
      }

      if (updateData.budgetAllocation) {
        const budgetValidation = await validateBudgetAllocation(updateData.budgetAllocation, plan.planType);
        if (budgetValidation.valid) {
          updatedFields['budget.totalAllocation'] = updateData.budgetAllocation.total;
          updatedFields['budget.categories'] = this.updateBudgetCategories(plan.budget.categories, updateData.budgetAllocation.categories);
        }
      }

      if (updateData.items) {
        updatedFields.items = this.updateProcurementItems(plan.items, updateData.items, userId);
      }

      if (updateData.timeline) {
        updatedFields['timeline.milestones'] = this.updateTimeline(plan.timeline.milestones, updateData.timeline.milestones, userId);
      }

      if (updateData.risks) {
        updatedFields['risk.risks'] = this.updateRiskAssessment(plan.risk.risks, updateData.risks, userId);
      }

      // Update metadata
      updatedFields['lifecycle.lastModified'] = new Date();
      updatedFields['lifecycle.modifiedBy'] = userId;
      updatedFields['lifecycle.version'] = this.incrementVersion(plan.lifecycle.version);
      updatedFields['system.lastAccessIP'] = ipAddress;
      updatedFields['system.lastAccessAt'] = new Date();
      updatedFields['system.editCount'] = (plan.system.editCount || 0) + 1;

      // Apply updates
      const updatedPlan = await Plan.findByIdAndUpdate(
        planId,
        { $set: updatedFields },
        { new: true, runValidators: true }
      );

      // Recalculate metrics if items or budget changed
      if (updateData.items || updateData.budgetAllocation) {
        await this.recalculatePlanMetrics(updatedPlan);
      }

      // Send notifications for significant changes
      if (changeLog.significant) {
        await this.sendPlanUpdateNotifications(updatedPlan, changeLog, userId);
      }

      // Create audit trail
      await auditService.logAuditEvent({
        action: PLAN_EVENTS.UPDATED,
        entityType: 'plan',
        entityId: plan._id,
        userId,
        metadata: {
          planId: plan.planId,
          changes: changeLog.changes,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: 'Plan updated successfully',
        plan: {
          id: updatedPlan._id,
          planId: updatedPlan.planId,
          title: updatedPlan.title,
          status: updatedPlan.status,
          version: updatedPlan.lifecycle.version,
          lastModified: updatedPlan.lifecycle.lastModified
        },
        changeLog
      };

    } catch (error) {
      logger.error('Error updating plan', { 
        error: error.message, 
        planId, 
        updateData, 
        userId 
      });
      throw new Error(`Plan update failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive plan details
   */
  static async getPlan(planId, userId, options = {}) {
    try {
      const {
        includeHistory = false,
        includeMetrics = true,
        includeRiskAnalysis = true,
        includeStakeholders = true,
        includeDocuments = false
      } = options;

      const plan = await Plan.findById(planId)
        .populate('stakeholders.userId', 'name email department')
        .populate('approval.workflow.approver', 'name email role')
        .populate('organization.departmentId', 'name code')
        .lean();

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Check access permissions
      const hasAccess = await this.checkPlanAccess(plan, userId);
      if (!hasAccess) {
        throw new Error('Access denied to plan');
      }

      // Build comprehensive plan response
      const response = {
        ...plan,
        metrics: includeMetrics ? await this.calculateCurrentMetrics(plan) : null,
        riskAnalysis: includeRiskAnalysis ? await this.getCurrentRiskAnalysis(plan) : null,
        timeline: {
          ...plan.timeline,
          progress: await this.calculateTimelineProgress(plan)
        },
        budget: {
          ...plan.budget,
          utilization: await this.calculateBudgetUtilization(plan),
          variance: await this.calculateBudgetVariance(plan)
        }
      };

      if (includeHistory) {
        response.history = await this.getPlanHistory(planId);
      }

      if (includeDocuments) {
        response.documents = await this.getPlanDocuments(planId);
      }

      // Update access tracking
      await this.updatePlanAccess(planId, userId);

      return {
        success: true,
        plan: response
      };

    } catch (error) {
      logger.error('Error getting plan', { 
        error: error.message, 
        planId, 
        userId 
      });
      throw new Error(`Plan retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get filtered list of plans
   */
  static async getPlans(filters = {}, userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeMetrics = false
      } = options;

      // Build query
      const query = await this.buildPlanQuery(filters, userId);

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [plans, total] = await Promise.all([
        Plan.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .populate('stakeholders.userId', 'name email')
          .populate('organization.departmentId', 'name code')
          .lean(),
        Plan.countDocuments(query)
      ]);

      // Process plans
      const processedPlans = await Promise.all(
        plans.map(async plan => ({
          ...plan,
          metrics: includeMetrics ? await this.calculateCurrentMetrics(plan) : null,
          progress: await this.calculateOverallProgress(plan)
        }))
      );

      return {
        success: true,
        plans: processedPlans,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1
        },
        summary: await this.getPlansSummary(query)
      };

    } catch (error) {
      logger.error('Error getting plans list', { 
        error: error.message, 
        filters, 
        userId 
      });
      throw new Error(`Plans retrieval failed: ${error.message}`);
    }
  }

  /**
   * Submit plan for approval
   */
  static async submitPlanForApproval(planId, userId, submissionData = {}) {
    try {
      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Validate plan readiness
      const readinessCheck = await this.validatePlanReadiness(plan);
      if (!readinessCheck.ready) {
        throw new Error(`Plan not ready for submission: ${readinessCheck.issues.join(', ')}`);
      }

      // Update plan status
      plan.status = PLAN_STATUS.UNDER_REVIEW;
      plan.phase = PLANNING_PHASES.APPROVAL;
      plan.approval.submittedAt = new Date();
      plan.approval.overallStatus = 'under_review';

      // Update lifecycle
      plan.lifecycle.statusHistory.push({
        status: PLAN_STATUS.UNDER_REVIEW,
        phase: PLANNING_PHASES.APPROVAL,
        changedAt: new Date(),
        changedBy: userId,
        reason: submissionData.reason || 'Submitted for approval'
      });

      await plan.save();

      // Initialize approval workflow
      const approvalResult = await approvalService.initializeApproval({
        entityType: 'plan',
        entityId: plan._id,
        workflowType: 'plan_approval',
        requestedBy: userId,
        approvalData: {
          planId: plan.planId,
          planType: plan.planType,
          totalBudget: plan.budget.totalAllocation,
          priority: plan.priority
        }
      }, userId);

      // Send approval notifications
      await this.sendApprovalNotifications(plan, userId);

      // Create audit trail
      await auditService.logAuditEvent({
        action: PLAN_EVENTS.SUBMITTED,
        entityType: 'plan',
        entityId: plan._id,
        userId,
        metadata: {
          planId: plan.planId,
          approvalWorkflowId: approvalResult.workflowId
        }
      });

      return {
        success: true,
        message: 'Plan submitted for approval successfully',
        approvalWorkflowId: approvalResult.workflowId,
        nextApprovers: approvalResult.nextApprovers
      };

    } catch (error) {
      logger.error('Error submitting plan for approval', { 
        error: error.message, 
        planId, 
        userId 
      });
      throw new Error(`Plan submission failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive plan report
   */
  static async generatePlanReport(planId, reportType = 'comprehensive', userId) {
    try {
      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const reportData = {
        plan,
        metrics: await this.calculateCurrentMetrics(plan),
        riskAnalysis: await this.getCurrentRiskAnalysis(plan),
        budgetAnalysis: await this.getBudgetAnalysis(plan),
        timelineAnalysis: await this.getTimelineAnalysis(plan),
        stakeholderMatrix: await this.getStakeholderMatrix(plan),
        complianceStatus: await this.getComplianceStatus(plan),
        performanceIndicators: await this.getPerformanceIndicators(plan)
      };

      const report = await generatePlanReport(reportData, reportType);

      return {
        success: true,
        report
      };

    } catch (error) {
      logger.error('Error generating plan report', { 
        error: error.message, 
        planId, 
        reportType, 
        userId 
      });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  // Helper methods for complex operations
  validatePlanPeriod(period) {
    if (!period.startDate || !period.endDate) {
      throw new Error('Start date and end date are required');
    }
    if (new Date(period.startDate) >= new Date(period.endDate)) {
      throw new Error('End date must be after start date');
    }
  }

  async calculatePlanMetrics(items, budget, timeline) {
    return {
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + item.totalValue, 0),
      averageItemValue: items.length > 0 ? items.reduce((sum, item) => sum + item.totalValue, 0) / items.length : 0,
      highValueItems: items.filter(item => item.totalValue > 10000).length,
      criticalItems: items.filter(item => item.priority === PRIORITY_LEVELS.CRITICAL).length,
      totalDuration: timeline ? calculateDateDifference(timeline.startDate, timeline.endDate) : 0
    };
  }

  incrementVersion(currentVersion) {
    const parts = currentVersion.split('.');
    const patch = parseInt(parts[2] || 0) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  generateChangeLog(originalPlan, updateData, userId) {
    const changes = [];
    let significant = false;

    // Track significant changes
    if (updateData.status && updateData.status !== originalPlan.status) {
      changes.push({ field: 'status', from: originalPlan.status, to: updateData.status });
      significant = true;
    }

    if (updateData.budgetAllocation && updateData.budgetAllocation.total !== originalPlan.budget.totalAllocation) {
      changes.push({ field: 'budget', from: originalPlan.budget.totalAllocation, to: updateData.budgetAllocation.total });
      significant = true;
    }

    return { changes, significant, timestamp: new Date(), userId };
  }

  // Placeholder methods for complex operations
  async loadPlanTemplate(templateId) { return null; }
  async createPlanBudgetRecords(plan) { }
  async initializeApprovalWorkflow(plan, userId) { }
  async checkPlanPermission(plan, userId, action) { return true; }
  async checkPlanAccess(plan, userId) { return true; }
  async updateBudgetCategories(currentCategories, newCategories) { return currentCategories; }
  async updateProcurementItems(currentItems, newItems, userId) { return currentItems; }
  async updateTimeline(currentMilestones, newMilestones, userId) { return currentMilestones; }
  async updateRiskAssessment(currentRisks, newRisks, userId) { return currentRisks; }
  async recalculatePlanMetrics(plan) { }
  async updatePlanAccess(planId, userId) { }
  async calculateCurrentMetrics(plan) { return {}; }
  async getCurrentRiskAnalysis(plan) { return {}; }
  async calculateTimelineProgress(plan) { return 0; }
  async calculateBudgetUtilization(plan) { return {}; }
  async calculateBudgetVariance(plan) { return {}; }
  async getPlanHistory(planId) { return []; }
  async getPlanDocuments(planId) { return []; }
  async calculateOverallProgress(plan) { return 0; }
  async buildPlanQuery(filters, userId) { return {}; }
  async getPlansSummary(query) { return {}; }
  async validatePlanReadiness(plan) { return { ready: true, issues: [] }; }
  async getBudgetAnalysis(plan) { return {}; }
  async getTimelineAnalysis(plan) { return {}; }
  async getStakeholderMatrix(plan) { return {}; }
  async getComplianceStatus(plan) { return {}; }
  async getPerformanceIndicators(plan) { return {}; }

  // Notification methods
  async sendPlanCreationNotifications(plan, userId) {
    await notificationService.sendNotification({
      recipients: plan.stakeholders.map(s => s.userId).filter(Boolean),
      subject: `New Plan Created: ${plan.title}`,
      message: `A new procurement plan "${plan.title}" has been created and requires your attention.`,
      notificationType: 'plan',
      priority: 'normal',
      channels: ['email', 'in_app'],
      procurementId: null,
      entityType: 'plan',
      entityId: plan._id,
      metadata: { planId: plan.planId, planType: plan.planType }
    }, userId);
  }

  async sendPlanUpdateNotifications(plan, changeLog, userId) {
    if (changeLog.significant) {
      await notificationService.sendNotification({
        recipients: plan.stakeholders.map(s => s.userId).filter(Boolean),
        subject: `Plan Updated: ${plan.title}`,
        message: `Procurement plan "${plan.title}" has been updated with significant changes.`,
        notificationType: 'plan',
        priority: 'normal',
        channels: ['email', 'in_app'],
        entityType: 'plan',
        entityId: plan._id,
        metadata: { planId: plan.planId, changes: changeLog.changes }
      }, userId);
    }
  }

  async sendApprovalNotifications(plan, userId) {
    const approvers = plan.approval.workflow
      .filter(step => step.status === 'pending')
      .map(step => step.approver)
      .filter(Boolean);

    if (approvers.length > 0) {
      await notificationService.sendNotification({
        recipients: approvers,
        subject: `Plan Approval Required: ${plan.title}`,
        message: `Procurement plan "${plan.title}" has been submitted for your approval.`,
        notificationType: 'approval',
        priority: 'high',
        channels: ['email', 'in_app'],
        requiresAcknowledgment: true,
        entityType: 'plan',
        entityId: plan._id,
        metadata: { planId: plan.planId, totalBudget: plan.budget.totalAllocation }
      }, userId);
    }
  }

  // Legacy compatibility methods
  async list(query = {}, options = {}) {
    return await this.getPlans(query, query.userId || 'system', options);
  }

  async get(id, userId = 'system') {
    return await this.getPlan(id, userId);
  }

  async create(data, userId = 'system') {
    return await this.createPlan(data, userId);
  }

  async update(id, data, userId = 'system') {
    return await this.updatePlan(id, data, userId);
  }

  async remove(id, userId = 'system') {
    try {
      const plan = await Plan.findByIdAndUpdate(
        id, 
        { 
          status: PLAN_STATUS.CANCELLED,
          'lifecycle.lastModified': new Date(),
          'lifecycle.modifiedBy': userId
        },
        { new: true }
      );
      
      if (!plan) {
        throw new Error('Plan not found');
      }

      return { success: true, message: 'Plan cancelled successfully' };
    } catch (error) {
      throw new Error(`Plan deletion failed: ${error.message}`);
    }
  }
}

module.exports = PlanService;
