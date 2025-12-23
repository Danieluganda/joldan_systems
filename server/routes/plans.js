/**
 * Procurement Plans Routes
 * 
 * Routes for comprehensive procurement planning, budgeting, and strategic sourcing management
 * Feature 17: Advanced procurement planning system with budget management, forecasting, and compliance
 * 
 * Enhanced with strategic planning, budget tracking, approval workflows, risk assessment,
 * compliance monitoring, multi-year planning, and comprehensive procurement lifecycle management
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission, rateLimitByUser } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize, validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logStatusChange, logApproval } = require('../middleware/auditLogger');

// Service imports
const planService = require('../services/planService');
const budgetService = require('../services/budgetService');
const forecastService = require('../services/forecastService');
const approvalService = require('../services/approvalService');
const complianceService = require('../services/complianceService');
const riskService = require('../services/riskService');
const reportingService = require('../services/reportingService');
const notificationService = require('../services/notificationService');
const templateService = require('../services/templateService');
const documentService = require('../services/documentService');

// Utility imports
const { calculateBudgetVariance, validatePlanSchedule, generatePlanNumber } = require('../utils/planUtils');
const { formatCurrency, parseBudgetAllocation } = require('../utils/budgetUtils');
const logger = require('../utils/logger');

// Validation schemas
const planValidation = {
  create: {
    title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
    description: { type: 'string', required: true, minLength: 20, maxLength: 2000 },
    planType: { 
      type: 'string', 
      enum: ['annual', 'quarterly', 'project_based', 'emergency', 'strategic', 'operational'], 
      required: true 
    },
    fiscalYear: { type: 'number', required: true, min: 2020, max: 2030 },
    startDate: { type: 'string', format: 'date', required: true },
    endDate: { type: 'string', format: 'date', required: true },
    department: { type: 'string', required: true, maxLength: 100 },
    planOwner: { type: 'string', required: true },
    stakeholders: { type: 'array', items: { type: 'string' }, minItems: 1 },
    budget: {
      type: 'object',
      required: true,
      properties: {
        totalAmount: { type: 'number', required: true, min: 0 },
        currency: { type: 'string', required: true, enum: ['USD', 'EUR', 'GBP', 'CAD'], default: 'USD' },
        allocations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', required: true, maxLength: 100 },
              amount: { type: 'number', required: true, min: 0 },
              percentage: { type: 'number', min: 0, max: 100 },
              description: { type: 'string', maxLength: 500 }
            }
          },
          required: true,
          minItems: 1
        },
        contingency: { type: 'number', min: 0, max: 50, default: 10 }, // Percentage
        approvedAmount: { type: 'number', min: 0 },
        spentAmount: { type: 'number', min: 0, default: 0 },
        committedAmount: { type: 'number', min: 0, default: 0 }
      }
    },
    objectives: { 
      type: 'array', 
      items: { 
        type: 'object',
        properties: {
          title: { type: 'string', required: true, maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
          targetDate: { type: 'string', format: 'date' },
          metrics: { type: 'array', items: { type: 'object' } },
          status: { type: 'string', enum: ['not_started', 'in_progress', 'completed', 'cancelled'], default: 'not_started' }
        }
      },
      required: true,
      minItems: 1
    },
    categories: { 
      type: 'array', 
      items: { 
        type: 'string', 
        enum: ['goods', 'services', 'works', 'consultancy', 'technology', 'maintenance'] 
      },
      required: true
    },
    sourcing: {
      type: 'object',
      properties: {
        strategy: { type: 'string', enum: ['competitive_bidding', 'single_source', 'framework', 'spot_buy'], required: true },
        methods: { type: 'array', items: { type: 'string' } },
        suppliers: {
          type: 'object',
          properties: {
            preferred: { type: 'array', items: { type: 'string' } },
            blacklisted: { type: 'array', items: { type: 'string' } },
            qualification_criteria: { type: 'array', items: { type: 'object' } }
          }
        },
        sustainability: {
          type: 'object',
          properties: {
            requirements: { type: 'array', items: { type: 'string' } },
            certifications: { type: 'array', items: { type: 'string' } },
            targets: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    },
    compliance: {
      type: 'object',
      properties: {
        regulations: { type: 'array', items: { type: 'string' }, required: true },
        policies: { type: 'array', items: { type: 'string' }, required: true },
        approvalLevels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              threshold: { type: 'number', required: true },
              approvers: { type: 'array', items: { type: 'string' }, required: true },
              conditions: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        auditRequirements: { type: 'array', items: { type: 'string' } }
      }
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', required: true, maxLength: 200 },
          description: { type: 'string', required: true, maxLength: 1000 },
          category: { type: 'string', enum: ['financial', 'operational', 'regulatory', 'market', 'supplier'], required: true },
          probability: { type: 'string', enum: ['very_low', 'low', 'medium', 'high', 'very_high'], required: true },
          impact: { type: 'string', enum: ['negligible', 'minor', 'moderate', 'major', 'severe'], required: true },
          mitigation: { type: 'string', required: true, maxLength: 1000 },
          owner: { type: 'string', required: true },
          targetDate: { type: 'string', format: 'date' }
        }
      },
      default: []
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', required: true, maxLength: 200 },
          description: { type: 'string', maxLength: 500 },
          targetDate: { type: 'string', format: 'date', required: true },
          dependencies: { type: 'array', items: { type: 'string' } },
          deliverables: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'overdue'], default: 'pending' }
        }
      },
      default: []
    },
    attachments: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    isTemplate: { type: 'boolean', default: false },
    templateId: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    visibility: { type: 'string', enum: ['private', 'department', 'organization', 'public'], default: 'department' }
  },
  update: {
    title: { type: 'string', minLength: 5, maxLength: 200 },
    description: { type: 'string', minLength: 20, maxLength: 2000 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    planOwner: { type: 'string' },
    stakeholders: { type: 'array', items: { type: 'string' } },
    budget: { type: 'object' },
    objectives: { type: 'array', items: { type: 'object' } },
    categories: { type: 'array', items: { type: 'string' } },
    sourcing: { type: 'object' },
    compliance: { type: 'object' },
    risks: { type: 'array', items: { type: 'object' } },
    milestones: { type: 'array', items: { type: 'object' } },
    attachments: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    visibility: { type: 'string', enum: ['private', 'department', 'organization', 'public'] }
  },
  query: {
    planType: { type: 'string', enum: ['annual', 'quarterly', 'project_based', 'emergency', 'strategic', 'operational'] },
    fiscalYear: { type: 'number', min: 2020, max: 2030 },
    department: { type: 'string' },
    planOwner: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'submitted', 'under_review', 'approved', 'active', 'completed', 'cancelled'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    category: { type: 'string', enum: ['goods', 'services', 'works', 'consultancy', 'technology', 'maintenance'] },
    budgetMin: { type: 'number', min: 0 },
    budgetMax: { type: 'number', min: 0 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    search: { type: 'string', minLength: 3, maxLength: 100 },
    tags: { type: 'string' }, // Comma-separated tags
    stakeholderId: { type: 'string' },
    isTemplate: { type: 'boolean' },
    hasRisks: { type: 'boolean' },
    isOverBudget: { type: 'boolean' },
    isOverdue: { type: 'boolean' },
    approvalStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
    complianceStatus: { type: 'string', enum: ['compliant', 'non_compliant', 'pending_review'] },
    includeArchived: { type: 'boolean', default: false },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 200, default: 20 },
    sortBy: { 
      type: 'string', 
      enum: ['createdAt', 'startDate', 'endDate', 'title', 'budget', 'status', 'priority'], 
      default: 'createdAt' 
    },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeBudgetDetails: { type: 'boolean', default: false },
    includeMetrics: { type: 'boolean', default: false }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  },
  approval: {
    action: { type: 'string', enum: ['approve', 'reject', 'request_changes'], required: true },
    comments: { type: 'string', maxLength: 1000 },
    conditions: { type: 'array', items: { type: 'string' } },
    budgetAdjustments: {
      type: 'object',
      properties: {
        totalAmount: { type: 'number', min: 0 },
        allocations: { type: 'array', items: { type: 'object' } }
      }
    },
    approvalLevel: { type: 'string', required: true },
    nextApprovers: { type: 'array', items: { type: 'string' } }
  },
  forecast: {
    period: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'], required: true },
    horizon: { type: 'number', min: 1, max: 60, required: true }, // months
    assumptions: { type: 'array', items: { type: 'object' }, required: true },
    scenarios: { 
      type: 'array', 
      items: { 
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
          probability: { type: 'number', min: 0, max: 100 },
          adjustments: { type: 'object' }
        }
      }
    },
    includeInflation: { type: 'boolean', default: true },
    inflationRate: { type: 'number', min: 0, max: 50, default: 3 },
    includeRiskFactors: { type: 'boolean', default: true }
  }
};

/**
 * @route   GET /api/plans
 * @desc    Get procurement plans with advanced filtering and analytics
 * @access  Private - requires 'plans:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('plans:read'),
  validateQuery(planValidation.query),
  sanitize(),
  logView('plans', 'list'),
  asyncHandler(async (req, res) => {
    const {
      planType,
      fiscalYear,
      department,
      planOwner,
      status,
      priority,
      category,
      budgetMin,
      budgetMax,
      startDate,
      endDate,
      search,
      tags,
      stakeholderId,
      isTemplate,
      hasRisks,
      isOverBudget,
      isOverdue,
      approvalStatus,
      complianceStatus,
      includeArchived = false,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeBudgetDetails = false,
      includeMetrics = false
    } = req.query;

    // Build filter criteria
    const filters = {
      planType,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      department,
      planOwner,
      status,
      priority,
      category,
      budget: {
        min: budgetMin ? parseFloat(budgetMin) : undefined,
        max: budgetMax ? parseFloat(budgetMax) : undefined
      },
      dateRange: {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
      },
      textSearch: search,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      stakeholderId,
      isTemplate: isTemplate !== undefined ? isTemplate === 'true' : undefined,
      hasRisks: hasRisks !== undefined ? hasRisks === 'true' : undefined,
      isOverBudget: isOverBudget !== undefined ? isOverBudget === 'true' : undefined,
      isOverdue: isOverdue !== undefined ? isOverdue === 'true' : undefined,
      approvalStatus,
      complianceStatus,
      includeArchived: includeArchived === 'true'
    };

    // Apply user-level filtering based on permissions
    if (!req.user.permissions.includes('plans:read:all')) {
      filters.$or = [
        { createdBy: req.user.id },
        { planOwner: req.user.id },
        { stakeholders: req.user.id },
        { 'approvalWorkflow.approvers': req.user.id },
        { visibility: { $in: ['department', 'organization', 'public'] } }
      ];
    }

    const result = await planService.getPlans({
      filters,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeBudgetDetails: includeBudgetDetails === 'true',
      includeStakeholders: true,
      includeApprovalStatus: true,
      includeComplianceStatus: true,
      includeMilestones: true
    });

    // Get aggregated metrics if requested
    let metrics = null;
    if (includeMetrics === 'true') {
      metrics = await planService.getAggregatedMetrics(filters);
    }

    res.json({
      success: true,
      data: result.plans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: result.totalPages,
        totalRecords: result.totalRecords,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      summary: {
        totalBudget: result.totalBudget,
        totalAllocated: result.totalAllocated,
        totalSpent: result.totalSpent,
        budgetUtilization: result.budgetUtilization,
        statusBreakdown: result.statusBreakdown,
        departmentBreakdown: result.departmentBreakdown,
        priorityBreakdown: result.priorityBreakdown,
        overdueCount: result.overdueCount,
        overBudgetCount: result.overBudgetCount,
        pendingApprovalsCount: result.pendingApprovalsCount
      },
      metrics,
      filters
    });
  })
);

/**
 * @route   POST /api/plans
 * @desc    Create new procurement plan
 * @access  Private - requires 'plans:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('plans:create'),
  rateLimitByUser(20, '1h'), // 20 plans per hour per user
  validateBody(planValidation.create),
  sanitize(),
  logCreate('plans'),
  asyncHandler(async (req, res) => {
    const planData = {
      ...req.body,
      createdBy: req.user.id,
      planNumber: await generatePlanNumber(req.body.planType, req.body.fiscalYear),
      status: 'draft',
      createdAt: new Date(),
      version: 1
    };

    // Validate date ranges
    if (new Date(planData.startDate) >= new Date(planData.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Validate budget allocations sum up correctly
    const totalAllocated = planData.budget.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (Math.abs(totalAllocated - planData.budget.totalAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Budget allocations must sum to total budget amount'
      });
    }

    // Validate stakeholders exist
    const stakeholderValidation = await planService.validateStakeholders(planData.stakeholders);
    if (!stakeholderValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: stakeholderValidation.message
      });
    }

    // Apply template if specified
    if (planData.templateId) {
      const template = await templateService.getPlanTemplate(planData.templateId);
      if (!template) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan template'
        });
      }
      
      // Merge template data
      planData.objectives = template.objectives || planData.objectives;
      planData.compliance = template.compliance || planData.compliance;
      planData.risks = template.risks || planData.risks;
      planData.milestones = template.milestones || planData.milestones;
    }

    // Set up approval workflow based on budget amount
    planData.approvalWorkflow = await planService.setupApprovalWorkflow(
      planData.budget.totalAmount,
      planData.department,
      planData.compliance.approvalLevels
    );

    // Perform compliance checks
    const complianceCheck = await complianceService.validatePlan(planData);
    planData.complianceStatus = complianceCheck.status;
    planData.complianceIssues = complianceCheck.issues;

    // Calculate risk scores
    const riskAssessment = await riskService.assessPlanRisks(planData.risks);
    planData.riskScore = riskAssessment.totalScore;
    planData.riskLevel = riskAssessment.level;

    const plan = await planService.create(planData);

    // Send notifications to stakeholders
    await notificationService.notifyPlanCreated(plan.id, planData.stakeholders);

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Procurement plan created successfully'
    });
  })
);

/**
 * @route   GET /api/plans/:id
 * @desc    Get procurement plan by ID with comprehensive details
 * @access  Private - requires 'plans:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['plans:read', 'plans:read:own']),
  validateParams(planValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'plans:read:all'),
  logView('plans', 'detail'),
  asyncHandler(async (req, res) => {
    const plan = await planService.getById(req.params.id, {
      includeStakeholders: true,
      includeBudgetDetails: true,
      includeApprovalHistory: true,
      includeComplianceStatus: true,
      includeRiskAssessment: true,
      includeMilestones: true,
      includeAttachments: true,
      includeAuditTrail: true,
      includeRelatedRFQs: true,
      includePerformanceMetrics: true
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    // Check access permissions
    if (!req.user.permissions.includes('plans:read:all')) {
      const hasAccess = plan.createdBy === req.user.id ||
                       plan.planOwner === req.user.id ||
                       plan.stakeholders?.includes(req.user.id) ||
                       plan.approvalWorkflow?.approvers?.includes(req.user.id) ||
                       ['department', 'organization', 'public'].includes(plan.visibility);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this procurement plan'
        });
      }
    }

    // Calculate current metrics
    const currentMetrics = await planService.calculateCurrentMetrics(plan.id);

    res.json({
      success: true,
      data: {
        ...plan,
        currentMetrics,
        budgetUtilization: calculateBudgetVariance(plan.budget),
        scheduleStatus: validatePlanSchedule(plan),
        nextMilestone: plan.milestones?.find(m => m.status === 'pending'),
        pendingApprovals: plan.approvalWorkflow?.pendingApprovals || []
      }
    });
  })
);

/**
 * @route   PUT /api/plans/:id
 * @desc    Update procurement plan
 * @access  Private - requires 'plans:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['plans:update', 'plans:update:own']),
  validateParams(planValidation.params),
  validateBody(planValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'createdBy', 'plans:update:all'),
  logUpdate('plans'),
  asyncHandler(async (req, res) => {
    const planId = req.params.id;
    const updates = req.body;

    const existingPlan = await planService.getById(planId);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    // Check if plan is in editable state
    const editableStates = ['draft', 'returned_for_changes'];
    if (!editableStates.includes(existingPlan.status)) {
      return res.status(400).json({
        success: false,
        message: 'Plan cannot be modified in current status'
      });
    }

    // Validate budget changes if provided
    if (updates.budget) {
      const totalAllocated = updates.budget.allocations?.reduce((sum, allocation) => sum + allocation.amount, 0);
      if (totalAllocated && updates.budget.totalAmount && Math.abs(totalAllocated - updates.budget.totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'Budget allocations must sum to total budget amount'
        });
      }
    }

    // Version management
    updates.version = existingPlan.version + 1;
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    // Re-run compliance checks if compliance data changed
    if (updates.compliance) {
      const complianceCheck = await complianceService.validatePlan({
        ...existingPlan,
        ...updates
      });
      updates.complianceStatus = complianceCheck.status;
      updates.complianceIssues = complianceCheck.issues;
    }

    // Re-assess risks if risks changed
    if (updates.risks) {
      const riskAssessment = await riskService.assessPlanRisks(updates.risks);
      updates.riskScore = riskAssessment.totalScore;
      updates.riskLevel = riskAssessment.level;
    }

    const updatedPlan = await planService.update(planId, updates);

    // Send notifications for significant changes
    await notificationService.notifyPlanUpdated(planId, updates, existingPlan.stakeholders);

    res.json({
      success: true,
      data: updatedPlan,
      message: 'Procurement plan updated successfully'
    });
  })
);

/**
 * @route   POST /api/plans/:id/submit
 * @desc    Submit plan for approval
 * @access  Private - requires 'plans:submit' permission
 */
router.post('/:id/submit',
  verifyToken,
  checkPermission('plans:submit'),
  validateParams(planValidation.params),
  validateBody({
    submissionNote: { type: 'string', maxLength: 1000 },
    urgentReview: { type: 'boolean', default: false },
    requestedApprovers: { type: 'array', items: { type: 'string' } }
  }),
  sanitize(),
  logStatusChange('plans'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { submissionNote, urgentReview = false, requestedApprovers } = req.body;

    const plan = await planService.getById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    if (plan.status !== 'draft' && plan.status !== 'returned_for_changes') {
      return res.status(400).json({
        success: false,
        message: 'Plan is not in submittable state'
      });
    }

    // Validate plan completeness
    const validationResult = await planService.validateForSubmission(id);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Plan validation failed',
        errors: validationResult.errors
      });
    }

    // Submit plan
    const submission = await planService.submit(id, {
      submittedBy: req.user.id,
      submissionNote,
      urgentReview,
      requestedApprovers,
      submittedAt: new Date()
    });

    // Start approval workflow
    await approvalService.startPlanApproval(id, {
      submitterId: req.user.id,
      urgentReview,
      requestedApprovers
    });

    // Send notifications to approvers
    await notificationService.notifyPlanSubmitted(id, submission.approvers);

    res.json({
      success: true,
      data: submission,
      message: 'Plan submitted for approval successfully'
    });
  })
);

/**
 * @route   POST /api/plans/:id/approve
 * @desc    Approve or reject plan
 * @access  Private - requires 'plans:approve' permission
 */
router.post('/:id/approve',
  verifyToken,
  checkPermission('plans:approve'),
  validateParams(planValidation.params),
  validateBody(planValidation.approval),
  sanitize(),
  logApproval('plans'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      action,
      comments,
      conditions,
      budgetAdjustments,
      approvalLevel,
      nextApprovers
    } = req.body;

    const plan = await planService.getById(id, { includeApprovalWorkflow: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    // Check if user is authorized approver
    const isAuthorizedApprover = plan.approvalWorkflow?.currentApprovers?.includes(req.user.id) ||
                                req.user.permissions.includes('plans:approve:all');

    if (!isAuthorizedApprover) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve this plan'
      });
    }

    const approvalData = {
      action,
      approvedBy: req.user.id,
      comments,
      conditions,
      budgetAdjustments,
      approvalLevel,
      nextApprovers,
      approvedAt: new Date()
    };

    const result = await approvalService.processApproval(id, approvalData);

    // Update plan status based on approval result
    let newStatus = plan.status;
    if (result.isFullyApproved) {
      newStatus = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'request_changes') {
      newStatus = 'returned_for_changes';
    } else if (result.hasMoreApprovals) {
      newStatus = 'under_review';
    }

    await planService.updateStatus(id, newStatus);

    // Send notifications
    await notificationService.notifyPlanApproval(id, result);

    res.json({
      success: true,
      data: result,
      message: `Plan ${action}ed successfully`
    });
  })
);

/**
 * @route   POST /api/plans/:id/activate
 * @desc    Activate approved plan
 * @access  Private - requires 'plans:activate' permission
 */
router.post('/:id/activate',
  verifyToken,
  checkPermission('plans:activate'),
  validateParams(planValidation.params),
  validateBody({
    activationNote: { type: 'string', maxLength: 500 },
    effectiveDate: { type: 'string', format: 'date' }
  }),
  sanitize(),
  logStatusChange('plans'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { activationNote, effectiveDate } = req.body;

    const plan = await planService.getById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    if (plan.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved plans can be activated'
      });
    }

    const activation = await planService.activate(id, {
      activatedBy: req.user.id,
      activationNote,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      activatedAt: new Date()
    });

    // Initialize budget tracking
    await budgetService.initializePlanBudget(id, plan.budget);

    // Create initial milestones
    await planService.createPlanMilestones(id);

    // Send activation notifications
    await notificationService.notifyPlanActivated(id, plan.stakeholders);

    res.json({
      success: true,
      data: activation,
      message: 'Plan activated successfully'
    });
  })
);

/**
 * @route   GET /api/plans/:id/budget
 * @desc    Get detailed budget information and tracking
 * @access  Private - requires 'plans:read' permission
 */
router.get('/:id/budget',
  verifyToken,
  checkPermission('plans:read'),
  validateParams(planValidation.params),
  validateQuery({
    includeTransactions: { type: 'boolean', default: false },
    includeForecasting: { type: 'boolean', default: false },
    includeTrends: { type: 'boolean', default: false }
  }),
  logView('plans', 'budget'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { includeTransactions = false, includeForecasting = false, includeTrends = false } = req.query;

    const plan = await planService.getById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const budgetData = await budgetService.getPlanBudget(id, {
      includeTransactions: includeTransactions === 'true',
      includeAllocations: true,
      includeVarianceAnalysis: true,
      includeSpendingHistory: true
    });

    let forecasting = null;
    if (includeForecasting === 'true') {
      forecasting = await forecastService.generateBudgetForecast(id);
    }

    let trends = null;
    if (includeTrends === 'true') {
      trends = await budgetService.getBudgetTrends(id);
    }

    res.json({
      success: true,
      data: {
        budget: budgetData,
        forecasting,
        trends,
        utilization: calculateBudgetVariance(budgetData),
        alerts: await budgetService.getBudgetAlerts(id)
      }
    });
  })
);

/**
 * @route   POST /api/plans/:id/forecast
 * @desc    Generate budget and timeline forecasting
 * @access  Private - requires 'plans:forecast' permission
 */
router.post('/:id/forecast',
  verifyToken,
  checkPermission('plans:forecast'),
  validateParams(planValidation.params),
  validateBody(planValidation.forecast),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const forecastParams = req.body;

    const plan = await planService.getById(id, { includeBudgetDetails: true });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    const forecast = await forecastService.generateComprehensiveForecast(id, {
      ...forecastParams,
      baseBudget: plan.budget,
      currentSpending: plan.budget.spentAmount,
      planDuration: plan.endDate - plan.startDate,
      riskFactors: plan.risks
    });

    res.json({
      success: true,
      data: forecast,
      message: 'Forecast generated successfully'
    });
  })
);

/**
 * @route   GET /api/plans/analytics/dashboard
 * @desc    Get procurement planning analytics dashboard
 * @access  Private - requires 'plans:read' permission
 */
router.get('/analytics/dashboard',
  verifyToken,
  checkPermission('plans:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['30d', '90d', '180d', '1y'], default: '90d' },
    department: { type: 'string' },
    fiscalYear: { type: 'number', min: 2020, max: 2030 }
  }),
  logView('plans', 'analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '90d', department, fiscalYear } = req.query;

    const analytics = await reportingService.getPlanningAnalytics({
      timeframe,
      department,
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      userId: req.user.permissions.includes('plans:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   GET /api/plans/templates
 * @desc    Get procurement plan templates
 * @access  Private - requires 'plans:read' permission
 */
router.get('/templates',
  verifyToken,
  checkPermission('plans:read'),
  validateQuery({
    planType: { type: 'string', enum: ['annual', 'quarterly', 'project_based', 'emergency', 'strategic', 'operational'] },
    department: { type: 'string' },
    isPublic: { type: 'boolean' }
  }),
  logView('plans', 'templates'),
  asyncHandler(async (req, res) => {
    const { planType, department, isPublic } = req.query;

    const templates = await templateService.getPlanTemplates({
      planType,
      department,
      isPublic: isPublic === 'true',
      userId: req.user.id
    });

    res.json({
      success: true,
      data: templates
    });
  })
);

/**
 * @route   POST /api/plans/:id/clone
 * @desc    Clone existing plan as template or new plan
 * @access  Private - requires 'plans:create' permission
 */
router.post('/:id/clone',
  verifyToken,
  checkPermission('plans:create'),
  validateParams(planValidation.params),
  validateBody({
    title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
    asTemplate: { type: 'boolean', default: false },
    fiscalYear: { type: 'number', min: 2020, max: 2030 },
    adjustBudget: { type: 'number', min: 0 },
    adjustDates: { type: 'boolean', default: true }
  }),
  sanitize(),
  logCreate('plans'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, asTemplate = false, fiscalYear, adjustBudget, adjustDates = true } = req.body;

    const originalPlan = await planService.getById(id, { includeAllDetails: true });
    if (!originalPlan) {
      return res.status(404).json({
        success: false,
        message: 'Original plan not found'
      });
    }

    const clonedPlan = await planService.clone(id, {
      title,
      asTemplate,
      fiscalYear,
      adjustBudget,
      adjustDates,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: clonedPlan,
      message: `Plan ${asTemplate ? 'template' : 'copy'} created successfully`
    });
  })
);

/**
 * @route   DELETE /api/plans/:id
 * @desc    Archive/delete procurement plan
 * @access  Private - requires 'plans:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['plans:delete', 'plans:delete:own']),
  validateParams(planValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'plans:delete:all'),
  logDelete('plans'),
  asyncHandler(async (req, res) => {
    const planId = req.params.id;

    const plan = await planService.getById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Procurement plan not found'
      });
    }

    // Check if plan can be deleted
    const deletableStates = ['draft', 'rejected'];
    const canArchive = ['approved', 'active', 'completed'];
    
    if (deletableStates.includes(plan.status)) {
      // Soft delete
      await planService.softDelete(planId, {
        deletedBy: req.user.id,
        reason: req.body.reason || 'Deleted by user'
      });
    } else if (canArchive.includes(plan.status)) {
      // Archive instead of delete
      await planService.archive(planId, {
        archivedBy: req.user.id,
        reason: req.body.reason || 'Archived by user'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Plan cannot be deleted in current status'
      });
    }

    res.json({
      success: true,
      message: `Plan ${deletableStates.includes(plan.status) ? 'deleted' : 'archived'} successfully`
    });
  })
);

module.exports = router;
