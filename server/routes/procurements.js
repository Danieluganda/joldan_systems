/**
 * Procurements Routes
 * API endpoints for procurement management
 */

const express = require('express');
const router = express.Router();
const Procurement = require('../db/models/Procurement');
const Plan = require('../db/models/Plan');
const { verifyToken, checkPermission } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { logCreate, logUpdate, logDelete } = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { PROCUREMENT_SCHEMA, PLAN_SCHEMA } = require('../shared/validation-rules');
const { PERMISSIONS } = require('../config/permissions');

// Get all procurements
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.type) {
      filters.type = req.query.type;
    }
    const procurements = await Procurement.getAll(filters);
    res.json({
      success: true,
      data: procurements,
      count: procurements.length,
    });
  } catch (error) {
    logger.error('Error fetching procurements', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching procurements' });
  }
});

// Get procurement by ID
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const procurement = await Procurement.findById(req.params.id);
    if (!procurement) {
      return res.status(404).json({ success: false, message: 'Procurement not found' });
    }
    res.json({ success: true, data: procurement });
  } catch (error) {
    logger.error('Error fetching procurement', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching procurement' });
  }
});

// Create procurement
router.post(
  '/',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody(PROCUREMENT_SCHEMA),
  logCreate('Procurement'),
  async (req, res, next) => {
    try {
      const procurement = await Procurement.create({
        procurementType: req.body.procurementType,
        title: req.body.title,
        description: req.body.description,
        estimatedBudget: req.body.estimatedBudget,
        department: req.body.department,
        procurementPlan: req.body.procurementPlan,
        status: 'planning',
        createdBy: req.user.id,
      });
      res.status(201).json({ success: true, data: procurement });
    } catch (error) {
      logger.error('Error creating procurement', { error: error.message });
      res.status(500).json({ success: false, message: 'Error creating procurement' });
    }
  }
);

// Update procurement
router.put(
  '/:id',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody(PROCUREMENT_SCHEMA),
  logUpdate('Procurement'),
  async (req, res, next) => {
    try {
      const procurement = await Procurement.update(req.params.id, req.body);
      if (!procurement) {
        return res.status(404).json({ success: false, message: 'Procurement not found' });
      }
      res.json({ success: true, data: procurement });
    } catch (error) {
      logger.error('Error updating procurement', { error: error.message });
      res.status(500).json({ success: false, message: 'Error updating procurement' });
    }
  }
);

// Delete procurement
router.delete(
  '/:id',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  logDelete('Procurement'),
  async (req, res, next) => {
    try {
      await Procurement.delete(req.params.id);
      res.json({ success: true, message: 'Procurement deleted' });
    } catch (error) {
      logger.error('Error deleting procurement', { error: error.message });
      res.status(500).json({ success: false, message: 'Error deleting procurement' });
    }
  }
);

// Get plans by procurement
router.get('/:procurementId/plans', verifyToken, async (req, res, next) => {
  try {
    const plans = await Plan.getByProcurement(req.params.procurementId);
    res.json({ success: true, data: plans, count: plans.length });
  } catch (error) {
    logger.error('Error fetching plans', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching plans' });
  }
});

// Create plan
router.post(
  '/:procurementId/plans',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody(PLAN_SCHEMA),
  logCreate('Plan'),
  async (req, res, next) => {
    try {
      const plan = await Plan.create({
        procurementId: req.params.procurementId,
        planName: req.body.planName,
        itemDescription: req.body.itemDescription,
        estimatedValue: req.body.estimatedValue,
        quantity: req.body.quantity,
        deliveryDate: req.body.deliveryDate,
        specifications: req.body.specifications,
      });
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      logger.error('Error creating plan', { error: error.message });
      res.status(500).json({ success: false, message: 'Error creating plan' });
    }
  }
);

// Update plan
router.put(
  '/:procurementId/plans/:planId',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody(PLAN_SCHEMA),
  logUpdate('Plan'),
  async (req, res, next) => {
    try {
      const plan = await Plan.update(req.params.planId, req.body);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }
      res.json({ success: true, data: plan });
    } catch (error) {
      logger.error('Error updating plan', { error: error.message });
      res.status(500).json({ success: false, message: 'Error updating plan' });
    }
  }
);

// Delete plan
router.delete(
  '/:procurementId/plans/:planId',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  logDelete('Plan'),
  async (req, res, next) => {
    try {
      await Plan.delete(req.params.planId);
      res.json({ success: true, message: 'Plan deleted' });
    } catch (error) {
      logger.error('Error deleting plan', { error: error.message });
      res.status(500).json({ success: false, message: 'Error deleting plan' });
    }
  }
);

// Advanced search and filtering
router.get('/search', verifyToken, async (req, res, next) => {
  try {
    const {
      keyword,
      department,
      status,
      minBudget,
      maxBudget,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const searchFilters = {
      ...(keyword && { 
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } }
        ]
      }),
      ...(department && { department }),
      ...(status && { status }),
      ...(minBudget && { estimatedBudget: { $gte: parseFloat(minBudget) } }),
      ...(maxBudget && { estimatedBudget: { $lte: parseFloat(maxBudget) } }),
      ...(dateFrom && { createdAt: { $gte: new Date(dateFrom) } }),
      ...(dateTo && { createdAt: { $lte: new Date(dateTo) } })
    };

    const procurements = await Procurement.searchWithPagination(
      searchFilters,
      { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: procurements.items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: procurements.total,
        totalPages: Math.ceil(procurements.total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error searching procurements', { error: error.message });
    res.status(500).json({ success: false, message: 'Error searching procurements' });
  }
});

// Bulk operations
router.post('/bulk-update', 
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  async (req, res, next) => {
    try {
      const { ids, updates } = req.body;
      const results = await Procurement.bulkUpdate(ids, updates);
      res.json({ success: true, data: results });
    } catch (error) {
      logger.error('Error in bulk update', { error: error.message });
      res.status(500).json({ success: false, message: 'Error updating procurements' });
    }
  }
);

// Status workflow management
router.patch('/:id/status',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  async (req, res, next) => {
    try {
      const { status, comments } = req.body;
      const procurement = await Procurement.updateStatus(req.params.id, status, {
        updatedBy: req.user.id,
        comments,
        timestamp: new Date()
      });
      
      if (!procurement) {
        return res.status(404).json({ success: false, message: 'Procurement not found' });
      }
      
      res.json({ success: true, data: procurement });
    } catch (error) {
      logger.error('Error updating status', { error: error.message });
      res.status(500).json({ success: false, message: 'Error updating status' });
    }
  }
);

// Dashboard analytics
router.get('/analytics/dashboard', verifyToken, async (req, res, next) => {
  try {
    const analytics = await Procurement.getDashboardAnalytics(req.user.department);
    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Error fetching analytics', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

// Export functionality
router.get('/export', 
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  async (req, res, next) => {
    try {
      const { format = 'csv', ...filters } = req.query;
      const exportData = await Procurement.exportData(filters, format);
      
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=procurements.${format}`);
      res.send(exportData);
    } catch (error) {
      logger.error('Error exporting data', { error: error.message });
      res.status(500).json({ success: false, message: 'Error exporting data' });
    }
  }
);

// File attachments
router.post('/:id/attachments',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  // Add multer middleware for file upload
  async (req, res, next) => {
    try {
      const attachment = await Procurement.addAttachment(req.params.id, {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.user.id
      });
      
      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      logger.error('Error uploading attachment', { error: error.message });
      res.status(500).json({ success: false, message: 'Error uploading file' });
    }
  }
);

// Comments/Notes - Collaboration features
router.get('/:id/comments', verifyToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const comments = await Procurement.getComments(
      req.params.id, 
      parseInt(page), 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: comments.items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: comments.total,
        totalPages: Math.ceil(comments.total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching comments', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching comments' });
  }
});

router.post('/:id/comments', 
  verifyToken,
  validateBody({
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 2000 },
      type: { type: 'string', enum: ['comment', 'note', 'decision'] }
    }
  }),
  async (req, res, next) => {
    try {
      const comment = await Procurement.addComment(req.params.id, {
        content: req.body.content,
        type: req.body.type || 'comment',
        authorId: req.user.id,
        authorName: req.user.name,
        createdAt: new Date(),
        metadata: {
          userAgent: req.get('user-agent'),
          ipAddress: req.ip
        }
      });
      
      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      logger.error('Error adding comment', { error: error.message });
      res.status(500).json({ success: false, message: 'Error adding comment' });
    }
  }
);

// Notifications management
router.get('/:id/notifications', verifyToken, async (req, res, next) => {
  try {
    const notifications = await Procurement.getNotifications(req.params.id, req.user.id);
    res.json({ success: true, data: notifications });
  } catch (error) {
    logger.error('Error fetching notifications', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

router.post('/:id/notifications/subscribe',
  verifyToken,
  validateBody({
    type: 'object',
    required: ['events'],
    properties: {
      events: { 
        type: 'array',
        items: { 
          type: 'string',
          enum: ['status_change', 'comment_added', 'budget_change', 'deadline_approaching']
        }
      },
      channels: {
        type: 'array',
        items: { type: 'string', enum: ['email', 'in_app', 'sms'] }
      }
    }
  }),
  async (req, res, next) => {
    try {
      const subscription = await Procurement.subscribeToNotifications(req.params.id, {
        userId: req.user.id,
        events: req.body.events,
        channels: req.body.channels || ['email', 'in_app'],
        createdAt: new Date()
      });
      
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      logger.error('Error creating notification subscription', { error: error.message });
      res.status(500).json({ success: false, message: 'Error subscribing to notifications' });
    }
  }
);

// Approval Workflows
router.get('/:id/approvals', verifyToken, async (req, res, next) => {
  try {
    const approvals = await Procurement.getApprovalWorkflow(req.params.id);
    res.json({ success: true, data: approvals });
  } catch (error) {
    logger.error('Error fetching approvals', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching approvals' });
  }
});

router.post('/:id/approvals',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody({
    type: 'object',
    required: ['approvers'],
    properties: {
      approvers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['userId', 'level'],
          properties: {
            userId: { type: 'string' },
            level: { type: 'number', minimum: 1 },
            required: { type: 'boolean' }
          }
        }
      },
      requireAll: { type: 'boolean' }
    }
  }),
  async (req, res, next) => {
    try {
      const workflow = await Procurement.createApprovalWorkflow(req.params.id, {
        approvers: req.body.approvers,
        requireAll: req.body.requireAll || false,
        createdBy: req.user.id,
        createdAt: new Date(),
        status: 'pending'
      });
      
      res.status(201).json({ success: true, data: workflow });
    } catch (error) {
      logger.error('Error creating approval workflow', { error: error.message });
      res.status(500).json({ success: false, message: 'Error creating approval workflow' });
    }
  }
);

router.patch('/:id/approvals/:approvalId',
  verifyToken,
  validateBody({
    type: 'object',
    required: ['decision'],
    properties: {
      decision: { type: 'string', enum: ['approve', 'reject', 'request_changes'] },
      comments: { type: 'string', maxLength: 1000 }
    }
  }),
  async (req, res, next) => {
    try {
      const approval = await Procurement.processApproval(
        req.params.id,
        req.params.approvalId,
        {
          decision: req.body.decision,
          comments: req.body.comments,
          decidedBy: req.user.id,
          decidedAt: new Date()
        }
      );
      
      if (!approval) {
        return res.status(404).json({ success: false, message: 'Approval not found' });
      }
      
      res.json({ success: true, data: approval });
    } catch (error) {
      logger.error('Error processing approval', { error: error.message });
      res.status(500).json({ success: false, message: 'Error processing approval' });
    }
  }
);

// Budget Tracking
router.get('/:id/budget-tracking', verifyToken, async (req, res, next) => {
  try {
    const budgetData = await Procurement.getBudgetTracking(req.params.id);
    res.json({ success: true, data: budgetData });
  } catch (error) {
    logger.error('Error fetching budget tracking', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching budget tracking' });
  }
});

router.post('/:id/budget-entries',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody({
    type: 'object',
    required: ['type', 'amount', 'description'],
    properties: {
      type: { type: 'string', enum: ['expense', 'adjustment', 'commitment'] },
      amount: { type: 'number', minimum: 0 },
      description: { type: 'string', minLength: 1, maxLength: 500 },
      category: { type: 'string' },
      date: { type: 'string', format: 'date' },
      vendorId: { type: 'string' }
    }
  }),
  async (req, res, next) => {
    try {
      const budgetEntry = await Procurement.addBudgetEntry(req.params.id, {
        ...req.body,
        createdBy: req.user.id,
        createdAt: new Date(),
        date: req.body.date ? new Date(req.body.date) : new Date()
      });
      
      res.status(201).json({ success: true, data: budgetEntry });
    } catch (error) {
      logger.error('Error adding budget entry', { error: error.message });
      res.status(500).json({ success: false, message: 'Error adding budget entry' });
    }
  }
);

// Vendor Management
router.get('/:id/vendors', verifyToken, async (req, res, next) => {
  try {
    const vendors = await Procurement.getAssociatedVendors(req.params.id);
    res.json({ success: true, data: vendors });
  } catch (error) {
    logger.error('Error fetching vendors', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching vendors' });
  }
});

router.post('/:id/vendors',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody({
    type: 'object',
    required: ['vendorId', 'role'],
    properties: {
      vendorId: { type: 'string' },
      role: { type: 'string', enum: ['primary', 'backup', 'subcontractor'] },
      quotedAmount: { type: 'number', minimum: 0 },
      notes: { type: 'string', maxLength: 1000 }
    }
  }),
  async (req, res, next) => {
    try {
      const vendorAssociation = await Procurement.associateVendor(req.params.id, {
        ...req.body,
        associatedBy: req.user.id,
        associatedAt: new Date()
      });
      
      res.status(201).json({ success: true, data: vendorAssociation });
    } catch (error) {
      logger.error('Error associating vendor', { error: error.message });
      res.status(500).json({ success: false, message: 'Error associating vendor' });
    }
  }
);

// Templates
router.get('/templates', verifyToken, async (req, res, next) => {
  try {
    const { category, department } = req.query;
    const templates = await Procurement.getTemplates({
      ...(category && { category }),
      ...(department && { department }),
      isActive: true
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Error fetching templates', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching templates' });
  }
});

router.post('/templates',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody({
    type: 'object',
    required: ['name', 'category', 'template'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      category: { type: 'string' },
      description: { type: 'string', maxLength: 1000 },
      template: { type: 'object' },
      isPublic: { type: 'boolean' },
      department: { type: 'string' }
    }
  }),
  async (req, res, next) => {
    try {
      const template = await Procurement.createTemplate({
        ...req.body,
        createdBy: req.user.id,
        createdAt: new Date(),
        department: req.body.department || req.user.department,
        isActive: true
      });
      
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      logger.error('Error creating template', { error: error.message });
      res.status(500).json({ success: false, message: 'Error creating template' });
    }
  }
);

router.post('/from-template/:templateId',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody({
    type: 'object',
    properties: {
      overrides: { type: 'object' }
    }
  }),
  async (req, res, next) => {
    try {
      const procurement = await Procurement.createFromTemplate(
        req.params.templateId,
        {
          createdBy: req.user.id,
          department: req.user.department,
          overrides: req.body.overrides || {}
        }
      );
      
      res.status(201).json({ success: true, data: procurement });
    } catch (error) {
      logger.error('Error creating from template', { error: error.message });
      res.status(500).json({ success: false, message: 'Error creating from template' });
    }
  }
);

// Integration APIs
router.post('/:id/sync/external',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_PROCUREMENT),
  validateBody({
    type: 'object',
    required: ['system', 'action'],
    properties: {
      system: { type: 'string', enum: ['sap', 'oracle', 'dynamics', 'custom'] },
      action: { type: 'string', enum: ['push', 'pull', 'sync'] },
      config: { type: 'object' }
    }
  }),
  async (req, res, next) => {
    try {
      const result = await Procurement.syncWithExternalSystem(
        req.params.id,
        req.body.system,
        req.body.action,
        {
          config: req.body.config,
          initiatedBy: req.user.id,
          timestamp: new Date()
        }
      );
      
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error syncing with external system', { error: error.message });
      res.status(500).json({ success: false, message: 'Error syncing with external system' });
    }
  }
);

router.get('/integrations/status', verifyToken, async (req, res, next) => {
  try {
    const integrationStatus = await Procurement.getIntegrationStatus(req.user.department);
    res.json({ success: true, data: integrationStatus });
  } catch (error) {
    logger.error('Error fetching integration status', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching integration status' });
  }
});

// Enhanced Analytics with Cosmos DB optimized queries
router.get('/analytics/detailed', verifyToken, async (req, res, next) => {
  try {
    const { 
      timeRange = '30d', 
      groupBy = 'status',
      department = req.user.department
    } = req.query;
    
    const analytics = await Procurement.getDetailedAnalytics({
      timeRange,
      groupBy,
      department,
      userId: req.user.id
    });
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Error fetching detailed analytics', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

// Health check for procurement service
router.get('/health', async (req, res) => {
  try {
    const health = await Procurement.healthCheck();
    res.json({ 
      success: true, 
      status: 'healthy',
      timestamp: new Date(),
      data: health
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({ 
      success: false, 
      status: 'unhealthy',
      timestamp: new Date(),
      error: error.message
    });
  }
});

module.exports = router;
