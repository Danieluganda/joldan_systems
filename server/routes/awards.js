/**
 * Award Routes
 * 
 * Routes for managing procurement awards, contract generation, and supplier notifications
 * Feature 12: Award management and contract generation
 * 
 * Enhanced with authentication, validation, compliance checks, and comprehensive award lifecycle management
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize, validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logStatusChange, logApproval } = require('../middleware/auditLogger');

// Service imports
const awardService = require('../services/awardService');
const contractService = require('../services/contractService');
const notificationService = require('../services/notificationService');
const pdfService = require('../services/pdfService');
const documentService = require('../services/documentService');

// Validation schemas
const awardValidation = {
  create: {
    rfqId: { type: 'string', required: true, minLength: 1 },
    winningSupplierId: { type: 'string', required: true, minLength: 1 },
    winningSubmissionId: { type: 'string', required: true, minLength: 1 },
    awardValue: { type: 'number', required: true, min: 0 },
    currency: { type: 'string', required: true, enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'], default: 'USD' },
    awardDate: { type: 'string', format: 'date' },
    contractStartDate: { type: 'string', format: 'date', required: true },
    contractEndDate: { type: 'string', format: 'date', required: true },
    awardCriteria: { type: 'string', required: true, maxLength: 2000 },
    justification: { type: 'string', required: true, maxLength: 3000 },
    terms: { type: 'array', items: { type: 'object' } },
    conditions: { type: 'array', items: { type: 'object' } },
    deliverables: { type: 'array', items: { type: 'object' } },
    milestones: { type: 'array', items: { type: 'object' } },
    performanceMetrics: { type: 'array', items: { type: 'object' } },
    paymentSchedule: { type: 'array', items: { type: 'object' } },
    penaltyClause: { type: 'string', maxLength: 1000 },
    bonusClause: { type: 'string', maxLength: 1000 }
  },
  update: {
    status: { type: 'string', enum: ['draft', 'pending_approval', 'approved', 'awarded', 'contract_signed', 'active', 'completed', 'cancelled', 'disputed'] },
    awardValue: { type: 'number', min: 0 },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] },
    awardDate: { type: 'string', format: 'date' },
    contractStartDate: { type: 'string', format: 'date' },
    contractEndDate: { type: 'string', format: 'date' },
    justification: { type: 'string', maxLength: 3000 },
    terms: { type: 'array', items: { type: 'object' } },
    conditions: { type: 'array', items: { type: 'object' } },
    deliverables: { type: 'array', items: { type: 'object' } },
    milestones: { type: 'array', items: { type: 'object' } },
    performanceMetrics: { type: 'array', items: { type: 'object' } },
    paymentSchedule: { type: 'array', items: { type: 'object' } },
    penaltyClause: { type: 'string', maxLength: 1000 },
    bonusClause: { type: 'string', maxLength: 1000 },
    modifications: { type: 'array', items: { type: 'object' } }
  },
  approve: {
    decision: { type: 'string', enum: ['approve', 'reject', 'request_changes'], required: true },
    comments: { type: 'string', maxLength: 2000 },
    conditions: { type: 'array', items: { type: 'string' } },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  dispute: {
    disputeType: { type: 'string', enum: ['award_decision', 'contract_terms', 'payment', 'delivery', 'quality'], required: true },
    description: { type: 'string', required: true, maxLength: 2000 },
    evidence: { type: 'array', items: { type: 'string' } },
    requestedResolution: { type: 'string', maxLength: 1000 },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }
  },
  performance: {
    evaluationDate: { type: 'string', format: 'date', required: true },
    overallRating: { type: 'number', required: true, min: 1, max: 5 },
    qualityRating: { type: 'number', required: true, min: 1, max: 5 },
    deliveryRating: { type: 'number', required: true, min: 1, max: 5 },
    serviceRating: { type: 'number', required: true, min: 1, max: 5 },
    comments: { type: 'string', maxLength: 2000 },
    recommendations: { type: 'string', maxLength: 1000 },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  query: {
    status: { type: 'string', enum: ['draft', 'pending_approval', 'approved', 'awarded', 'contract_signed', 'active', 'completed', 'cancelled', 'disputed'] },
    rfqId: { type: 'string' },
    supplierId: { type: 'string' },
    minValue: { type: 'number', min: 0 },
    maxValue: { type: 'number', min: 0 },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 },
    sortBy: { type: 'string', enum: ['createdAt', 'awardDate', 'awardValue', 'contractStartDate', 'status'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeContract: { type: 'boolean', default: false },
    includePerformance: { type: 'boolean', default: false }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  }
};

/**
 * @route   GET /api/awards
 * @desc    Get all awards with advanced filtering and analytics
 * @access  Private - requires 'awards:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('awards:read'),
  validateQuery(awardValidation.query),
  sanitize(),
  logView('awards', 'list'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      rfqId,
      supplierId,
      minValue,
      maxValue,
      currency,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeContract = false,
      includePerformance = false
    } = req.query;

    // Build filter criteria
    const filters = {};
    if (status) filters.status = status;
    if (rfqId) filters.rfqId = rfqId;
    if (supplierId) filters.winningSupplierId = supplierId;
    if (currency) filters.currency = currency;
    
    // Value range filters
    if (minValue || maxValue) {
      filters.awardValue = {};
      if (minValue) filters.awardValue.$gte = parseFloat(minValue);
      if (maxValue) filters.awardValue.$lte = parseFloat(maxValue);
    }
    
    // Date range filters
    if (startDate || endDate) {
      filters.awardDate = {};
      if (startDate) filters.awardDate.$gte = new Date(startDate);
      if (endDate) filters.awardDate.$lte = new Date(endDate);
    }

    // Apply user-level filtering if not admin
    if (!req.user.permissions.includes('awards:read:all')) {
      filters.createdBy = req.user.id;
    }

    const result = await awardService.list({
      filters,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeContract: includeContract === 'true',
      includePerformance: includePerformance === 'true'
    });

    res.json({
      success: true,
      data: result.awards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: result.totalPages,
        totalRecords: result.totalRecords,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      summary: {
        totalValue: result.totalValue,
        averageValue: result.averageValue,
        statusBreakdown: result.statusBreakdown,
        currencyBreakdown: result.currencyBreakdown
      },
      filters: filters,
      sort: { [sortBy]: sortOrder }
    });
  })
);

/**
 * @route   POST /api/awards
 * @desc    Create a new award
 * @access  Private - requires 'awards:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('awards:create'),
  validateBody(awardValidation.create),
  sanitize(),
  logCreate('awards'),
  asyncHandler(async (req, res) => {
    const awardData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'draft',
      awardNumber: await awardService.generateAwardNumber()
    };

    // Validate award dates
    if (new Date(awardData.contractStartDate) >= new Date(awardData.contractEndDate)) {
      return res.status(400).json({
        success: false,
        message: 'Contract start date must be before end date'
      });
    }

    // Validate supplier submission
    const validSubmission = await awardService.validateSubmission(
      awardData.rfqId, 
      awardData.winningSupplierId, 
      awardData.winningSubmissionId
    );

    if (!validSubmission.isValid) {
      return res.status(400).json({
        success: false,
        message: validSubmission.message
      });
    }

    const award = await awardService.create(awardData);

    // Generate initial contract draft
    const contractDraft = await contractService.generateDraft({
      awardId: award.id,
      templateType: 'standard_procurement',
      autoPopulate: true
    });

    res.status(201).json({
      success: true,
      data: {
        ...award,
        contractDraftId: contractDraft.id
      },
      message: 'Award created successfully'
    });
  })
);

/**
 * @route   GET /api/awards/:id
 * @desc    Get award by ID with detailed information
 * @access  Private - requires 'awards:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['awards:read', 'awards:read:own']),
  validateParams(awardValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'awards:read:all'),
  logView('awards', 'detail'),
  asyncHandler(async (req, res) => {
    const award = await awardService.getById(req.params.id, {
      includeRfq: true,
      includeSupplier: true,
      includeSubmission: true,
      includeContract: true,
      includePerformanceHistory: true,
      includeDocuments: true,
      includeComments: true
    });

    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    // Check access permissions
    if (!req.user.permissions.includes('awards:read:all')) {
      if (award.createdBy !== req.user.id && !award.stakeholders?.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: award
    });
  })
);

/**
 * @route   PUT /api/awards/:id
 * @desc    Update award
 * @access  Private - requires 'awards:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['awards:update', 'awards:update:own']),
  validateParams(awardValidation.params),
  validateBody(awardValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'createdBy', 'awards:update:all'),
  logUpdate('awards'),
  asyncHandler(async (req, res) => {
    const awardId = req.params.id;
    const updates = req.body;

    const existingAward = await awardService.getById(awardId);
    if (!existingAward) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    // Check if award is in editable state
    const editableStates = ['draft', 'pending_approval'];
    if (!editableStates.includes(existingAward.status)) {
      return res.status(400).json({
        success: false,
        message: 'Award cannot be modified in current state'
      });
    }

    // Validate date changes
    if (updates.contractStartDate && updates.contractEndDate) {
      if (new Date(updates.contractStartDate) >= new Date(updates.contractEndDate)) {
        return res.status(400).json({
          success: false,
          message: 'Contract start date must be before end date'
        });
      }
    }

    // Add update metadata
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const updatedAward = await awardService.update(awardId, updates);

    // Log status changes
    if (updates.status && updates.status !== existingAward.status) {
      await logStatusChange('awards', awardId, existingAward.status, updates.status);
      
      // Send status change notifications
      await notificationService.notifyAwardStatusChange(awardId, {
        oldStatus: existingAward.status,
        newStatus: updates.status,
        updatedBy: req.user.id
      });
    }

    // Update contract if award details changed
    if (updates.awardValue || updates.contractStartDate || updates.contractEndDate || updates.terms) {
      await contractService.updateFromAward(existingAward.contractId, updatedAward);
    }

    res.json({
      success: true,
      data: updatedAward,
      message: 'Award updated successfully'
    });
  })
);

/**
 * @route   POST /api/awards/:id/approve
 * @desc    Approve or reject award
 * @access  Private - requires 'awards:approve' permission
 */
router.post('/:id/approve',
  verifyToken,
  checkPermission('awards:approve'),
  validateParams(awardValidation.params),
  validateBody(awardValidation.approve),
  sanitize(),
  logApproval('awards'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { decision, comments, conditions, attachments } = req.body;

    const award = await awardService.getById(id);
    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    // Check if award is pending approval
    if (award.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Award is not pending approval'
      });
    }

    const approvalData = {
      approverId: req.user.id,
      decision,
      comments,
      conditions,
      attachments,
      timestamp: new Date()
    };

    const result = await awardService.processApproval(id, approvalData);

    if (decision === 'approve') {
      // Send award notification to supplier
      await notificationService.notifySupplierAwardWon(award.winningSupplierId, {
        awardId: id,
        rfqId: award.rfqId,
        awardValue: award.awardValue,
        currency: award.currency
      });

      // Send notifications to non-winning suppliers
      await notificationService.notifyNonWinningSuppliers(award.rfqId, award.winningSupplierId);
    }

    res.json({
      success: true,
      data: result.award,
      message: `Award ${decision}${decision === 'approve' ? 'd' : 'ed'} successfully`
    });
  })
);

/**
 * @route   POST /api/awards/:id/announce
 * @desc    Publicly announce award
 * @access  Private - requires 'awards:announce' permission
 */
router.post('/:id/announce',
  verifyToken,
  checkPermission('awards:announce'),
  validateParams(awardValidation.params),
  validateBody({
    announcementText: { type: 'string', maxLength: 2000 },
    includeValue: { type: 'boolean', default: true },
    includeTerms: { type: 'boolean', default: false },
    publicationChannels: { type: 'array', items: { type: 'string' } }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { announcementText, includeValue, includeTerms, publicationChannels } = req.body;

    const award = await awardService.getById(id);
    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    // Check if award is approved
    if (award.status !== 'approved' && award.status !== 'awarded') {
      return res.status(400).json({
        success: false,
        message: 'Award must be approved before announcement'
      });
    }

    const announcement = await awardService.createAnnouncement(id, {
      text: announcementText,
      includeValue,
      includeTerms,
      channels: publicationChannels,
      announcedBy: req.user.id,
      announcementDate: new Date()
    });

    // Publish to specified channels
    await notificationService.publishAwardAnnouncement(announcement);

    res.json({
      success: true,
      data: announcement,
      message: 'Award announced successfully'
    });
  })
);

/**
 * @route   POST /api/awards/:id/contract/generate
 * @desc    Generate final contract document
 * @access  Private - requires 'awards:contract' permission
 */
router.post('/:id/contract/generate',
  verifyToken,
  checkPermission('awards:contract'),
  validateParams(awardValidation.params),
  validateBody({
    templateId: { type: 'string' },
    includeStandardTerms: { type: 'boolean', default: true },
    customClauses: { type: 'array', items: { type: 'object' } },
    signatoryInfo: { type: 'object', required: true }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { templateId, includeStandardTerms, customClauses, signatoryInfo } = req.body;

    const award = await awardService.getById(id, { includeSupplier: true });
    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    // Check if award is approved
    if (award.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Award must be approved before contract generation'
      });
    }

    const contract = await contractService.generateFinal({
      awardId: id,
      templateId,
      includeStandardTerms,
      customClauses,
      signatoryInfo,
      generatedBy: req.user.id
    });

    // Update award status
    await awardService.update(id, { 
      status: 'contract_signed',
      contractId: contract.id
    });

    res.json({
      success: true,
      data: contract,
      message: 'Contract generated successfully'
    });
  })
);

/**
 * @route   POST /api/awards/:id/dispute
 * @desc    File dispute against award
 * @access  Private - requires 'awards:dispute' permission
 */
router.post('/:id/dispute',
  verifyToken,
  checkPermission('awards:dispute'),
  validateParams(awardValidation.params),
  validateBody(awardValidation.dispute),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const disputeData = {
      ...req.body,
      disputedBy: req.user.id,
      disputeDate: new Date(),
      status: 'open'
    };

    const award = await awardService.getById(id);
    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    const dispute = await awardService.createDispute(id, disputeData);

    // Update award status to disputed
    await awardService.update(id, { status: 'disputed' });

    // Send dispute notifications
    await notificationService.notifyAwardDispute(id, dispute);

    res.status(201).json({
      success: true,
      data: dispute,
      message: 'Dispute filed successfully'
    });
  })
);

/**
 * @route   POST /api/awards/:id/performance
 * @desc    Add performance evaluation
 * @access  Private - requires 'awards:evaluate' permission
 */
router.post('/:id/performance',
  verifyToken,
  checkPermission('awards:evaluate'),
  validateParams(awardValidation.params),
  validateBody(awardValidation.performance),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const performanceData = {
      ...req.body,
      evaluatedBy: req.user.id,
      evaluationId: require('crypto').randomUUID()
    };

    const award = await awardService.getById(id);
    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    // Check if award is active
    if (award.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Performance can only be evaluated for active awards'
      });
    }

    const evaluation = await awardService.addPerformanceEvaluation(id, performanceData);

    // Send performance notification to supplier
    await notificationService.notifyPerformanceEvaluation(award.winningSupplierId, {
      awardId: id,
      evaluation
    });

    res.status(201).json({
      success: true,
      data: evaluation,
      message: 'Performance evaluation added successfully'
    });
  })
);

/**
 * @route   GET /api/awards/:id/documents
 * @desc    Get award documents
 * @access  Private - requires 'awards:read' permission
 */
router.get('/:id/documents',
  verifyToken,
  checkPermission('awards:read'),
  validateParams(awardValidation.params),
  logView('awards', 'documents'),
  asyncHandler(async (req, res) => {
    const documents = await awardService.getDocuments(req.params.id);

    if (!documents) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    res.json({
      success: true,
      data: documents
    });
  })
);

/**
 * @route   GET /api/awards/analytics/dashboard
 * @desc    Get award analytics for dashboard
 * @access  Private - requires 'awards:read' permission
 */
router.get('/analytics/dashboard',
  verifyToken,
  checkPermission('awards:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['30d', '90d', '180d', '1y'], default: '90d' },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] }
  }),
  logView('awards', 'analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '90d', currency } = req.query;
    
    const analytics = await awardService.getAnalytics({
      timeframe,
      currency,
      userId: req.user.permissions.includes('awards:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   DELETE /api/awards/:id
 * @desc    Cancel award
 * @access  Private - requires 'awards:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['awards:delete', 'awards:delete:own']),
  validateParams(awardValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'awards:delete:all'),
  logDelete('awards'),
  asyncHandler(async (req, res) => {
    const awardId = req.params.id;

    const award = await awardService.getById(awardId);
    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    // Check if award can be cancelled
    const cancellableStates = ['draft', 'pending_approval'];
    if (!cancellableStates.includes(award.status)) {
      return res.status(400).json({
        success: false,
        message: 'Award cannot be cancelled in current state'
      });
    }

    const result = await awardService.cancel(awardId, {
      cancelledBy: req.user.id,
      reason: req.body.reason || 'Cancelled by user',
      cancellationDate: new Date()
    });

    // Send cancellation notifications
    await notificationService.notifyAwardCancelled(awardId, award);

    res.json({
      success: true,
      data: result,
      message: 'Award cancelled successfully'
    });
  })
);

module.exports = router;
