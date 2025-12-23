/**
 * Approval Routes
 * 
 * Routes for managing procurement approvals and approval workflows
 * Feature 15: Approval workflows and notifications
 * 
 * Enhanced with authentication, validation, audit logging, and comprehensive error handling
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logApproval, logView, logStatusChange } = require('../middleware/auditLogger');

// Service imports
const approvalService = require('../services/approvalService');
const notificationService = require('../services/notificationService');

// Validation schemas
const approvalValidation = {
  create: {
    procurementId: { type: 'string', required: true, minLength: 1 },
    approverLevel: { type: 'number', required: true, min: 1, max: 5 },
    requiredApprovals: { type: 'number', required: true, min: 1 },
    deadline: { type: 'string', format: 'date' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    description: { type: 'string', maxLength: 1000 },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  update: {
    status: { type: 'string', enum: ['pending', 'in_review', 'approved', 'rejected', 'cancelled'] },
    approverLevel: { type: 'number', min: 1, max: 5 },
    deadline: { type: 'string', format: 'date' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    description: { type: 'string', maxLength: 1000 },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  approve: {
    decision: { type: 'string', enum: ['approve', 'reject'], required: true },
    comments: { type: 'string', maxLength: 2000 },
    conditions: { type: 'array', items: { type: 'string' } },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  query: {
    status: { type: 'string', enum: ['pending', 'in_review', 'approved', 'rejected', 'cancelled'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    approverLevel: { type: 'number', min: 1, max: 5 },
    procurementId: { type: 'string' },
    approverId: { type: 'string' },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 },
    sortBy: { type: 'string', enum: ['createdAt', 'deadline', 'priority', 'status'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  }
};

/**
 * @route   GET /api/approvals
 * @desc    Get all approvals with filtering and pagination
 * @access  Private - requires 'approvals:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('approvals:read'),
  validateQuery(approvalValidation.query),
  sanitize(),
  logView('approvals', 'list'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      approverLevel,
      procurementId,
      approverId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter criteria
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (approverLevel) filters.approverLevel = approverLevel;
    if (procurementId) filters.procurementId = procurementId;
    if (approverId) filters.approverId = approverId;

    // Check if user can only see their own approvals
    if (!req.user.permissions.includes('approvals:read:all')) {
      filters.approverId = req.user.id;
    }

    const result = await approvalService.list({
      filters,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    });

    res.json({
      success: true,
      data: result.approvals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: result.totalPages,
        totalRecords: result.totalRecords,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      filters: filters,
      sort: { [sortBy]: sortOrder }
    });
  })
);

/**
 * @route   POST /api/approvals
 * @desc    Create a new approval workflow
 * @access  Private - requires 'approvals:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('approvals:create'),
  validateBody(approvalValidation.create),
  sanitize(),
  logCreate('approvals'),
  asyncHandler(async (req, res) => {
    const approvalData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'pending'
    };

    const approval = await approvalService.create(approvalData);

    // Send notifications to approvers
    await notificationService.notifyApprovers(approval.id, {
      type: 'approval_required',
      priority: approval.priority,
      deadline: approval.deadline
    });

    res.status(201).json({
      success: true,
      data: approval,
      message: 'Approval workflow created successfully'
    });
  })
);

/**
 * @route   GET /api/approvals/:id
 * @desc    Get approval by ID
 * @access  Private - requires 'approvals:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['approvals:read', 'approvals:read:own']),
  validateParams(approvalValidation.params),
  requireOwnershipOrPermission('id', 'approverId', 'approvals:read:all'),
  logView('approvals', 'detail'),
  asyncHandler(async (req, res) => {
    const approval = await approvalService.getById(req.params.id, {
      includeHistory: true,
      includeComments: true,
      includeAttachments: true
    });

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    // Check ownership if user doesn't have global read permission
    if (!req.user.permissions.includes('approvals:read:all')) {
      if (approval.approverId !== req.user.id && approval.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: approval
    });
  })
);

/**
 * @route   PUT /api/approvals/:id
 * @desc    Update approval
 * @access  Private - requires 'approvals:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['approvals:update', 'approvals:update:own']),
  validateParams(approvalValidation.params),
  validateBody(approvalValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'createdBy', 'approvals:update:all'),
  logUpdate('approvals'),
  asyncHandler(async (req, res) => {
    const approvalId = req.params.id;
    const updates = req.body;

    const existingApproval = await approvalService.getById(approvalId);
    if (!existingApproval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    // Check if approval is in a state that allows updates
    if (existingApproval.status === 'approved' || existingApproval.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed approval'
      });
    }

    // Add update metadata
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const updatedApproval = await approvalService.update(approvalId, updates);

    // Log status change if status was updated
    if (updates.status && updates.status !== existingApproval.status) {
      await logStatusChange('approvals', approvalId, existingApproval.status, updates.status);
    }

    res.json({
      success: true,
      data: updatedApproval,
      message: 'Approval updated successfully'
    });
  })
);

/**
 * @route   POST /api/approvals/:id/approve
 * @desc    Approve or reject an approval
 * @access  Private - requires 'approvals:approve' permission
 */
router.post('/:id/approve',
  verifyToken,
  checkPermission('approvals:approve'),
  validateParams(approvalValidation.params),
  validateBody(approvalValidation.approve),
  sanitize(),
  logApproval('approvals'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { decision, comments, conditions, attachments } = req.body;

    const approval = await approvalService.getById(id);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    // Check if user is authorized to approve this level
    if (approval.approverLevel > req.user.approvalLevel) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient approval authority level'
      });
    }

    // Check if approval is still pending
    if (approval.status !== 'pending' && approval.status !== 'in_review') {
      return res.status(400).json({
        success: false,
        message: 'Approval is no longer pending'
      });
    }

    const approvalDecision = {
      approverId: req.user.id,
      decision,
      comments,
      conditions,
      attachments,
      timestamp: new Date()
    };

    const result = await approvalService.processApproval(id, approvalDecision);

    // Send notifications based on decision
    if (decision === 'approve') {
      await notificationService.notifyApprovalApproved(id, result.approval);
    } else {
      await notificationService.notifyApprovalRejected(id, result.approval, comments);
    }

    res.json({
      success: true,
      data: result.approval,
      message: `Approval ${decision}d successfully`,
      workflowComplete: result.workflowComplete
    });
  })
);

/**
 * @route   POST /api/approvals/:id/delegate
 * @desc    Delegate approval to another approver
 * @access  Private - requires 'approvals:delegate' permission
 */
router.post('/:id/delegate',
  verifyToken,
  checkPermission('approvals:delegate'),
  validateParams(approvalValidation.params),
  validateBody({
    delegateeTo: { type: 'string', required: true },
    reason: { type: 'string', required: true, maxLength: 500 }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { delegateeTo, reason } = req.body;

    const approval = await approvalService.getById(id);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    // Verify delegation is allowed
    if (approval.approverId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only delegate own approvals'
      });
    }

    const delegatedApproval = await approvalService.delegate(id, {
      from: req.user.id,
      to: delegateeTo,
      reason,
      timestamp: new Date()
    });

    // Notify the new approver
    await notificationService.notifyApprovalDelegated(id, delegatedApproval, req.user.id, delegateeTo);

    res.json({
      success: true,
      data: delegatedApproval,
      message: 'Approval delegated successfully'
    });
  })
);

/**
 * @route   GET /api/approvals/:id/history
 * @desc    Get approval history and audit trail
 * @access  Private - requires 'approvals:read' permission
 */
router.get('/:id/history',
  verifyToken,
  checkPermission('approvals:read'),
  validateParams(approvalValidation.params),
  requireOwnershipOrPermission('id', 'approverId', 'approvals:read:all'),
  logView('approvals', 'history'),
  asyncHandler(async (req, res) => {
    const history = await approvalService.getHistory(req.params.id);

    if (!history) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    res.json({
      success: true,
      data: history
    });
  })
);

/**
 * @route   DELETE /api/approvals/:id
 * @desc    Cancel/delete approval
 * @access  Private - requires 'approvals:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['approvals:delete', 'approvals:delete:own']),
  validateParams(approvalValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'approvals:delete:all'),
  logDelete('approvals'),
  asyncHandler(async (req, res) => {
    const approval = await approvalService.getById(req.params.id);
    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    // Check if approval can be cancelled
    if (approval.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel approved approval'
      });
    }

    const result = await approvalService.cancel(req.params.id, {
      cancelledBy: req.user.id,
      reason: req.body.reason || 'Cancelled by user'
    });

    // Notify affected parties
    await notificationService.notifyApprovalCancelled(req.params.id, approval);

    res.json({
      success: true,
      data: result,
      message: 'Approval cancelled successfully'
    });
  })
);

/**
 * @route   GET /api/approvals/stats/dashboard
 * @desc    Get approval statistics for dashboard
 * @access  Private - requires 'approvals:read' permission
 */
router.get('/stats/dashboard',
  verifyToken,
  checkPermission('approvals:read'),
  logView('approvals', 'stats'),
  asyncHandler(async (req, res) => {
    const { timeframe = '30d' } = req.query;
    
    const stats = await approvalService.getDashboardStats({
      timeframe,
      userId: req.user.permissions.includes('approvals:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * @route   POST /api/approvals/bulk/assign
 * @desc    Bulk assign approvals to approvers
 * @access  Private - requires 'approvals:bulk:assign' permission
 */
router.post('/bulk/assign',
  verifyToken,
  checkPermission('approvals:bulk:assign'),
  validateBody({
    approvalIds: { type: 'array', required: true, items: { type: 'string' } },
    approverId: { type: 'string', required: true },
    reason: { type: 'string', maxLength: 500 }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { approvalIds, approverId, reason } = req.body;

    const results = await approvalService.bulkAssign({
      approvalIds,
      approverId,
      assignedBy: req.user.id,
      reason,
      timestamp: new Date()
    });

    // Send bulk notification
    await notificationService.notifyBulkApprovalAssignment(approvalIds, approverId, req.user.id);

    res.json({
      success: true,
      data: results,
      message: `${results.successful.length} approvals assigned successfully`
    });
  })
);

module.exports = router;
