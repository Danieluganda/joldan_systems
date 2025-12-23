/**
 * Audit Routes
 * 
 * Routes for managing procurement audits, compliance tracking, and audit trails
 * Feature 13: Audit trails and compliance reporting
 * 
 * Enhanced with authentication, validation, compliance features, and comprehensive reporting
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logStatusChange } = require('../middleware/auditLogger');

// Service imports
const auditService = require('../services/auditService');
const auditPackService = require('../services/auditPackService');
const notificationService = require('../services/notificationService');
const pdfService = require('../services/pdfService');

// Validation schemas
const auditValidation = {
  create: {
    procurementId: { type: 'string', required: true, minLength: 1 },
    auditType: { type: 'string', enum: ['internal', 'external', 'compliance', 'financial', 'operational'], required: true },
    scope: { type: 'string', enum: ['full', 'partial', 'targeted', 'follow_up'], default: 'full' },
    auditor: { type: 'string', required: true },
    scheduledDate: { type: 'string', format: 'date', required: true },
    deadline: { type: 'string', format: 'date' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    description: { type: 'string', required: true, maxLength: 2000 },
    objectives: { type: 'array', items: { type: 'string' }, required: true },
    criteria: { type: 'array', items: { type: 'string' } },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' }
  },
  update: {
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'] },
    auditType: { type: 'string', enum: ['internal', 'external', 'compliance', 'financial', 'operational'] },
    scope: { type: 'string', enum: ['full', 'partial', 'targeted', 'follow_up'] },
    auditor: { type: 'string' },
    scheduledDate: { type: 'string', format: 'date' },
    deadline: { type: 'string', format: 'date' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    description: { type: 'string', maxLength: 2000 },
    objectives: { type: 'array', items: { type: 'string' } },
    criteria: { type: 'array', items: { type: 'string' } },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    completionPercentage: { type: 'number', min: 0, max: 100 },
    findings: { type: 'array', items: { type: 'object' } },
    recommendations: { type: 'array', items: { type: 'object' } }
  },
  findings: {
    category: { type: 'string', enum: ['compliance', 'financial', 'operational', 'security', 'documentation'], required: true },
    severity: { type: 'string', enum: ['minor', 'moderate', 'major', 'critical'], required: true },
    title: { type: 'string', required: true, maxLength: 200 },
    description: { type: 'string', required: true, maxLength: 2000 },
    evidence: { type: 'array', items: { type: 'string' } },
    impact: { type: 'string', maxLength: 1000 },
    recommendation: { type: 'string', maxLength: 1000 },
    dueDate: { type: 'string', format: 'date' },
    assignedTo: { type: 'string' }
  },
  query: {
    status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'] },
    auditType: { type: 'string', enum: ['internal', 'external', 'compliance', 'financial', 'operational'] },
    scope: { type: 'string', enum: ['full', 'partial', 'targeted', 'follow_up'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    auditor: { type: 'string' },
    procurementId: { type: 'string' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 },
    sortBy: { type: 'string', enum: ['createdAt', 'scheduledDate', 'deadline', 'priority', 'status'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeFindings: { type: 'boolean', default: false }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  }
};

/**
 * @route   GET /api/audits
 * @desc    Get all audits with advanced filtering and pagination
 * @access  Private - requires 'audits:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('audits:read'),
  validateQuery(auditValidation.query),
  sanitize(),
  logView('audits', 'list'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      auditType,
      scope,
      priority,
      riskLevel,
      auditor,
      procurementId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeFindings = false
    } = req.query;

    // Build filter criteria
    const filters = {};
    if (status) filters.status = status;
    if (auditType) filters.auditType = auditType;
    if (scope) filters.scope = scope;
    if (priority) filters.priority = priority;
    if (riskLevel) filters.riskLevel = riskLevel;
    if (auditor) filters.auditor = auditor;
    if (procurementId) filters.procurementId = procurementId;
    
    // Date range filters
    if (startDate || endDate) {
      filters.scheduledDate = {};
      if (startDate) filters.scheduledDate.$gte = new Date(startDate);
      if (endDate) filters.scheduledDate.$lte = new Date(endDate);
    }

    // Apply user-level filtering if not admin
    if (!req.user.permissions.includes('audits:read:all')) {
      filters.$or = [
        { auditor: req.user.id },
        { createdBy: req.user.id },
        { assignedTeam: { $in: [req.user.id] } }
      ];
    }

    const result = await auditService.list({
      filters,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeFindings: includeFindings === 'true'
    });

    res.json({
      success: true,
      data: result.audits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: result.totalPages,
        totalRecords: result.totalRecords,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      filters: filters,
      sort: { [sortBy]: sortOrder },
      summary: result.summary
    });
  })
);

/**
 * @route   POST /api/audits
 * @desc    Create a new audit
 * @access  Private - requires 'audits:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('audits:create'),
  validateBody(auditValidation.create),
  sanitize(),
  logCreate('audits'),
  asyncHandler(async (req, res) => {
    const auditData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'scheduled'
    };

    const audit = await auditService.create(auditData);

    // Create audit pack
    const auditPack = await auditPackService.create({
      auditId: audit.id,
      documents: [],
      checklists: [],
      templates: []
    });

    // Send notifications to auditor and stakeholders
    await notificationService.notifyAuditScheduled(audit.id, {
      auditor: audit.auditor,
      stakeholders: audit.stakeholders || []
    });

    res.status(201).json({
      success: true,
      data: { ...audit, auditPackId: auditPack.id },
      message: 'Audit created successfully'
    });
  })
);

/**
 * @route   GET /api/audits/:id
 * @desc    Get audit by ID with detailed information
 * @access  Private - requires 'audits:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['audits:read', 'audits:read:own']),
  validateParams(auditValidation.params),
  requireOwnershipOrPermission('id', 'auditor', 'audits:read:all'),
  logView('audits', 'detail'),
  asyncHandler(async (req, res) => {
    const audit = await auditService.getById(req.params.id, {
      includeFindings: true,
      includeRecommendations: true,
      includeHistory: true,
      includeDocuments: true
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Check access permissions
    if (!req.user.permissions.includes('audits:read:all')) {
      const hasAccess = audit.auditor === req.user.id || 
                       audit.createdBy === req.user.id ||
                       (audit.assignedTeam && audit.assignedTeam.includes(req.user.id));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Get associated audit pack
    const auditPack = await auditPackService.getByAuditId(audit.id);

    res.json({
      success: true,
      data: {
        ...audit,
        auditPack
      }
    });
  })
);

/**
 * @route   PUT /api/audits/:id
 * @desc    Update audit
 * @access  Private - requires 'audits:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['audits:update', 'audits:update:own']),
  validateParams(auditValidation.params),
  validateBody(auditValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'auditor', 'audits:update:all'),
  logUpdate('audits'),
  asyncHandler(async (req, res) => {
    const auditId = req.params.id;
    const updates = req.body;

    const existingAudit = await auditService.getById(auditId);
    if (!existingAudit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Add update metadata
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const updatedAudit = await auditService.update(auditId, updates);

    // Log status changes
    if (updates.status && updates.status !== existingAudit.status) {
      await logStatusChange('audits', auditId, existingAudit.status, updates.status);
      
      // Send status change notifications
      await notificationService.notifyAuditStatusChange(auditId, {
        oldStatus: existingAudit.status,
        newStatus: updates.status,
        updatedBy: req.user.id
      });
    }

    res.json({
      success: true,
      data: updatedAudit,
      message: 'Audit updated successfully'
    });
  })
);

/**
 * @route   POST /api/audits/:id/findings
 * @desc    Add finding to audit
 * @access  Private - requires 'audits:update' permission
 */
router.post('/:id/findings',
  verifyToken,
  checkPermission('audits:update'),
  validateParams(auditValidation.params),
  validateBody(auditValidation.findings),
  sanitize(),
  asyncHandler(async (req, res) => {
    const auditId = req.params.id;
    const findingData = {
      ...req.body,
      id: require('crypto').randomUUID(),
      createdBy: req.user.id,
      createdAt: new Date(),
      status: 'open'
    };

    const audit = await auditService.addFinding(auditId, findingData);
    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Send notification for critical findings
    if (findingData.severity === 'critical' || findingData.severity === 'major') {
      await notificationService.notifyAuditFinding(auditId, findingData);
    }

    res.status(201).json({
      success: true,
      data: findingData,
      message: 'Finding added successfully'
    });
  })
);

/**
 * @route   PUT /api/audits/:id/findings/:findingId
 * @desc    Update audit finding
 * @access  Private - requires 'audits:update' permission
 */
router.put('/:id/findings/:findingId',
  verifyToken,
  checkPermission('audits:update'),
  validateParams({ 
    id: auditValidation.params.id, 
    findingId: { type: 'string', required: true } 
  }),
  validateBody({
    ...auditValidation.findings,
    status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'dismissed'] }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id: auditId, findingId } = req.params;
    const updates = {
      ...req.body,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    const result = await auditService.updateFinding(auditId, findingId, updates);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Audit or finding not found'
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'Finding updated successfully'
    });
  })
);

/**
 * @route   POST /api/audits/:id/complete
 * @desc    Complete audit and generate final report
 * @access  Private - requires 'audits:complete' permission
 */
router.post('/:id/complete',
  verifyToken,
  checkPermission('audits:complete'),
  validateParams(auditValidation.params),
  validateBody({
    conclusion: { type: 'string', required: true, maxLength: 2000 },
    overallRating: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'], required: true },
    keyFindings: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'object' } },
    attachments: { type: 'array', items: { type: 'string' } }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const auditId = req.params.id;
    const completionData = {
      ...req.body,
      completedBy: req.user.id,
      completionDate: new Date()
    };

    const audit = await auditService.complete(auditId, completionData);
    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Generate audit report
    const report = await auditService.generateReport(auditId);

    // Send completion notifications
    await notificationService.notifyAuditCompleted(auditId, {
      completion: completionData,
      reportId: report.id
    });

    res.json({
      success: true,
      data: {
        audit,
        report
      },
      message: 'Audit completed successfully'
    });
  })
);

/**
 * @route   GET /api/audits/:id/report
 * @desc    Generate and download audit report
 * @access  Private - requires 'audits:read' permission
 */
router.get('/:id/report',
  verifyToken,
  checkPermission('audits:read'),
  validateParams(auditValidation.params),
  validateQuery({
    format: { type: 'string', enum: ['pdf', 'excel', 'json'], default: 'pdf' },
    includeEvidence: { type: 'boolean', default: true }
  }),
  logView('audits', 'report'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'pdf', includeEvidence = true } = req.query;

    const audit = await auditService.getById(id, {
      includeFindings: true,
      includeRecommendations: true,
      includeEvidence: includeEvidence === 'true'
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    let reportData;
    let contentType;
    let filename;

    switch (format) {
      case 'pdf':
        reportData = await auditService.generatePDFReport(id, { includeEvidence });
        contentType = 'application/pdf';
        filename = `audit-report-${id}.pdf`;
        break;
      case 'excel':
        reportData = await auditService.generateExcelReport(id, { includeEvidence });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `audit-report-${id}.xlsx`;
        break;
      case 'json':
        reportData = Buffer.from(JSON.stringify(audit, null, 2));
        contentType = 'application/json';
        filename = `audit-report-${id}.json`;
        break;
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    res.send(reportData);
  })
);

/**
 * @route   GET /api/audits/compliance/dashboard
 * @desc    Get compliance dashboard data
 * @access  Private - requires 'audits:read' permission
 */
router.get('/compliance/dashboard',
  verifyToken,
  checkPermission('audits:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['30d', '90d', '180d', '1y'], default: '90d' },
    auditType: { type: 'string', enum: ['internal', 'external', 'compliance', 'financial', 'operational'] }
  }),
  logView('audits', 'compliance_dashboard'),
  asyncHandler(async (req, res) => {
    const { timeframe = '90d', auditType } = req.query;
    
    const dashboardData = await auditService.getComplianceDashboard({
      timeframe,
      auditType,
      userId: req.user.permissions.includes('audits:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: dashboardData
    });
  })
);

/**
 * @route   GET /api/audits/findings/analytics
 * @desc    Get findings analytics and trends
 * @access  Private - requires 'audits:read' permission
 */
router.get('/findings/analytics',
  verifyToken,
  checkPermission('audits:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['30d', '90d', '180d', '1y'], default: '90d' },
    category: { type: 'string', enum: ['compliance', 'financial', 'operational', 'security', 'documentation'] },
    severity: { type: 'string', enum: ['minor', 'moderate', 'major', 'critical'] }
  }),
  logView('audits', 'findings_analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '90d', category, severity } = req.query;
    
    const analytics = await auditService.getFindingsAnalytics({
      timeframe,
      category,
      severity,
      userId: req.user.permissions.includes('audits:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   DELETE /api/audits/:id
 * @desc    Cancel/delete audit
 * @access  Private - requires 'audits:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['audits:delete', 'audits:delete:own']),
  validateParams(auditValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'audits:delete:all'),
  logDelete('audits'),
  asyncHandler(async (req, res) => {
    const auditId = req.params.id;

    const audit = await auditService.getById(auditId);
    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Check if audit can be deleted
    if (audit.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed audit'
      });
    }

    const result = await auditService.cancel(auditId, {
      cancelledBy: req.user.id,
      reason: req.body.reason || 'Cancelled by user',
      cancelDate: new Date()
    });

    // Clean up associated audit pack
    await auditPackService.deleteByAuditId(auditId);

    // Send cancellation notifications
    await notificationService.notifyAuditCancelled(auditId, audit);

    res.json({
      success: true,
      data: result,
      message: 'Audit cancelled successfully'
    });
  })
);

module.exports = router;
