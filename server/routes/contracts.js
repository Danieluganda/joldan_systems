/**
 * Contract Routes
 * 
 * Routes for managing procurement contracts, lifecycle, amendments, and compliance
 * Feature 13: Contract lifecycle management and document generation
 * 
 * Enhanced with authentication, validation, digital signing, version control, and comprehensive contract management
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize, validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logStatusChange, logApproval } = require('../middleware/auditLogger');

// Service imports
const contractService = require('../services/contractService');
const awardService = require('../services/awardService');
const documentService = require('../services/documentService');
const pdfService = require('../services/pdfService');
const notificationService = require('../services/notificationService');
const complianceService = require('../services/complianceService');

// Validation schemas
const contractValidation = {
  create: {
    awardId: { type: 'string', required: true, minLength: 1 },
    templateId: { type: 'string' },
    contractType: { type: 'string', enum: ['goods', 'services', 'construction', 'consultancy', 'maintenance', 'lease'], required: true },
    title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    value: { type: 'number', required: true, min: 0 },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'], default: 'USD' },
    startDate: { type: 'string', format: 'date', required: true },
    endDate: { type: 'string', format: 'date', required: true },
    autoRenewal: { type: 'boolean', default: false },
    renewalTerms: { type: 'object' },
    paymentTerms: { type: 'object', required: true },
    deliverables: { type: 'array', items: { type: 'object' } },
    milestones: { type: 'array', items: { type: 'object' } },
    sla: { type: 'object' }, // Service Level Agreement
    penalties: { type: 'array', items: { type: 'object' } },
    bonuses: { type: 'array', items: { type: 'object' } },
    terminationClause: { type: 'object' },
    confidentialityClause: { type: 'object' },
    disputeResolution: { type: 'object' },
    governingLaw: { type: 'string', maxLength: 100 },
    signatories: { type: 'array', items: { type: 'object' }, required: true },
    witnesses: { type: 'array', items: { type: 'object' } }
  },
  update: {
    title: { type: 'string', minLength: 5, maxLength: 200 },
    description: { type: 'string', maxLength: 2000 },
    value: { type: 'number', min: 0 },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    paymentTerms: { type: 'object' },
    deliverables: { type: 'array', items: { type: 'object' } },
    milestones: { type: 'array', items: { type: 'object' } },
    sla: { type: 'object' },
    penalties: { type: 'array', items: { type: 'object' } },
    bonuses: { type: 'array', items: { type: 'object' } },
    signatories: { type: 'array', items: { type: 'object' } },
    witnesses: { type: 'array', items: { type: 'object' } }
  },
  amendment: {
    amendmentType: { type: 'string', enum: ['value_change', 'timeline_extension', 'scope_change', 'terms_modification', 'renewal'], required: true },
    reason: { type: 'string', required: true, maxLength: 1000 },
    changes: { type: 'object', required: true },
    effectiveDate: { type: 'string', format: 'date', required: true },
    requiresApproval: { type: 'boolean', default: true },
    justification: { type: 'string', maxLength: 2000 },
    impactAssessment: { type: 'object' },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  approve: {
    decision: { type: 'string', enum: ['approve', 'reject', 'request_changes'], required: true },
    comments: { type: 'string', maxLength: 2000 },
    conditions: { type: 'array', items: { type: 'string' } },
    attachments: { type: 'array', items: { type: 'string' } },
    approvalLevel: { type: 'string', enum: ['legal', 'financial', 'technical', 'executive'] }
  },
  signing: {
    signatureType: { type: 'string', enum: ['digital', 'electronic', 'physical'], required: true },
    signatoryId: { type: 'string', required: true },
    signatureData: { type: 'object' }, // Digital signature data
    signatureDate: { type: 'string', format: 'datetime' },
    location: { type: 'string', maxLength: 100 },
    witnessId: { type: 'string' },
    comments: { type: 'string', maxLength: 500 }
  },
  performance: {
    evaluationDate: { type: 'string', format: 'date', required: true },
    performancePeriod: { type: 'object', required: true },
    deliverableStatus: { type: 'array', items: { type: 'object' } },
    milestoneStatus: { type: 'array', items: { type: 'object' } },
    slaCompliance: { type: 'object' },
    qualityMetrics: { type: 'object' },
    financialPerformance: { type: 'object' },
    overallRating: { type: 'number', required: true, min: 1, max: 5 },
    issues: { type: 'array', items: { type: 'object' } },
    recommendations: { type: 'string', maxLength: 1000 },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  query: {
    status: { type: 'string', enum: ['draft', 'pending_approval', 'approved', 'pending_signature', 'signed', 'active', 'completed', 'terminated', 'cancelled', 'disputed'] },
    contractType: { type: 'string', enum: ['goods', 'services', 'construction', 'consultancy', 'maintenance', 'lease'] },
    supplierId: { type: 'string' },
    awardId: { type: 'string' },
    minValue: { type: 'number', min: 0 },
    maxValue: { type: 'number', min: 0 },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    expiringIn: { type: 'number', min: 1 }, // Days until expiry
    autoRenewal: { type: 'boolean' },
    search: { type: 'string', minLength: 3, maxLength: 100 },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 },
    sortBy: { type: 'string', enum: ['createdAt', 'startDate', 'endDate', 'value', 'status', 'title'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeAmendments: { type: 'boolean', default: false },
    includePerformance: { type: 'boolean', default: false }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  }
};

/**
 * @route   GET /api/contracts
 * @desc    Get all contracts with advanced filtering and analytics
 * @access  Private - requires 'contracts:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('contracts:read'),
  validateQuery(contractValidation.query),
  sanitize(),
  logView('contracts', 'list'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      contractType,
      supplierId,
      awardId,
      minValue,
      maxValue,
      currency,
      startDate,
      endDate,
      expiringIn,
      autoRenewal,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeAmendments = false,
      includePerformance = false
    } = req.query;

    // Build filter criteria
    const filters = {};
    if (status) filters.status = status;
    if (contractType) filters.contractType = contractType;
    if (supplierId) filters.supplierId = supplierId;
    if (awardId) filters.awardId = awardId;
    if (currency) filters.currency = currency;
    if (autoRenewal !== undefined) filters.autoRenewal = autoRenewal === 'true';
    
    // Value range filters
    if (minValue || maxValue) {
      filters.value = {};
      if (minValue) filters.value.$gte = parseFloat(minValue);
      if (maxValue) filters.value.$lte = parseFloat(maxValue);
    }
    
    // Date range filters
    if (startDate || endDate) {
      filters.startDate = {};
      if (startDate) filters.startDate.$gte = new Date(startDate);
      if (endDate) filters.startDate.$lte = new Date(endDate);
    }

    // Expiring soon filter
    if (expiringIn) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(expiringIn));
      filters.endDate = { $lte: futureDate };
      filters.status = { $in: ['active', 'signed'] };
    }

    // Apply user-level filtering if not admin
    if (!req.user.permissions.includes('contracts:read:all')) {
      filters.$or = [
        { createdBy: req.user.id },
        { 'signatories.userId': req.user.id },
        { stakeholders: req.user.id }
      ];
    }

    const result = await contractService.list({
      filters,
      search,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeAmendments: includeAmendments === 'true',
      includePerformance: includePerformance === 'true',
      includeSupplier: true,
      includeAward: true
    });

    res.json({
      success: true,
      data: result.contracts,
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
        typeBreakdown: result.typeBreakdown,
        currencyBreakdown: result.currencyBreakdown,
        expiringContracts: result.expiringContracts
      },
      filters: filters,
      sort: { [sortBy]: sortOrder }
    });
  })
);

/**
 * @route   POST /api/contracts
 * @desc    Create a new contract
 * @access  Private - requires 'contracts:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('contracts:create'),
  validateBody(contractValidation.create),
  sanitize(),
  logCreate('contracts'),
  asyncHandler(async (req, res) => {
    const contractData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'draft',
      contractNumber: await contractService.generateContractNumber(),
      version: '1.0'
    };

    // Validate contract dates
    if (new Date(contractData.startDate) >= new Date(contractData.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Contract start date must be before end date'
      });
    }

    // Validate award exists and is approved
    const award = await awardService.getById(contractData.awardId);
    if (!award) {
      return res.status(404).json({
        success: false,
        message: 'Award not found'
      });
    }

    if (award.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Award must be approved before contract creation'
      });
    }

    // Auto-populate contract data from award
    contractData.supplierId = award.winningSupplierId;
    contractData.rfqId = award.rfqId;
    
    const contract = await contractService.create(contractData);

    // Generate initial contract document
    const document = await contractService.generateDocument(contract.id, {
      templateId: contractData.templateId,
      format: 'pdf'
    });

    res.status(201).json({
      success: true,
      data: {
        ...contract,
        documentId: document.id
      },
      message: 'Contract created successfully'
    });
  })
);

/**
 * @route   GET /api/contracts/:id
 * @desc    Get contract by ID with comprehensive details
 * @access  Private - requires 'contracts:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['contracts:read', 'contracts:read:own']),
  validateParams(contractValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'contracts:read:all'),
  logView('contracts', 'detail'),
  asyncHandler(async (req, res) => {
    const contract = await contractService.getById(req.params.id, {
      includeAward: true,
      includeSupplier: true,
      includeAmendments: true,
      includePerformanceHistory: true,
      includeDocuments: true,
      includeSignatures: true,
      includeCompliance: true
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check access permissions
    if (!req.user.permissions.includes('contracts:read:all')) {
      const hasAccess = contract.createdBy === req.user.id ||
                       contract.signatories?.some(s => s.userId === req.user.id) ||
                       contract.stakeholders?.includes(req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: contract
    });
  })
);

/**
 * @route   PUT /api/contracts/:id
 * @desc    Update contract (only if in draft status)
 * @access  Private - requires 'contracts:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['contracts:update', 'contracts:update:own']),
  validateParams(contractValidation.params),
  validateBody(contractValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'createdBy', 'contracts:update:all'),
  logUpdate('contracts'),
  asyncHandler(async (req, res) => {
    const contractId = req.params.id;
    const updates = req.body;

    const existingContract = await contractService.getById(contractId);
    if (!existingContract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if contract is in editable state
    if (existingContract.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Contract cannot be modified after approval process has started'
      });
    }

    // Validate date changes
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.startDate) >= new Date(updates.endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Contract start date must be before end date'
        });
      }
    }

    // Add update metadata
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const updatedContract = await contractService.update(contractId, updates);

    // Regenerate contract document if significant changes
    if (updates.value || updates.startDate || updates.endDate || updates.deliverables) {
      await contractService.regenerateDocument(contractId);
    }

    res.json({
      success: true,
      data: updatedContract,
      message: 'Contract updated successfully'
    });
  })
);

/**
 * @route   POST /api/contracts/:id/approve
 * @desc    Approve or reject contract
 * @access  Private - requires 'contracts:approve' permission
 */
router.post('/:id/approve',
  verifyToken,
  checkPermission('contracts:approve'),
  validateParams(contractValidation.params),
  validateBody(contractValidation.approve),
  sanitize(),
  logApproval('contracts'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { decision, comments, conditions, attachments, approvalLevel } = req.body;

    const contract = await contractService.getById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if contract is pending approval
    if (contract.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Contract is not pending approval'
      });
    }

    const approvalData = {
      approverId: req.user.id,
      decision,
      comments,
      conditions,
      attachments,
      approvalLevel,
      timestamp: new Date()
    };

    const result = await contractService.processApproval(id, approvalData);

    if (decision === 'approve') {
      // Send signing notifications
      await notificationService.notifyContractReadyForSigning(id, contract.signatories);
    }

    res.json({
      success: true,
      data: result.contract,
      message: `Contract ${decision}${decision === 'approve' ? 'd' : 'ed'} successfully`
    });
  })
);

/**
 * @route   POST /api/contracts/:id/sign
 * @desc    Sign contract digitally or electronically
 * @access  Private - requires 'contracts:sign' permission
 */
router.post('/:id/sign',
  verifyToken,
  checkPermission('contracts:sign'),
  validateParams(contractValidation.params),
  validateBody(contractValidation.signing),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const signingData = {
      ...req.body,
      signedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const contract = await contractService.getById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if contract is ready for signing
    if (contract.status !== 'pending_signature') {
      return res.status(400).json({
        success: false,
        message: 'Contract is not ready for signing'
      });
    }

    // Validate signatory authorization
    const isAuthorizedSignatory = contract.signatories.some(
      s => s.userId === req.body.signatoryId && s.canSign
    );

    if (!isAuthorizedSignatory) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized to sign this contract'
      });
    }

    const signature = await contractService.addSignature(id, signingData);

    // Check if all required signatures are collected
    const allSigned = await contractService.checkAllSignatures(id);
    if (allSigned) {
      await contractService.updateStatus(id, 'signed');
      await notificationService.notifyContractFullyExecuted(id, contract);
    }

    res.json({
      success: true,
      data: {
        signature,
        allSigned
      },
      message: 'Contract signed successfully'
    });
  })
);

/**
 * @route   POST /api/contracts/:id/amendments
 * @desc    Create contract amendment
 * @access  Private - requires 'contracts:amend' permission
 */
router.post('/:id/amendments',
  verifyToken,
  checkPermission('contracts:amend'),
  validateParams(contractValidation.params),
  validateBody(contractValidation.amendment),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const amendmentData = {
      ...req.body,
      createdBy: req.user.id,
      amendmentNumber: await contractService.generateAmendmentNumber(id),
      status: 'pending'
    };

    const contract = await contractService.getById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if contract is active
    if (contract.status !== 'active' && contract.status !== 'signed') {
      return res.status(400).json({
        success: false,
        message: 'Contract must be active to create amendments'
      });
    }

    const amendment = await contractService.createAmendment(id, amendmentData);

    // Send amendment notifications
    await notificationService.notifyContractAmendment(id, amendment);

    res.status(201).json({
      success: true,
      data: amendment,
      message: 'Amendment created successfully'
    });
  })
);

/**
 * @route   POST /api/contracts/:id/performance
 * @desc    Add performance evaluation
 * @access  Private - requires 'contracts:evaluate' permission
 */
router.post('/:id/performance',
  verifyToken,
  checkPermission('contracts:evaluate'),
  validateParams(contractValidation.params),
  validateBody(contractValidation.performance),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const performanceData = {
      ...req.body,
      evaluatedBy: req.user.id,
      evaluationId: require('crypto').randomUUID()
    };

    const contract = await contractService.getById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if contract is active
    if (contract.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Performance can only be evaluated for active contracts'
      });
    }

    const evaluation = await contractService.addPerformanceEvaluation(id, performanceData);

    // Send performance notification to supplier
    await notificationService.notifyContractPerformance(contract.supplierId, {
      contractId: id,
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
 * @route   POST /api/contracts/:id/terminate
 * @desc    Terminate contract
 * @access  Private - requires 'contracts:terminate' permission
 */
router.post('/:id/terminate',
  verifyToken,
  checkPermission('contracts:terminate'),
  validateParams(contractValidation.params),
  validateBody({
    reason: { type: 'string', required: true, maxLength: 1000 },
    terminationType: { type: 'string', enum: ['convenience', 'breach', 'mutual', 'expiration'], required: true },
    terminationDate: { type: 'string', format: 'date', required: true },
    noticePeriod: { type: 'number', min: 0 },
    settlementDetails: { type: 'object' },
    attachments: { type: 'array', items: { type: 'string' } }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const terminationData = {
      ...req.body,
      terminatedBy: req.user.id,
      terminationInitiated: new Date()
    };

    const contract = await contractService.getById(id);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if contract can be terminated
    const terminableStates = ['active', 'signed'];
    if (!terminableStates.includes(contract.status)) {
      return res.status(400).json({
        success: false,
        message: 'Contract cannot be terminated in current state'
      });
    }

    const termination = await contractService.terminate(id, terminationData);

    // Send termination notifications
    await notificationService.notifyContractTermination(id, termination);

    res.json({
      success: true,
      data: termination,
      message: 'Contract termination initiated successfully'
    });
  })
);

/**
 * @route   GET /api/contracts/:id/documents
 * @desc    Get contract documents
 * @access  Private - requires 'contracts:read' permission
 */
router.get('/:id/documents',
  verifyToken,
  checkPermission('contracts:read'),
  validateParams(contractValidation.params),
  logView('contracts', 'documents'),
  asyncHandler(async (req, res) => {
    const documents = await contractService.getDocuments(req.params.id);

    if (!documents) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    res.json({
      success: true,
      data: documents
    });
  })
);

/**
 * @route   GET /api/contracts/:id/generate-pdf
 * @desc    Generate contract PDF document
 * @access  Private - requires 'contracts:read' permission
 */
router.get('/:id/generate-pdf',
  verifyToken,
  checkPermission('contracts:read'),
  validateParams(contractValidation.params),
  asyncHandler(async (req, res) => {
    const contract = await contractService.getById(req.params.id, {
      includeAll: true
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    const pdfBuffer = await pdfService.generateContractPDF(contract);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract-${contract.contractNumber}.pdf"`);
    res.send(pdfBuffer);
  })
);

/**
 * @route   GET /api/contracts/analytics/dashboard
 * @desc    Get contract analytics for dashboard
 * @access  Private - requires 'contracts:read' permission
 */
router.get('/analytics/dashboard',
  verifyToken,
  checkPermission('contracts:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['30d', '90d', '180d', '1y'], default: '90d' },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] }
  }),
  logView('contracts', 'analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '90d', currency } = req.query;
    
    const analytics = await contractService.getAnalytics({
      timeframe,
      currency,
      userId: req.user.permissions.includes('contracts:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   GET /api/contracts/compliance/report
 * @desc    Get contract compliance report
 * @access  Private - requires 'contracts:compliance' permission
 */
router.get('/compliance/report',
  verifyToken,
  checkPermission('contracts:compliance'),
  validateQuery({
    format: { type: 'string', enum: ['json', 'pdf', 'excel'], default: 'json' },
    includeDetails: { type: 'boolean', default: true }
  }),
  asyncHandler(async (req, res) => {
    const { format = 'json', includeDetails = true } = req.query;
    
    const complianceReport = await complianceService.generateContractReport({
      format,
      includeDetails: includeDetails === 'true',
      userId: req.user.permissions.includes('contracts:compliance:all') ? null : req.user.id
    });

    if (format === 'json') {
      res.json({
        success: true,
        data: complianceReport
      });
    } else {
      // Return file for PDF/Excel formats
      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="contract-compliance-report.${format}"`);
      res.send(complianceReport.buffer);
    }
  })
);

/**
 * @route   DELETE /api/contracts/:id
 * @desc    Cancel contract (only if in draft)
 * @access  Private - requires 'contracts:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['contracts:delete', 'contracts:delete:own']),
  validateParams(contractValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'contracts:delete:all'),
  logDelete('contracts'),
  asyncHandler(async (req, res) => {
    const contractId = req.params.id;

    const contract = await contractService.getById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Check if contract can be cancelled
    if (contract.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Contract cannot be cancelled once approval process has started'
      });
    }

    const result = await contractService.cancel(contractId, {
      cancelledBy: req.user.id,
      reason: req.body.reason || 'Cancelled by user',
      cancellationDate: new Date()
    });

    res.json({
      success: true,
      data: result,
      message: 'Contract cancelled successfully'
    });
  })
);

module.exports = router;
