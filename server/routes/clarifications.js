/**
 * Clarification Routes
 * 
 * Routes for managing procurement clarifications, Q&A, and supplier inquiries
 * Feature 6: Clarification system for transparent communication during procurement
 * 
 * Enhanced with authentication, validation, transparency controls, and comprehensive clarification lifecycle management
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize, validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logStatusChange } = require('../middleware/auditLogger');

// Service imports
const clarificationService = require('../services/clarificationService');
const rfqService = require('../services/rfqService');
const notificationService = require('../services/notificationService');
const documentService = require('../services/documentService');

// Validation schemas
const clarificationValidation = {
  create: {
    rfqId: { type: 'string', required: true, minLength: 1 },
    question: { type: 'string', required: true, minLength: 10, maxLength: 5000 },
    category: { type: 'string', enum: ['technical', 'commercial', 'legal', 'administrative', 'timeline', 'scope', 'requirements'], required: true },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    isConfidential: { type: 'boolean', default: false },
    attachments: { type: 'array', items: { type: 'string' } },
    requestedBy: { type: 'string' }, // For internal clarifications
    section: { type: 'string', maxLength: 100 }, // RFQ section reference
    pageReference: { type: 'string', maxLength: 50 }, // Document page reference
    tags: { type: 'array', items: { type: 'string', maxLength: 30 }, maxItems: 10 }
  },
  update: {
    question: { type: 'string', minLength: 10, maxLength: 5000 },
    category: { type: 'string', enum: ['technical', 'commercial', 'legal', 'administrative', 'timeline', 'scope', 'requirements'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    attachments: { type: 'array', items: { type: 'string' } },
    section: { type: 'string', maxLength: 100 },
    pageReference: { type: 'string', maxLength: 50 },
    tags: { type: 'array', items: { type: 'string', maxLength: 30 }, maxItems: 10 }
  },
  respond: {
    response: { type: 'string', required: true, minLength: 10, maxLength: 10000 },
    isPublic: { type: 'boolean', default: true },
    attachments: { type: 'array', items: { type: 'string' } },
    additionalInfo: { type: 'string', maxLength: 2000 },
    requiresAmendment: { type: 'boolean', default: false },
    amendmentDetails: { type: 'string', maxLength: 1000 },
    estimatedImpact: { type: 'string', enum: ['none', 'minor', 'moderate', 'significant'], default: 'none' }
  },
  publish: {
    publicationNote: { type: 'string', maxLength: 500 },
    notifyAllBidders: { type: 'boolean', default: true },
    schedulePublication: { type: 'boolean', default: false },
    publicationDate: { type: 'string', format: 'datetime' }
  },
  query: {
    rfqId: { type: 'string' },
    category: { type: 'string', enum: ['technical', 'commercial', 'legal', 'administrative', 'timeline', 'scope', 'requirements'] },
    status: { type: 'string', enum: ['pending', 'in_review', 'responded', 'published', 'closed', 'withdrawn'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    isPublic: { type: 'boolean' },
    isConfidential: { type: 'boolean' },
    submittedBy: { type: 'string' },
    respondedBy: { type: 'string' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    search: { type: 'string', minLength: 3, maxLength: 100 },
    tags: { type: 'array', items: { type: 'string' } },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 },
    sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'priority', 'status', 'category'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeResponses: { type: 'boolean', default: false },
    includeAttachments: { type: 'boolean', default: false }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  },
  bulk: {
    action: { type: 'string', enum: ['publish', 'close', 'update_priority'], required: true },
    clarificationIds: { type: 'array', items: { type: 'string' }, required: true, minItems: 1 },
    data: { type: 'object' } // Additional data based on action
  }
};

/**
 * @route   GET /api/clarifications
 * @desc    Get all clarifications with advanced filtering and search
 * @access  Private - requires 'clarifications:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('clarifications:read'),
  validateQuery(clarificationValidation.query),
  sanitize(),
  logView('clarifications', 'list'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      rfqId,
      category,
      status,
      priority,
      isPublic,
      isConfidential,
      submittedBy,
      respondedBy,
      startDate,
      endDate,
      search,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeResponses = false,
      includeAttachments = false
    } = req.query;

    // Build filter criteria
    const filters = {};
    if (rfqId) filters.rfqId = rfqId;
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
    if (isConfidential !== undefined) filters.isConfidential = isConfidential === 'true';
    if (submittedBy) filters.submittedBy = submittedBy;
    if (respondedBy) filters.respondedBy = respondedBy;
    
    // Date range filters
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Tag filters
    if (tags && tags.length > 0) {
      filters.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    // Apply user-level filtering if not admin
    if (!req.user.permissions.includes('clarifications:read:all')) {
      // Users can see their own clarifications and public ones from RFQs they have access to
      filters.$or = [
        { submittedBy: req.user.id },
        { isPublic: true, 'rfq.stakeholders': req.user.id }
      ];
    }

    const result = await clarificationService.list({
      filters,
      search,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeResponses: includeResponses === 'true',
      includeAttachments: includeAttachments === 'true',
      includeRfqDetails: true
    });

    res.json({
      success: true,
      data: result.clarifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: result.totalPages,
        totalRecords: result.totalRecords,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      summary: {
        statusBreakdown: result.statusBreakdown,
        categoryBreakdown: result.categoryBreakdown,
        priorityBreakdown: result.priorityBreakdown,
        averageResponseTime: result.averageResponseTime
      },
      filters: filters,
      sort: { [sortBy]: sortOrder }
    });
  })
);

/**
 * @route   POST /api/clarifications
 * @desc    Create a new clarification request
 * @access  Private - requires 'clarifications:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('clarifications:create'),
  validateBody(clarificationValidation.create),
  sanitize(),
  logCreate('clarifications'),
  asyncHandler(async (req, res) => {
    const clarificationData = {
      ...req.body,
      submittedBy: req.user.id,
      status: 'pending',
      clarificationNumber: await clarificationService.generateClarificationNumber(req.body.rfqId)
    };

    // Validate RFQ exists and is open for clarifications
    const rfq = await rfqService.getById(req.body.rfqId);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // Check if clarification period is still open
    if (!rfqService.isClarificationPeriodOpen(rfq)) {
      return res.status(400).json({
        success: false,
        message: 'Clarification period has ended for this RFQ'
      });
    }

    // Check if user has access to this RFQ
    const hasAccess = await rfqService.checkUserAccess(req.body.rfqId, req.user.id);
    if (!hasAccess && !req.user.permissions.includes('clarifications:create:all')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this RFQ'
      });
    }

    const clarification = await clarificationService.create(clarificationData);

    // Send notification to procurement team
    await notificationService.notifyClarificationReceived(req.body.rfqId, {
      clarificationId: clarification.id,
      category: clarificationData.category,
      priority: clarificationData.priority,
      submittedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: clarification,
      message: 'Clarification request submitted successfully'
    });
  })
);

/**
 * @route   GET /api/clarifications/:id
 * @desc    Get clarification by ID with detailed information
 * @access  Private - requires 'clarifications:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['clarifications:read', 'clarifications:read:own']),
  validateParams(clarificationValidation.params),
  requireOwnershipOrPermission('id', 'submittedBy', 'clarifications:read:all'),
  logView('clarifications', 'detail'),
  asyncHandler(async (req, res) => {
    const clarification = await clarificationService.getById(req.params.id, {
      includeRfq: true,
      includeSubmitter: true,
      includeResponses: true,
      includeAttachments: true,
      includeHistory: true
    });

    if (!clarification) {
      return res.status(404).json({
        success: false,
        message: 'Clarification not found'
      });
    }

    // Check access permissions for confidential clarifications
    if (clarification.isConfidential && !req.user.permissions.includes('clarifications:read:all')) {
      if (clarification.submittedBy !== req.user.id && 
          !clarification.rfq.stakeholders?.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to confidential clarification'
        });
      }
    }

    res.json({
      success: true,
      data: clarification
    });
  })
);

/**
 * @route   PUT /api/clarifications/:id
 * @desc    Update clarification (only if pending)
 * @access  Private - requires 'clarifications:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['clarifications:update', 'clarifications:update:own']),
  validateParams(clarificationValidation.params),
  validateBody(clarificationValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'submittedBy', 'clarifications:update:all'),
  logUpdate('clarifications'),
  asyncHandler(async (req, res) => {
    const clarificationId = req.params.id;
    const updates = req.body;

    const existingClarification = await clarificationService.getById(clarificationId);
    if (!existingClarification) {
      return res.status(404).json({
        success: false,
        message: 'Clarification not found'
      });
    }

    // Check if clarification is in editable state
    if (existingClarification.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Clarification cannot be modified after review has started'
      });
    }

    // Add update metadata
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const updatedClarification = await clarificationService.update(clarificationId, updates);

    res.json({
      success: true,
      data: updatedClarification,
      message: 'Clarification updated successfully'
    });
  })
);

/**
 * @route   POST /api/clarifications/:id/respond
 * @desc    Respond to a clarification
 * @access  Private - requires 'clarifications:respond' permission
 */
router.post('/:id/respond',
  verifyToken,
  checkPermission('clarifications:respond'),
  validateParams(clarificationValidation.params),
  validateBody(clarificationValidation.respond),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const responseData = {
      ...req.body,
      respondedBy: req.user.id,
      responseDate: new Date()
    };

    const clarification = await clarificationService.getById(id);
    if (!clarification) {
      return res.status(404).json({
        success: false,
        message: 'Clarification not found'
      });
    }

    // Check if clarification is in a state that can be responded to
    const respondableStates = ['pending', 'in_review'];
    if (!respondableStates.includes(clarification.status)) {
      return res.status(400).json({
        success: false,
        message: 'Clarification cannot be responded to in current state'
      });
    }

    const response = await clarificationService.addResponse(id, responseData);

    // Update clarification status
    await clarificationService.updateStatus(id, 'responded');

    // If response is public, notify all bidders
    if (responseData.isPublic) {
      await notificationService.notifyClarificationPublished(clarification.rfqId, {
        clarificationId: id,
        category: clarification.category,
        hasResponse: true
      });
    } else {
      // Notify only the submitter for private responses
      await notificationService.notifyClarificationResponded(clarification.submittedBy, {
        clarificationId: id,
        responseId: response.id
      });
    }

    res.json({
      success: true,
      data: {
        clarification,
        response
      },
      message: 'Response added successfully'
    });
  })
);

/**
 * @route   POST /api/clarifications/:id/publish
 * @desc    Publish clarification and response to all bidders
 * @access  Private - requires 'clarifications:publish' permission
 */
router.post('/:id/publish',
  verifyToken,
  checkPermission('clarifications:publish'),
  validateParams(clarificationValidation.params),
  validateBody(clarificationValidation.publish),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { publicationNote, notifyAllBidders, schedulePublication, publicationDate } = req.body;

    const clarification = await clarificationService.getById(id, { includeResponses: true });
    if (!clarification) {
      return res.status(404).json({
        success: false,
        message: 'Clarification not found'
      });
    }

    // Check if clarification has a response
    if (!clarification.responses || clarification.responses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Clarification must have a response before publication'
      });
    }

    const publicationData = {
      publishedBy: req.user.id,
      publicationDate: schedulePublication ? new Date(publicationDate) : new Date(),
      publicationNote,
      notifyAllBidders
    };

    const result = await clarificationService.publish(id, publicationData);

    if (!schedulePublication) {
      // Send immediate notifications to all bidders
      if (notifyAllBidders) {
        await notificationService.notifyAllBiddersClarificationPublished(clarification.rfqId, {
          clarificationId: id,
          category: clarification.category,
          priority: clarification.priority
        });
      }
    }

    res.json({
      success: true,
      data: result,
      message: schedulePublication ? 'Clarification scheduled for publication' : 'Clarification published successfully'
    });
  })
);

/**
 * @route   POST /api/clarifications/:id/close
 * @desc    Close clarification (mark as resolved)
 * @access  Private - requires 'clarifications:close' permission
 */
router.post('/:id/close',
  verifyToken,
  checkPermission('clarifications:close'),
  validateParams(clarificationValidation.params),
  validateBody({
    reason: { type: 'string', maxLength: 500 },
    resolution: { type: 'string', enum: ['answered', 'duplicate', 'out_of_scope', 'withdrawn'], required: true }
  }),
  sanitize(),
  logStatusChange('clarifications'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, resolution } = req.body;

    const clarification = await clarificationService.getById(id);
    if (!clarification) {
      return res.status(404).json({
        success: false,
        message: 'Clarification not found'
      });
    }

    const closureData = {
      closedBy: req.user.id,
      closedAt: new Date(),
      reason,
      resolution
    };

    const result = await clarificationService.close(id, closureData);

    // Send closure notification to submitter
    await notificationService.notifyClarificationClosed(clarification.submittedBy, {
      clarificationId: id,
      resolution,
      reason
    });

    res.json({
      success: true,
      data: result,
      message: 'Clarification closed successfully'
    });
  })
);

/**
 * @route   GET /api/clarifications/rfq/:rfqId/summary
 * @desc    Get clarification summary for specific RFQ
 * @access  Private - requires 'clarifications:read' permission
 */
router.get('/rfq/:rfqId/summary',
  verifyToken,
  checkPermission('clarifications:read'),
  validateParams({ rfqId: { type: 'string', required: true, minLength: 1 } }),
  logView('clarifications', 'rfq_summary'),
  asyncHandler(async (req, res) => {
    const { rfqId } = req.params;

    // Check RFQ access
    const hasAccess = await rfqService.checkUserAccess(rfqId, req.user.id);
    if (!hasAccess && !req.user.permissions.includes('clarifications:read:all')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this RFQ'
      });
    }

    const summary = await clarificationService.getRfqSummary(rfqId);

    res.json({
      success: true,
      data: summary
    });
  })
);

/**
 * @route   POST /api/clarifications/bulk
 * @desc    Bulk operations on clarifications
 * @access  Private - requires 'clarifications:bulk' permission
 */
router.post('/bulk',
  verifyToken,
  checkPermission('clarifications:bulk'),
  validateBody(clarificationValidation.bulk),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { action, clarificationIds, data } = req.body;

    // Validate all clarification IDs exist and user has access
    const clarifications = await clarificationService.getByIds(clarificationIds);
    if (clarifications.length !== clarificationIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some clarifications not found'
      });
    }

    // Check permissions for each clarification
    for (const clarification of clarifications) {
      if (!req.user.permissions.includes('clarifications:bulk:all')) {
        if (clarification.submittedBy !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to some clarifications'
          });
        }
      }
    }

    const result = await clarificationService.bulkOperation(action, clarificationIds, {
      ...data,
      performedBy: req.user.id,
      performedAt: new Date()
    });

    res.json({
      success: true,
      data: result,
      message: `Bulk ${action} operation completed successfully`
    });
  })
);

/**
 * @route   GET /api/clarifications/:id/timeline
 * @desc    Get clarification timeline and history
 * @access  Private - requires 'clarifications:read' permission
 */
router.get('/:id/timeline',
  verifyToken,
  checkPermission('clarifications:read'),
  validateParams(clarificationValidation.params),
  logView('clarifications', 'timeline'),
  asyncHandler(async (req, res) => {
    const timeline = await clarificationService.getTimeline(req.params.id);

    if (!timeline) {
      return res.status(404).json({
        success: false,
        message: 'Clarification not found'
      });
    }

    res.json({
      success: true,
      data: timeline
    });
  })
);

/**
 * @route   POST /api/clarifications/:id/attachments
 * @desc    Add attachments to clarification
 * @access  Private - requires 'clarifications:update' permission
 */
router.post('/:id/attachments',
  verifyToken,
  checkPermission('clarifications:update'),
  validateParams(clarificationValidation.params),
  validateFileUpload({
    maxFiles: 10,
    maxSize: '10MB',
    allowedTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'png']
  }),
  asyncHandler(async (req, res) => {
    const clarificationId = req.params.id;

    const clarification = await clarificationService.getById(clarificationId);
    if (!clarification) {
      return res.status(404).json({
        success: false,
        message: 'Clarification not found'
      });
    }

    // Check if user can modify this clarification
    if (clarification.submittedBy !== req.user.id && 
        !req.user.permissions.includes('clarifications:update:all')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const attachments = await clarificationService.addAttachments(clarificationId, {
      files: req.files,
      uploadedBy: req.user.id
    });

    res.json({
      success: true,
      data: attachments,
      message: 'Attachments added successfully'
    });
  })
);

/**
 * @route   GET /api/clarifications/analytics/dashboard
 * @desc    Get clarification analytics for dashboard
 * @access  Private - requires 'clarifications:read' permission
 */
router.get('/analytics/dashboard',
  verifyToken,
  checkPermission('clarifications:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['7d', '30d', '90d', '180d', '1y'], default: '30d' },
    rfqId: { type: 'string' }
  }),
  logView('clarifications', 'analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '30d', rfqId } = req.query;
    
    const analytics = await clarificationService.getAnalytics({
      timeframe,
      rfqId,
      userId: req.user.permissions.includes('clarifications:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   DELETE /api/clarifications/:id
 * @desc    Withdraw clarification (soft delete)
 * @access  Private - requires 'clarifications:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['clarifications:delete', 'clarifications:delete:own']),
  validateParams(clarificationValidation.params),
  requireOwnershipOrPermission('id', 'submittedBy', 'clarifications:delete:all'),
  logDelete('clarifications'),
  asyncHandler(async (req, res) => {
    const clarificationId = req.params.id;

    const clarification = await clarificationService.getById(clarificationId);
    if (!clarification) {
      return res.status(404).json({
        success: false,
        message: 'Clarification not found'
      });
    }

    // Check if clarification can be withdrawn
    const withdrawableStates = ['pending', 'in_review'];
    if (!withdrawableStates.includes(clarification.status)) {
      return res.status(400).json({
        success: false,
        message: 'Clarification cannot be withdrawn in current state'
      });
    }

    const result = await clarificationService.withdraw(clarificationId, {
      withdrawnBy: req.user.id,
      reason: req.body.reason || 'Withdrawn by user',
      withdrawnAt: new Date()
    });

    res.json({
      success: true,
      data: result,
      message: 'Clarification withdrawn successfully'
    });
  })
);

module.exports = router;
