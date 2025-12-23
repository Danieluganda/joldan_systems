/**
 * RFQ Routes - Comprehensive Request for Quotation Management System
 *
 * Advanced API endpoints for complete RFQ lifecycle management including:
 * - RFQ creation, publishing, and lifecycle management
 * - Supplier management and invitation systems
 * - Technical specifications and requirements
 * - Submission tracking and evaluation preparation
 * - Clarification management and transparency
 * - Timeline management and deadline tracking
 * - Analytics, reporting, and performance metrics
 * - Template system and RFQ standardization
 * - Amendment and modification workflows
 * - Integration with procurement planning and evaluation systems
 *
 * @version 2.0.0
 * @author Procurement Team
 */

const express = require('express');
const router = express.Router();
const RFQ = require('../db/models/RFQ');
const Submission = require('../db/models/Submission');
const Clarification = require('../db/models/Clarification');
const Supplier = require('../db/models/Supplier');
const Template = require('../db/models/Template');
const Evaluation = require('../db/models/Evaluation');
const Document = require('../db/models/Document');
const Notification = require('../db/models/Notification');
const { verifyToken, checkPermission, rateLimiter } = require('../middleware/auth');
const { validateBody, validateFile, sanitizeInput, checkSecurityThreats } = require('../middleware/validation');
const { 
  logCreate, 
  logUpdate, 
  logDelete, 
  logView, 
  logStatusChange, 
  logBulkOperation,
  logApproval 
} = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { 
  RFQ_SCHEMA, 
  SUBMISSION_SCHEMA, 
  CLARIFICATION_SCHEMA,
  SUPPLIER_INVITATION_SCHEMA,
  RFQ_AMENDMENT_SCHEMA,
  TEMPLATE_SCHEMA
} = require('../shared/validation-rules');
const { PERMISSIONS } = require('../config/permissions');
const { 
  RFQ_STATUS, 
  SUBMISSION_STATUS, 
  EVALUATION_TYPES,
  NOTIFICATION_TYPES 
} = require('../shared/constants');

// Import services
const rfqService = require('../services/rfqService');
const supplierService = require('../services/supplierService');
const notificationService = require('../services/notificationService');
const documentService = require('../services/documentService');
const templateService = require('../services/templateService');
const evaluationService = require('../services/evaluationService');
const analyticsService = require('../services/analyticsService');
const pdfService = require('../services/pdfService');

// WebSocket for real-time updates
const WebSocket = require('ws');
let wss;

// ============ COMPREHENSIVE RFQ MANAGEMENT ENDPOINTS ============

/**
 * Get all RFQs with advanced filtering and analytics
 * GET /api/rfqs
 * Features: Advanced filtering, search, pagination, analytics, export
 */
router.get('/', 
  verifyToken, 
  rateLimiter(100, 15), // 100 requests per 15 minutes
  logView('RFQ', 'list'),
  async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        status,
        procurementId,
        supplierId,
        dateRange,
        search,
        category,
        priority,
        budget,
        includeAnalytics,
        export: exportFormat
      } = req.query;

      // Build comprehensive filters
      const filters = {};
      if (status) filters.status = { $in: status.split(',') };
      if (procurementId) filters.procurementId = procurementId;
      if (supplierId) filters['invitedSuppliers.supplierId'] = supplierId;
      if (category) filters.category = category;
      if (priority) filters.priority = priority;
      
      // Date range filtering
      if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        filters.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      // Budget range filtering
      if (budget) {
        const [minBudget, maxBudget] = budget.split(',');
        filters.estimatedBudget = {
          $gte: parseInt(minBudget),
          $lte: parseInt(maxBudget)
        };
      }
      
      // Text search across multiple fields
      if (search) {
        filters.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'specifications.description': { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: sort,
        populate: [
          { path: 'procurementId', select: 'title category status' },
          { path: 'createdBy', select: 'name email department' },
          { path: 'invitedSuppliers.supplierId', select: 'name category rating' },
          { path: 'evaluations', select: 'status evaluatorCount averageScore' }
        ]
      };

      let result;
      if (exportFormat) {
        // Export functionality
        const allRfqs = await rfqService.getAllRFQs(filters, { ...options, limit: 0 });
        
        if (exportFormat === 'pdf') {
          const pdfBuffer = await pdfService.generateRFQReport(allRfqs.data);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="rfqs_report.pdf"');
          return res.send(pdfBuffer);
        } else if (exportFormat === 'excel') {
          const excelBuffer = await rfqService.exportToExcel(allRfqs.data);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="rfqs_export.xlsx"');
          return res.send(excelBuffer);
        }
      } else {
        result = await rfqService.getAllRFQs(filters, options);
      }

      // Add analytics if requested
      let analytics = null;
      if (includeAnalytics === 'true') {
        analytics = await rfqService.getRFQAnalytics(filters);
      }

      res.json({
        success: true,
        data: result.data,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
          itemsPerPage: result.itemsPerPage,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        },
        analytics,
        filters: Object.keys(filters),
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          processingTime: Date.now() - req.startTime
        }
      });

    } catch (error) {
      logger.error('Error fetching RFQs', { 
        error: error.message, 
        stack: error.stack,
        userId: req.user.id,
        query: req.query 
      });
      next(error);
    }
  }
);

/**
 * Get RFQ by ID with comprehensive details
 * GET /api/rfqs/:id
 * Features: Full entity relationships, timeline, analytics, security checks
 */
router.get('/:id', 
  verifyToken, 
  rateLimiter(200, 15),
  logView('RFQ', 'detail'),
  async (req, res, next) => {
    try {
      const { includeTimeline, includeAnalytics, includeSupplierDetails } = req.query;
      
      const rfq = await rfqService.getRFQById(req.params.id, {
        populate: [
          { path: 'procurementId', select: 'title category budget status timeline' },
          { path: 'createdBy', select: 'name email department role' },
          { path: 'assignedTo', select: 'name email department' },
          { path: 'invitedSuppliers.supplierId', select: 'name category rating contactInfo' },
          { path: 'evaluations', populate: { path: 'evaluators', select: 'name email' } },
          { path: 'clarifications', populate: { path: 'vendorId', select: 'name' } },
          { path: 'submissions', populate: { path: 'vendorId', select: 'name rating' } },
          { path: 'documents', select: 'name type size uploadedBy uploadedAt' },
          { path: 'amendments', populate: { path: 'createdBy', select: 'name' } }
        ]
      });

      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check access permissions
      const hasAccess = await rfqService.checkUserAccess(rfq, req.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied to this RFQ',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Enhance response with additional data
      const response = { ...rfq.toObject() };

      // Add timeline if requested
      if (includeTimeline === 'true') {
        response.timeline = await rfqService.getRFQTimeline(req.params.id);
      }

      // Add analytics if requested
      if (includeAnalytics === 'true') {
        response.analytics = await rfqService.getRFQAnalytics({ _id: req.params.id });
      }

      // Add supplier performance data if requested
      if (includeSupplierDetails === 'true') {
        response.supplierPerformance = await rfqService.getSupplierPerformanceData(rfq.invitedSuppliers);
      }

      // Add user-specific data
      response.userPermissions = await rfqService.getUserPermissions(req.params.id, req.user);
      response.userActions = await rfqService.getAvailableUserActions(rfq, req.user);

      res.json({
        success: true,
        data: response,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          accessLevel: hasAccess.level,
          lastModified: rfq.updatedAt
        }
      });

    } catch (error) {
      logger.error('Error fetching RFQ details', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Create comprehensive RFQ with templates and supplier invitations
 * POST /api/rfqs
 * Features: Template-based creation, automatic supplier matching, document handling
 */
router.post('/',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_RFQ),
  rateLimiter(10, 60), // 10 RFQ creations per hour
  validateBody(RFQ_SCHEMA),
  sanitizeInput,
  checkSecurityThreats,
  logCreate('RFQ'),
  async (req, res, next) => {
    try {
      const rfqData = {
        ...req.body,
        createdBy: req.user.id,
        status: RFQ_STATUS.DRAFT,
        metadata: {
          createdAt: new Date(),
          createdBy: req.user.id,
          version: '1.0',
          lastModified: new Date()
        }
      };

      // Use template if specified
      if (req.body.templateId) {
        const template = await templateService.getTemplate(req.body.templateId);
        if (template) {
          rfqData.specifications = { ...template.specifications, ...req.body.specifications };
          rfqData.evaluationCriteria = { ...template.evaluationCriteria, ...req.body.evaluationCriteria };
          rfqData.terms = { ...template.terms, ...req.body.terms };
        }
      }

      // Create RFQ
      const rfq = await rfqService.createRFQ(rfqData);

      // Auto-suggest suppliers if requested
      if (req.body.autoSuggestSuppliers) {
        const suggestedSuppliers = await supplierService.suggestSuppliers({
          category: rfq.category,
          budget: rfq.estimatedBudget,
          location: rfq.deliveryLocation,
          requirements: rfq.specifications
        });
        
        if (suggestedSuppliers.length > 0) {
          await rfqService.addSuggestedSuppliers(rfq._id, suggestedSuppliers);
        }
      }

      // Create initial evaluation framework
      if (rfq.evaluationCriteria && rfq.evaluationCriteria.length > 0) {
        await evaluationService.createEvaluationFramework(rfq._id, rfq.evaluationCriteria);
      }

      // Schedule publication if specified
      if (req.body.scheduledPublishDate) {
        await rfqService.schedulePublication(rfq._id, new Date(req.body.scheduledPublishDate));
      }

      // Generate RFQ number
      const rfqNumber = await rfqService.generateRFQNumber(rfq.category);
      await rfqService.updateRFQ(rfq._id, { rfqNumber });

      // Populate response
      const populatedRFQ = await rfqService.getRFQById(rfq._id, {
        populate: [
          { path: 'procurementId', select: 'title category' },
          { path: 'createdBy', select: 'name email department' },
          { path: 'suggestedSuppliers.supplierId', select: 'name category rating' }
        ]
      });

      // Send notifications for team collaboration
      if (req.body.collaborators && req.body.collaborators.length > 0) {
        await notificationService.notifyCollaborators(
          req.body.collaborators,
          NOTIFICATION_TYPES.RFQ_COLLABORATION_INVITE,
          {
            rfqId: rfq._id,
            rfqTitle: rfq.title,
            invitedBy: req.user.name
          }
        );
      }

      res.status(201).json({
        success: true,
        data: populatedRFQ,
        message: 'RFQ created successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          rfqNumber,
          suggestedSuppliersCount: req.body.autoSuggestSuppliers ? populatedRFQ.suggestedSuppliers?.length : 0
        }
      });

    } catch (error) {
      logger.error('Error creating RFQ', { 
        error: error.message, 
        stack: error.stack,
        userId: req.user.id,
        rfqData: { ...req.body, specifications: '[REDACTED]' }
      });
      next(error);
    }
  }
);

/**
 * Update RFQ with version control and change tracking
 * PUT /api/rfqs/:id
 * Features: Version control, change tracking, amendment management
 */
router.put('/:id',
  verifyToken,
  checkPermission(PERMISSIONS.UPDATE_RFQ),
  validateBody(RFQ_SCHEMA),
  sanitizeInput,
  logUpdate('RFQ'),
  async (req, res, next) => {
    try {
      const existingRFQ = await rfqService.getRFQById(req.params.id);
      
      if (!existingRFQ) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check if user can update this RFQ
      const canUpdate = await rfqService.canUserUpdate(existingRFQ, req.user);
      if (!canUpdate) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied to update this RFQ',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check if RFQ is in a state that allows updates
      if (existingRFQ.status === RFQ_STATUS.CLOSED || existingRFQ.status === RFQ_STATUS.CANCELLED) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot update RFQ in current status',
          meta: { currentStatus: existingRFQ.status, timestamp: new Date().toISOString() }
        });
      }

      // Detect significant changes that require amendments
      const significantChanges = await rfqService.detectSignificantChanges(existingRFQ, req.body);
      
      if (significantChanges.length > 0 && existingRFQ.status === RFQ_STATUS.PUBLISHED) {
        // Create amendment instead of direct update
        const amendment = await rfqService.createAmendment(req.params.id, {
          changes: significantChanges,
          reason: req.body.amendmentReason || 'Updates to RFQ requirements',
          createdBy: req.user.id
        });

        // Notify all invited suppliers about the amendment
        await notificationService.notifySuppliers(
          existingRFQ.invitedSuppliers.map(s => s.supplierId),
          NOTIFICATION_TYPES.RFQ_AMENDMENT,
          {
            rfqId: req.params.id,
            rfqTitle: existingRFQ.title,
            amendmentId: amendment._id,
            changes: significantChanges
          }
        );

        return res.json({
          success: true,
          data: amendment,
          message: 'Amendment created for published RFQ',
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id,
            amendmentRequired: true,
            significantChanges
          }
        });
      }

      // Regular update
      const updateData = {
        ...req.body,
        lastModified: new Date(),
        lastModifiedBy: req.user.id,
        version: existingRFQ.version ? parseFloat(existingRFQ.version) + 0.1 : 1.1
      };

      const updatedRFQ = await rfqService.updateRFQ(req.params.id, updateData);

      // Track changes for audit
      await rfqService.trackChanges(req.params.id, existingRFQ, updatedRFQ, req.user.id);

      // Update evaluation framework if criteria changed
      if (req.body.evaluationCriteria) {
        await evaluationService.updateEvaluationFramework(req.params.id, req.body.evaluationCriteria);
      }

      // Notify collaborators of updates
      if (existingRFQ.collaborators && existingRFQ.collaborators.length > 0) {
        await notificationService.notifyCollaborators(
          existingRFQ.collaborators,
          NOTIFICATION_TYPES.RFQ_UPDATED,
          {
            rfqId: req.params.id,
            rfqTitle: existingRFQ.title,
            updatedBy: req.user.name,
            updateSummary: await rfqService.generateUpdateSummary(existingRFQ, updatedRFQ)
          }
        );
      }

      const populatedRFQ = await rfqService.getRFQById(req.params.id, {
        populate: [
          { path: 'procurementId', select: 'title category' },
          { path: 'lastModifiedBy', select: 'name email' },
          { path: 'amendments', select: 'version reason createdAt' }
        ]
      });

      res.json({
        success: true,
        data: populatedRFQ,
        message: 'RFQ updated successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          version: updateData.version,
          changesDetected: significantChanges.length
        }
      });

    } catch (error) {
      logger.error('Error updating RFQ', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        userId: req.user.id
      });
      next(error);
    }
  }
);

/**
 * Publish RFQ with comprehensive supplier notifications
 * PATCH /api/rfqs/:id/publish
 * Features: Multi-channel notifications, timeline validation, compliance checks
 */
router.patch('/:id/publish',
  verifyToken,
  checkPermission(PERMISSIONS.PUBLISH_RFQ),
  rateLimiter(20, 60), // 20 publications per hour
  logStatusChange('RFQ', 'publish'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.id);
      
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Validate RFQ is ready for publication
      const validationResult = await rfqService.validateForPublication(rfq);
      if (!validationResult.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'RFQ is not ready for publication',
          errors: validationResult.errors,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check compliance requirements
      const complianceCheck = await rfqService.checkCompliance(rfq);
      if (!complianceCheck.compliant) {
        return res.status(400).json({ 
          success: false, 
          message: 'RFQ does not meet compliance requirements',
          complianceIssues: complianceCheck.issues,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Publish RFQ
      const publishedRFQ = await rfqService.publishRFQ(req.params.id, {
        publishedBy: req.user.id,
        publishDate: new Date(),
        publicationNotes: req.body.publicationNotes
      });

      // Generate and send invitations to suppliers
      const invitationResults = await rfqService.sendSupplierInvitations(
        publishedRFQ._id,
        publishedRFQ.invitedSuppliers,
        {
          customMessage: req.body.invitationMessage,
          attachments: req.body.invitationAttachments,
          deliveryMethod: req.body.deliveryMethod || 'email'
        }
      );

      // Create evaluation sessions for evaluators
      if (publishedRFQ.evaluators && publishedRFQ.evaluators.length > 0) {
        await evaluationService.createEvaluationSessions(
          publishedRFQ._id,
          publishedRFQ.evaluators
        );
      }

      // Schedule reminder notifications
      if (publishedRFQ.closingDate) {
        const reminderSchedules = [
          { days: 7, type: 'week_reminder' },
          { days: 3, type: 'final_week_reminder' },
          { days: 1, type: 'final_day_reminder' },
          { hours: 2, type: 'final_hours_reminder' }
        ];

        await notificationService.scheduleRFQReminders(
          publishedRFQ._id,
          publishedRFQ.closingDate,
          reminderSchedules
        );
      }

      // Log publication event
      await rfqService.logEvent(req.params.id, 'PUBLISHED', {
        publishedBy: req.user.id,
        invitationsSent: invitationResults.successful,
        invitationsFailed: invitationResults.failed,
        evaluationSessionsCreated: publishedRFQ.evaluators?.length || 0
      });

      // Send internal notifications
      await notificationService.notifyStakeholders(
        publishedRFQ.stakeholders,
        NOTIFICATION_TYPES.RFQ_PUBLISHED,
        {
          rfqId: publishedRFQ._id,
          rfqTitle: publishedRFQ.title,
          publishedBy: req.user.name,
          suppliersInvited: invitationResults.successful,
          closingDate: publishedRFQ.closingDate
        }
      );

      res.json({
        success: true,
        data: publishedRFQ,
        message: 'RFQ published successfully',
        publicationSummary: {
          invitationsSent: invitationResults.successful,
          invitationsFailed: invitationResults.failed,
          evaluationSessionsCreated: publishedRFQ.evaluators?.length || 0,
          remindersScheduled: publishedRFQ.closingDate ? 4 : 0
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          publishDate: publishedRFQ.publishDate
        }
      });

    } catch (error) {
      logger.error('Error publishing RFQ', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Close RFQ and prepare for evaluation
 * PATCH /api/rfqs/:id/close
 * Features: Submission validation, evaluation preparation, timeline management
 */
router.patch('/:id/close',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_RFQ),
  logStatusChange('RFQ', 'close'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.id, {
        populate: [
          { path: 'submissions', populate: { path: 'vendorId', select: 'name rating' } },
          { path: 'evaluators', select: 'name email department' }
        ]
      });

      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      if (rfq.status !== RFQ_STATUS.PUBLISHED) {
        return res.status(400).json({ 
          success: false, 
          message: 'Only published RFQs can be closed' 
        });
      }

      // Validate submissions
      const submissionValidation = await rfqService.validateSubmissions(rfq.submissions);
      
      // Close RFQ
      const closedRFQ = await rfqService.closeRFQ(req.params.id, {
        closedBy: req.user.id,
        closedDate: new Date(),
        submissionCount: rfq.submissions.length,
        validSubmissions: submissionValidation.validCount,
        invalidSubmissions: submissionValidation.invalidCount,
        closureNotes: req.body.closureNotes
      });

      // Prepare evaluation data
      const evaluationPreparation = await evaluationService.prepareEvaluation(rfq._id, {
        submissions: submissionValidation.validSubmissions,
        criteria: rfq.evaluationCriteria,
        evaluators: rfq.evaluators
      });

      // Notify evaluators
      if (rfq.evaluators && rfq.evaluators.length > 0) {
        await notificationService.notifyEvaluators(
          rfq.evaluators,
          NOTIFICATION_TYPES.EVALUATION_READY,
          {
            rfqId: rfq._id,
            rfqTitle: rfq.title,
            submissionCount: submissionValidation.validCount,
            evaluationDeadline: req.body.evaluationDeadline
          }
        );
      }

      // Send closure notifications to suppliers
      await notificationService.notifySuppliers(
        rfq.submissions.map(s => s.vendorId),
        NOTIFICATION_TYPES.RFQ_CLOSED,
        {
          rfqId: rfq._id,
          rfqTitle: rfq.title,
          submissionCount: rfq.submissions.length,
          nextSteps: 'Evaluation phase has begun'
        }
      );

      res.json({
        success: true,
        data: closedRFQ,
        message: 'RFQ closed successfully',
        evaluationSummary: {
          totalSubmissions: rfq.submissions.length,
          validSubmissions: submissionValidation.validCount,
          invalidSubmissions: submissionValidation.invalidCount,
          evaluatorsNotified: rfq.evaluators?.length || 0,
          evaluationSessionId: evaluationPreparation.sessionId
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          closedDate: closedRFQ.closedDate
        }
      });

    } catch (error) {
      logger.error('Error closing RFQ', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Cancel RFQ with comprehensive notifications
 * PATCH /api/rfqs/:id/cancel
 * Features: Stakeholder notifications, cleanup operations, audit tracking
 */
router.patch('/:id/cancel',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_RFQ),
  validateBody({ reason: 'required|string|min:10' }),
  logStatusChange('RFQ', 'cancel'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.id, {
        populate: [
          { path: 'invitedSuppliers.supplierId', select: 'name email' },
          { path: 'submissions', select: 'vendorId submissionDate' },
          { path: 'evaluators', select: 'name email' }
        ]
      });

      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      if (![RFQ_STATUS.DRAFT, RFQ_STATUS.PUBLISHED].includes(rfq.status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'RFQ cannot be cancelled in current status',
          currentStatus: rfq.status 
        });
      }

      // Cancel RFQ
      const cancelledRFQ = await rfqService.cancelRFQ(req.params.id, {
        cancelledBy: req.user.id,
        cancellationDate: new Date(),
        cancellationReason: req.body.reason,
        refundRequired: req.body.refundRequired || false
      });

      // Cancel scheduled notifications
      await notificationService.cancelScheduledNotifications(req.params.id);

      // Notify suppliers if RFQ was published
      if (rfq.status === RFQ_STATUS.PUBLISHED) {
        await notificationService.notifySuppliers(
          rfq.invitedSuppliers.map(s => s.supplierId),
          NOTIFICATION_TYPES.RFQ_CANCELLED,
          {
            rfqId: rfq._id,
            rfqTitle: rfq.title,
            cancellationReason: req.body.reason,
            contactInfo: req.body.contactInfo
          }
        );
      }

      // Cancel evaluation sessions
      if (rfq.evaluators && rfq.evaluators.length > 0) {
        await evaluationService.cancelEvaluationSessions(rfq._id);
        
        await notificationService.notifyEvaluators(
          rfq.evaluators,
          NOTIFICATION_TYPES.EVALUATION_CANCELLED,
          {
            rfqId: rfq._id,
            rfqTitle: rfq.title,
            cancellationReason: req.body.reason
          }
        );
      }

      // Handle submitted bids
      if (rfq.submissions && rfq.submissions.length > 0) {
        await rfqService.handleCancelledSubmissions(
          rfq.submissions,
          req.body.reason,
          req.body.refundRequired
        );
      }

      // Notify internal stakeholders
      await notificationService.notifyStakeholders(
        [...(rfq.stakeholders || []), rfq.createdBy],
        NOTIFICATION_TYPES.RFQ_CANCELLED,
        {
          rfqId: rfq._id,
          rfqTitle: rfq.title,
          cancelledBy: req.user.name,
          cancellationReason: req.body.reason
        }
      );

      res.json({
        success: true,
        data: cancelledRFQ,
        message: 'RFQ cancelled successfully',
        cancellationSummary: {
          suppliersNotified: rfq.invitedSuppliers?.length || 0,
          submissionsAffected: rfq.submissions?.length || 0,
          evaluatorsCancelled: rfq.evaluators?.length || 0,
          scheduledNotificationsCancelled: true
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          cancellationDate: cancelledRFQ.cancellationDate
        }
      });

    } catch (error) {
      logger.error('Error cancelling RFQ', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        userId: req.user.id,
        reason: req.body.reason 
      });
      next(error);
    }
  }
);

/**
 * Delete RFQ with comprehensive cleanup
 * DELETE /api/rfqs/:id
 * Features: Cascading deletion, security checks, audit preservation
 */
router.delete('/:id',
  verifyToken,
  checkPermission(PERMISSIONS.DELETE_RFQ),
  rateLimiter(5, 60), // 5 deletions per hour
  logDelete('RFQ'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.id);
      
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      // Security check - only allow deletion of draft RFQs
      if (rfq.status !== RFQ_STATUS.DRAFT) {
        return res.status(400).json({ 
          success: false, 
          message: 'Only draft RFQs can be deleted. Published RFQs should be cancelled instead.',
          currentStatus: rfq.status 
        });
      }

      // Check if user can delete
      const canDelete = await rfqService.canUserDelete(rfq, req.user);
      if (!canDelete) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied to delete this RFQ' 
        });
      }

      // Archive related documents
      if (rfq.documents && rfq.documents.length > 0) {
        await documentService.archiveDocuments(rfq.documents, {
          reason: 'RFQ_DELETION',
          archivedBy: req.user.id
        });
      }

      // Preserve audit trail before deletion
      const auditData = await rfqService.exportAuditTrail(req.params.id);
      await rfqService.preserveAuditTrail(auditData, {
        deletedBy: req.user.id,
        deletionReason: req.body.reason || 'Manual deletion'
      });

      // Delete RFQ and related entities
      const deletionResult = await rfqService.deleteRFQ(req.params.id, {
        deletedBy: req.user.id,
        preserveAudit: true,
        archiveDocuments: true
      });

      res.json({
        success: true,
        message: 'RFQ deleted successfully',
        deletionSummary: {
          rfqId: req.params.id,
          documentsArchived: rfq.documents?.length || 0,
          auditTrailPreserved: true,
          relatedEntitiesDeleted: deletionResult.relatedDeleted
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          deletedBy: req.user.id
        }
      });

    } catch (error) {
      logger.error('Error deleting RFQ', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Duplicate RFQ with customization options
 * POST /api/rfqs/:id/duplicate
 * Features: Smart duplication, template creation, selective copying
 */
router.post('/:id/duplicate',
  verifyToken,
  checkPermission(PERMISSIONS.CREATE_RFQ),
  rateLimiter(10, 60),
  logCreate('RFQ_DUPLICATE'),
  async (req, res, next) => {
    try {
      const sourceRFQ = await rfqService.getRFQById(req.params.id);
      
      if (!sourceRFQ) {
        return res.status(404).json({ 
          success: false, 
          message: 'Source RFQ not found' 
        });
      }

      const duplicateOptions = {
        title: req.body.title || `${sourceRFQ.title} (Copy)`,
        copySpecs: req.body.copySpecs !== false,
        copyEvaluationCriteria: req.body.copyEvaluationCriteria !== false,
        copyDocuments: req.body.copyDocuments === true,
        copySuppliers: req.body.copySuppliers === true,
        resetDates: req.body.resetDates !== false,
        createdBy: req.user.id
      };

      const duplicatedRFQ = await rfqService.duplicateRFQ(req.params.id, duplicateOptions);

      // Generate new RFQ number
      const newRFQNumber = await rfqService.generateRFQNumber(duplicatedRFQ.category);
      await rfqService.updateRFQ(duplicatedRFQ._id, { rfqNumber: newRFQNumber });

      const populatedRFQ = await rfqService.getRFQById(duplicatedRFQ._id, {
        populate: [
          { path: 'procurementId', select: 'title category' },
          { path: 'createdBy', select: 'name email' }
        ]
      });

      res.status(201).json({
        success: true,
        data: populatedRFQ,
        message: 'RFQ duplicated successfully',
        duplicationSummary: {
          sourceRFQId: req.params.id,
          newRFQId: duplicatedRFQ._id,
          specsCopied: duplicateOptions.copySpecs,
          criteriaCopied: duplicateOptions.copyEvaluationCriteria,
          documentsCopied: duplicateOptions.copyDocuments,
          suppliersCopied: duplicateOptions.copySuppliers
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          newRFQNumber
        }
      });

    } catch (error) {
      logger.error('Error duplicating RFQ', { 
        error: error.message, 
        stack: error.stack,
        sourceRFQId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

// ============ SUPPLIER MANAGEMENT ENDPOINTS ============

/**
 * Get invited suppliers with performance data
 * GET /api/rfqs/:id/suppliers
 * Features: Performance analytics, response tracking, communication history
 */
router.get('/:id/suppliers',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_RFQ),
  logView('RFQ_SUPPLIERS'),
  async (req, res, next) => {
    try {
      const { includePerformance, includeHistory } = req.query;
      
      const rfq = await rfqService.getRFQById(req.params.id, {
        populate: [{
          path: 'invitedSuppliers.supplierId',
          select: 'name category rating contactInfo location capabilities'
        }]
      });

      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      let suppliersData = rfq.invitedSuppliers;

      // Add performance data if requested
      if (includePerformance === 'true') {
        suppliersData = await Promise.all(
          suppliersData.map(async (supplier) => ({
            ...supplier.toObject(),
            performance: await supplierService.getSupplierPerformance(supplier.supplierId._id)
          }))
        );
      }

      // Add communication history if requested
      if (includeHistory === 'true') {
        suppliersData = await Promise.all(
          suppliersData.map(async (supplier) => ({
            ...supplier,
            communicationHistory: await rfqService.getSupplierCommunicationHistory(
              req.params.id,
              supplier.supplierId._id
            )
          }))
        );
      }

      // Add response status
      const submissions = await rfqService.getSubmissions(req.params.id);
      suppliersData = suppliersData.map(supplier => {
        const hasSubmitted = submissions.some(sub => sub.vendorId.toString() === supplier.supplierId._id.toString());
        return {
          ...supplier,
          submissionStatus: hasSubmitted ? 'submitted' : 'pending',
          lastActivity: hasSubmitted ? 
            submissions.find(sub => sub.vendorId.toString() === supplier.supplierId._id.toString()).submissionDate :
            supplier.invitedDate
        };
      });

      res.json({
        success: true,
        data: suppliersData,
        summary: {
          totalInvited: suppliersData.length,
          submitted: suppliersData.filter(s => s.submissionStatus === 'submitted').length,
          pending: suppliersData.filter(s => s.submissionStatus === 'pending').length
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          includePerformance: includePerformance === 'true',
          includeHistory: includeHistory === 'true'
        }
      });

    } catch (error) {
      logger.error('Error fetching RFQ suppliers', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Invite suppliers to RFQ
 * POST /api/rfqs/:id/suppliers/invite
 * Features: Bulk invitations, custom messages, delivery tracking
 */
router.post('/:id/suppliers/invite',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_RFQ),
  validateBody(SUPPLIER_INVITATION_SCHEMA),
  rateLimiter(50, 60), // 50 invitations per hour
  logCreate('SUPPLIER_INVITATION'),
  async (req, res, next) => {
    try {
      const { supplierIds, customMessage, deliveryMethod = 'email', attachments } = req.body;
      
      const rfq = await rfqService.getRFQById(req.params.id);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      // Validate suppliers exist and are eligible
      const validationResult = await supplierService.validateSuppliersForInvitation(supplierIds, rfq);
      if (!validationResult.allValid) {
        return res.status(400).json({
          success: false,
          message: 'Some suppliers are not eligible for invitation',
          invalidSuppliers: validationResult.invalid,
          reasons: validationResult.reasons
        });
      }

      // Send invitations
      const invitationResult = await rfqService.inviteSuppliers(req.params.id, {
        supplierIds,
        invitedBy: req.user.id,
        customMessage,
        deliveryMethod,
        attachments
      });

      // Update RFQ with invited suppliers
      await rfqService.addInvitedSuppliers(req.params.id, supplierIds, {
        invitedBy: req.user.id,
        invitedDate: new Date(),
        invitationMethod: deliveryMethod
      });

      // Log invitation events
      await Promise.all(
        supplierIds.map(supplierId => 
          rfqService.logEvent(req.params.id, 'SUPPLIER_INVITED', {
            supplierId,
            invitedBy: req.user.id,
            deliveryMethod,
            deliveryStatus: invitationResult.results[supplierId]?.status
          })
        )
      );

      res.json({
        success: true,
        message: 'Supplier invitations sent',
        invitationSummary: {
          totalSent: invitationResult.successful.length,
          successful: invitationResult.successful,
          failed: invitationResult.failed,
          deliveryMethod
        },
        data: invitationResult.results,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          rfqId: req.params.id
        }
      });

    } catch (error) {
      logger.error('Error inviting suppliers', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        supplierIds: req.body.supplierIds,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Remove supplier from RFQ
 * DELETE /api/rfqs/:id/suppliers/:supplierId
 * Features: Graceful removal, notification, audit tracking
 */
router.delete('/:id/suppliers/:supplierId',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_RFQ),
  logDelete('SUPPLIER_INVITATION'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.id);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      const supplier = await supplierService.getSupplierById(req.params.supplierId);
      if (!supplier) {
        return res.status(404).json({ 
          success: false, 
          message: 'Supplier not found' 
        });
      }

      // Check if supplier has already submitted
      const hasSubmission = await rfqService.hasSupplierSubmitted(req.params.id, req.params.supplierId);
      if (hasSubmission && rfq.status === RFQ_STATUS.PUBLISHED) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove supplier who has already submitted to published RFQ',
          hasSubmission: true
        });
      }

      // Remove supplier from RFQ
      await rfqService.removeInvitedSupplier(req.params.id, req.params.supplierId);

      // Notify supplier if RFQ is published
      if (rfq.status === RFQ_STATUS.PUBLISHED) {
        await notificationService.notifySupplier(
          req.params.supplierId,
          NOTIFICATION_TYPES.RFQ_INVITATION_REVOKED,
          {
            rfqId: req.params.id,
            rfqTitle: rfq.title,
            reason: req.body.reason || 'Invitation revoked',
            contactInfo: req.body.contactInfo
          }
        );
      }

      // Log removal event
      await rfqService.logEvent(req.params.id, 'SUPPLIER_REMOVED', {
        supplierId: req.params.supplierId,
        removedBy: req.user.id,
        reason: req.body.reason,
        hadSubmission: hasSubmission
      });

      res.json({
        success: true,
        message: 'Supplier removed from RFQ',
        data: {
          rfqId: req.params.id,
          supplierId: req.params.supplierId,
          supplierName: supplier.name,
          hadSubmission: hasSubmission,
          notificationSent: rfq.status === RFQ_STATUS.PUBLISHED
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });

    } catch (error) {
      logger.error('Error removing supplier from RFQ', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        supplierId: req.params.supplierId,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

// ============ ADVANCED SUBMISSION MANAGEMENT ============

/**
 * Get submissions by RFQ with comprehensive analysis
 * GET /api/rfqs/:rfqId/submissions
 * Features: Detailed analysis, comparison tools, evaluation preparation
 */
router.get('/:rfqId/submissions',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_SUBMISSIONS),
  rateLimiter(100, 15),
  logView('RFQ_SUBMISSIONS'),
  async (req, res, next) => {
    try {
      const { 
        includeAnalysis, 
        includeComparison, 
        includeDocuments,
        status,
        vendorId,
        sortBy = 'submissionDate',
        order = 'desc'
      } = req.query;

      const rfq = await rfqService.getRFQById(req.params.rfqId);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      // Build filters
      const filters = { rfqId: req.params.rfqId };
      if (status) filters.status = status;
      if (vendorId) filters.vendorId = vendorId;

      const submissions = await rfqService.getSubmissions(req.params.rfqId, {
        filters,
        sort: { [sortBy]: order === 'desc' ? -1 : 1 },
        populate: [
          { path: 'vendorId', select: 'name category rating contactInfo location' },
          { path: 'documents', select: 'name type size uploadedAt' },
          { path: 'evaluations', select: 'status score evaluatorId' }
        ]
      });

      let responseData = submissions;

      // Add analysis if requested
      if (includeAnalysis === 'true') {
        responseData = await Promise.all(
          submissions.map(async (submission) => ({
            ...submission.toObject(),
            analysis: await rfqService.analyzeSubmission(submission._id, rfq.evaluationCriteria)
          }))
        );
      }

      // Add comparison data if requested
      if (includeComparison === 'true') {
        const comparisonData = await rfqService.compareSubmissions(submissions, rfq.evaluationCriteria);
        responseData = {
          submissions: responseData,
          comparison: comparisonData
        };
      }

      // Add document details if requested
      if (includeDocuments === 'true') {
        responseData = Array.isArray(responseData) ? responseData : responseData.submissions;
        responseData = await Promise.all(
          responseData.map(async (submission) => ({
            ...submission,
            documentDetails: await documentService.getSubmissionDocuments(submission._id)
          }))
        );
      }

      const summary = {
        totalSubmissions: submissions.length,
        submissionsByStatus: await rfqService.getSubmissionStatusSummary(req.params.rfqId),
        averageScore: await rfqService.getAverageSubmissionScore(req.params.rfqId),
        priceRange: await rfqService.getSubmissionPriceRange(req.params.rfqId)
      };

      res.json({
        success: true,
        data: responseData,
        summary,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          rfqId: req.params.rfqId,
          includeAnalysis: includeAnalysis === 'true',
          includeComparison: includeComparison === 'true'
        }
      });

    } catch (error) {
      logger.error('Error fetching RFQ submissions', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.rfqId,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Create comprehensive submission with validation
 * POST /api/rfqs/:rfqId/submissions
 * Features: Multi-part submissions, document handling, compliance checking
 */
router.post('/:rfqId/submissions',
  verifyToken,
  checkPermission(PERMISSIONS.SUBMIT_PROPOSAL),
  rateLimiter(5, 60), // 5 submissions per hour per user
  validateBody(SUBMISSION_SCHEMA),
  sanitizeInput,
  logCreate('SUBMISSION'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.rfqId);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      // Validate RFQ is still open for submissions
      if (rfq.status !== RFQ_STATUS.PUBLISHED) {
        return res.status(400).json({
          success: false,
          message: 'RFQ is not open for submissions',
          currentStatus: rfq.status
        });
      }

      // Check submission deadline
      if (rfq.closingDate && new Date() > new Date(rfq.closingDate)) {
        return res.status(400).json({
          success: false,
          message: 'Submission deadline has passed',
          closingDate: rfq.closingDate
        });
      }

      // Check if supplier is invited
      const isInvited = rfq.invitedSuppliers.some(
        supplier => supplier.supplierId.toString() === req.user.supplierId
      );
      if (!isInvited) {
        return res.status(403).json({
          success: false,
          message: 'You are not invited to submit for this RFQ'
        });
      }

      // Check if supplier has already submitted
      const existingSubmission = await rfqService.getSupplierSubmission(req.params.rfqId, req.user.supplierId);
      if (existingSubmission && !rfq.allowMultipleSubmissions) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted for this RFQ',
          submissionId: existingSubmission._id,
          submissionDate: existingSubmission.submissionDate
        });
      }

      // Validate submission against RFQ requirements
      const validationResult = await rfqService.validateSubmission(req.body, rfq);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Submission does not meet RFQ requirements',
          validationErrors: validationResult.errors
        });
      }

      // Create submission
      const submissionData = {
        ...req.body,
        rfqId: req.params.rfqId,
        vendorId: req.user.supplierId,
        submissionDate: new Date(),
        status: SUBMISSION_STATUS.SUBMITTED,
        version: existingSubmission ? (existingSubmission.version + 1) : 1,
        metadata: {
          submittedBy: req.user.id,
          submissionIP: req.ip,
          userAgent: req.get('User-Agent'),
          validationScore: validationResult.score
        }
      };

      const submission = await rfqService.createSubmission(submissionData);

      // Process uploaded documents
      if (req.body.documents && req.body.documents.length > 0) {
        await documentService.linkDocumentsToSubmission(
          submission._id,
          req.body.documents,
          req.user.id
        );
      }

      // Generate submission receipt
      const receipt = await rfqService.generateSubmissionReceipt(submission._id);

      // Send confirmation notifications
      await notificationService.notifySupplier(
        req.user.supplierId,
        NOTIFICATION_TYPES.SUBMISSION_CONFIRMED,
        {
          rfqId: req.params.rfqId,
          rfqTitle: rfq.title,
          submissionId: submission._id,
          receiptNumber: receipt.receiptNumber
        }
      );

      // Notify RFQ owner/team
      await notificationService.notifyRFQTeam(
        rfq,
        NOTIFICATION_TYPES.NEW_SUBMISSION_RECEIVED,
        {
          rfqId: req.params.rfqId,
          rfqTitle: rfq.title,
          supplierName: req.user.supplierName,
          submissionId: submission._id
        }
      );

      // Log submission event
      await rfqService.logEvent(req.params.rfqId, 'SUBMISSION_RECEIVED', {
        submissionId: submission._id,
        vendorId: req.user.supplierId,
        validationScore: validationResult.score,
        documentCount: req.body.documents?.length || 0
      });

      const populatedSubmission = await rfqService.getSubmissionById(submission._id, {
        populate: [
          { path: 'vendorId', select: 'name category rating' },
          { path: 'documents', select: 'name type size' }
        ]
      });

      res.status(201).json({
        success: true,
        data: populatedSubmission,
        receipt,
        message: 'Submission created successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          validationScore: validationResult.score,
          version: submissionData.version
        }
      });

    } catch (error) {
      logger.error('Error creating submission', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.rfqId,
        userId: req.user.id,
        supplierId: req.user.supplierId 
      });
      next(error);
    }
  }
);

/**
 * Update submission with version control
 * PUT /api/rfqs/:rfqId/submissions/:submissionId
 * Features: Version control, change tracking, re-validation
 */
router.put('/:rfqId/submissions/:submissionId',
  verifyToken,
  checkPermission(PERMISSIONS.SUBMIT_PROPOSAL),
  validateBody(SUBMISSION_SCHEMA),
  logUpdate('SUBMISSION'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.rfqId);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      const submission = await rfqService.getSubmissionById(req.params.submissionId);
      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      // Verify ownership
      if (submission.vendorId.toString() !== req.user.supplierId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own submissions'
        });
      }

      // Check if updates are allowed
      if (!rfq.allowSubmissionUpdates || rfq.status !== RFQ_STATUS.PUBLISHED) {
        return res.status(400).json({
          success: false,
          message: 'Submission updates are not allowed for this RFQ'
        });
      }

      // Check deadline for updates
      const updateDeadline = rfq.submissionUpdateDeadline || rfq.closingDate;
      if (updateDeadline && new Date() > new Date(updateDeadline)) {
        return res.status(400).json({
          success: false,
          message: 'Submission update deadline has passed',
          deadline: updateDeadline
        });
      }

      // Validate updated submission
      const validationResult = await rfqService.validateSubmission(req.body, rfq);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Updated submission does not meet RFQ requirements',
          validationErrors: validationResult.errors
        });
      }

      // Create version snapshot before update
      await rfqService.createSubmissionSnapshot(req.params.submissionId);

      // Update submission
      const updateData = {
        ...req.body,
        lastModified: new Date(),
        lastModifiedBy: req.user.id,
        version: submission.version + 1,
        metadata: {
          ...submission.metadata,
          lastUpdate: {
            date: new Date(),
            by: req.user.id,
            validationScore: validationResult.score,
            changes: await rfqService.detectSubmissionChanges(submission, req.body)
          }
        }
      };

      const updatedSubmission = await rfqService.updateSubmission(req.params.submissionId, updateData);

      // Send update notifications
      await notificationService.notifyRFQTeam(
        rfq,
        NOTIFICATION_TYPES.SUBMISSION_UPDATED,
        {
          rfqId: req.params.rfqId,
          rfqTitle: rfq.title,
          supplierName: req.user.supplierName,
          submissionId: req.params.submissionId,
          version: updateData.version
        }
      );

      res.json({
        success: true,
        data: updatedSubmission,
        message: 'Submission updated successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          version: updateData.version,
          validationScore: validationResult.score
        }
      });

    } catch (error) {
      logger.error('Error updating submission', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.rfqId,
        submissionId: req.params.submissionId,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

// ============ COMPREHENSIVE CLARIFICATION MANAGEMENT ============

/**
 * Get clarifications by RFQ with threading and analytics
 * GET /api/rfqs/:rfqId/clarifications
 * Features: Threading, analytics, response tracking, public/private filtering
 */
router.get('/:rfqId/clarifications',
  verifyToken,
  rateLimiter(100, 15),
  logView('RFQ_CLARIFICATIONS'),
  async (req, res, next) => {
    try {
      const { 
        includePrivate, 
        status, 
        vendorId, 
        threaded = true,
        includeAnalytics 
      } = req.query;

      const rfq = await rfqService.getRFQById(req.params.rfqId);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      // Check access permissions for private clarifications
      const canViewPrivate = await rfqService.canUserViewPrivateClarifications(rfq, req.user);
      
      const filters = { rfqId: req.params.rfqId };
      if (status) filters.status = status;
      if (vendorId) filters.vendorId = vendorId;
      
      // Filter private clarifications based on permissions
      if (includePrivate !== 'true' || !canViewPrivate) {
        filters.isPublic = true;
      }

      let clarifications = await rfqService.getClarifications(req.params.rfqId, {
        filters,
        populate: [
          { path: 'vendorId', select: 'name category' },
          { path: 'respondedBy', select: 'name department' },
          { path: 'attachments', select: 'name type size' }
        ],
        sort: { postedDate: -1 }
      });

      // Organize into threaded format if requested
      if (threaded === 'true') {
        clarifications = await rfqService.organizeClarificationsIntoThreads(clarifications);
      }

      // Add analytics if requested
      let analytics = null;
      if (includeAnalytics === 'true') {
        analytics = await rfqService.getClarificationAnalytics(req.params.rfqId);
      }

      const summary = {
        totalClarifications: clarifications.length,
        byStatus: await rfqService.getClarificationStatusSummary(req.params.rfqId),
        responseTime: await rfqService.getAverageClarificationResponseTime(req.params.rfqId),
        activeVendors: await rfqService.getActiveClarificationVendors(req.params.rfqId)
      };

      res.json({
        success: true,
        data: clarifications,
        summary,
        analytics,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          threaded: threaded === 'true',
          includePrivate: includePrivate === 'true' && canViewPrivate
        }
      });

    } catch (error) {
      logger.error('Error fetching clarifications', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.rfqId,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Post clarification question with smart categorization
 * POST /api/rfqs/:rfqId/clarifications
 * Features: Auto-categorization, duplicate detection, priority assessment
 */
router.post('/:rfqId/clarifications',
  verifyToken,
  checkPermission(PERMISSIONS.POST_CLARIFICATION),
  rateLimiter(20, 60), // 20 clarifications per hour
  validateBody(CLARIFICATION_SCHEMA),
  sanitizeInput,
  logCreate('CLARIFICATION'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.rfqId);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      // Validate RFQ allows clarifications
      if (!rfq.allowClarifications || rfq.status !== RFQ_STATUS.PUBLISHED) {
        return res.status(400).json({
          success: false,
          message: 'Clarifications are not allowed for this RFQ',
          allowClarifications: rfq.allowClarifications,
          status: rfq.status
        });
      }

      // Check clarification deadline
      const clarificationDeadline = rfq.clarificationDeadline || 
        new Date(new Date(rfq.closingDate).getTime() - (48 * 60 * 60 * 1000)); // 48 hours before closing

      if (new Date() > clarificationDeadline) {
        return res.status(400).json({
          success: false,
          message: 'Clarification deadline has passed',
          deadline: clarificationDeadline
        });
      }

      // Check for duplicate questions
      const duplicateCheck = await rfqService.checkDuplicateClarification(
        req.params.rfqId,
        req.body.question,
        req.user.supplierId
      );

      if (duplicateCheck.isDuplicate) {
        return res.status(400).json({
          success: false,
          message: 'Similar clarification already exists',
          existingClarification: duplicateCheck.existing,
          similarity: duplicateCheck.similarity
        });
      }

      // Auto-categorize the clarification
      const category = await rfqService.categorizeClarification(req.body.question, rfq);
      const priority = await rfqService.assessClarificationPriority(req.body.question, rfq);

      const clarificationData = {
        ...req.body,
        rfqId: req.params.rfqId,
        vendorId: req.user.supplierId,
        status: 'pending',
        postedDate: new Date(),
        category,
        priority,
        metadata: {
          postedBy: req.user.id,
          postIP: req.ip,
          autoCategory: category,
          autoPriority: priority
        }
      };

      const clarification = await rfqService.createClarification(clarificationData);

      // Send notifications to RFQ team
      await notificationService.notifyRFQTeam(
        rfq,
        NOTIFICATION_TYPES.NEW_CLARIFICATION,
        {
          rfqId: req.params.rfqId,
          rfqTitle: rfq.title,
          clarificationId: clarification._id,
          vendorName: req.user.supplierName,
          category,
          priority,
          question: req.body.question.substring(0, 100) + '...'
        }
      );

      // Auto-assign to appropriate team member if configured
      if (rfq.clarificationAssignmentRules) {
        const assignee = await rfqService.autoAssignClarification(clarification, rfq.clarificationAssignmentRules);
        if (assignee) {
          await rfqService.assignClarification(clarification._id, assignee);
        }
      }

      const populatedClarification = await rfqService.getClarificationById(clarification._id, {
        populate: [
          { path: 'vendorId', select: 'name category' },
          { path: 'assignedTo', select: 'name department' }
        ]
      });

      res.status(201).json({
        success: true,
        data: populatedClarification,
        message: 'Clarification posted successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          category,
          priority,
          autoAssigned: !!populatedClarification.assignedTo
        }
      });

    } catch (error) {
      logger.error('Error posting clarification', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.rfqId,
        userId: req.user.id,
        supplierId: req.user.supplierId 
      });
      next(error);
    }
  }
);

/**
 * Respond to clarification with comprehensive tracking
 * PATCH /api/rfqs/:rfqId/clarifications/:clarId
 * Features: Response tracking, notification management, approval workflows
 */
router.patch('/:rfqId/clarifications/:clarId',
  verifyToken,
  checkPermission(PERMISSIONS.RESPOND_CLARIFICATION),
  validateBody({ 
    response: 'required|string|min:10',
    isPublic: 'boolean',
    requiresApproval: 'boolean'
  }),
  logUpdate('CLARIFICATION'),
  async (req, res, next) => {
    try {
      const rfq = await rfqService.getRFQById(req.params.rfqId);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      const clarification = await rfqService.getClarificationById(req.params.clarId);
      if (!clarification) {
        return res.status(404).json({ 
          success: false, 
          message: 'Clarification not found' 
        });
      }

      if (clarification.rfqId.toString() !== req.params.rfqId) {
        return res.status(400).json({
          success: false,
          message: 'Clarification does not belong to this RFQ'
        });
      }

      const responseData = {
        response: req.body.response,
        responseDate: new Date(),
        respondedBy: req.user.id,
        isPublic: req.body.isPublic !== false, // Default to public
        status: req.body.requiresApproval ? 'pending_approval' : 'answered',
        metadata: {
          responseTime: new Date() - new Date(clarification.postedDate),
          approvalRequired: req.body.requiresApproval || false
        }
      };

      const updatedClarification = await rfqService.respondToClarification(
        req.params.clarId,
        responseData
      );

      // Send response to vendor
      await notificationService.notifySupplier(
        clarification.vendorId,
        NOTIFICATION_TYPES.CLARIFICATION_ANSWERED,
        {
          rfqId: req.params.rfqId,
          rfqTitle: rfq.title,
          clarificationId: req.params.clarId,
          question: clarification.question.substring(0, 100) + '...',
          response: req.body.response.substring(0, 200) + '...'
        }
      );

      // Notify all suppliers if response is public
      if (responseData.isPublic) {
        const invitedSuppliers = rfq.invitedSuppliers.map(s => s.supplierId);
        await notificationService.notifySuppliers(
          invitedSuppliers,
          NOTIFICATION_TYPES.PUBLIC_CLARIFICATION_PUBLISHED,
          {
            rfqId: req.params.rfqId,
            rfqTitle: rfq.title,
            clarificationId: req.params.clarId
          }
        );
      }

      // Handle approval workflow if required
      if (req.body.requiresApproval) {
        await rfqService.submitClarificationForApproval(
          req.params.clarId,
          req.user.id,
          req.body.approvers
        );
      }

      const populatedClarification = await rfqService.getClarificationById(req.params.clarId, {
        populate: [
          { path: 'vendorId', select: 'name category' },
          { path: 'respondedBy', select: 'name department' }
        ]
      });

      res.json({
        success: true,
        data: populatedClarification,
        message: req.body.requiresApproval ? 
          'Response submitted for approval' : 
          'Clarification answered successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          responseTime: responseData.metadata.responseTime,
          approvalRequired: req.body.requiresApproval || false
        }
      });

    } catch (error) {
      logger.error('Error responding to clarification', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.rfqId,
        clarificationId: req.params.clarId,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

// ============ ANALYTICS AND REPORTING ENDPOINTS ============

/**
 * Get comprehensive RFQ analytics
 * GET /api/rfqs/:id/analytics
 * Features: Performance metrics, supplier analytics, timeline analysis
 */
router.get('/:id/analytics',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  rateLimiter(50, 60),
  logView('RFQ_ANALYTICS'),
  async (req, res, next) => {
    try {
      const { timeframe = '30d', includeSupplierMetrics, includeComparison } = req.query;
      
      const rfq = await rfqService.getRFQById(req.params.id);
      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      const analytics = await analyticsService.generateRFQAnalytics(req.params.id, {
        timeframe,
        includeSupplierMetrics: includeSupplierMetrics === 'true',
        includeComparison: includeComparison === 'true'
      });

      res.json({
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          rfqId: req.params.id,
          timeframe,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Error generating RFQ analytics', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Export RFQ data in multiple formats
 * GET /api/rfqs/:id/export
 * Features: PDF, Excel, JSON exports with customizable content
 */
router.get('/:id/export',
  verifyToken,
  checkPermission(PERMISSIONS.EXPORT_DATA),
  rateLimiter(10, 60), // 10 exports per hour
  logView('RFQ_EXPORT'),
  async (req, res, next) => {
    try {
      const { 
        format = 'pdf', 
        include = 'all',
        template = 'standard' 
      } = req.query;

      const rfq = await rfqService.getRFQById(req.params.id, {
        populate: 'all' // Full population for export
      });

      if (!rfq) {
        return res.status(404).json({ 
          success: false, 
          message: 'RFQ not found' 
        });
      }

      let exportResult;
      const exportOptions = {
        include: include.split(','),
        template,
        exportedBy: req.user.id
      };

      switch (format.toLowerCase()) {
        case 'pdf':
          exportResult = await pdfService.generateRFQReport(rfq, exportOptions);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="RFQ_${rfq.rfqNumber}.pdf"`);
          break;

        case 'excel':
          exportResult = await rfqService.exportToExcel(rfq, exportOptions);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="RFQ_${rfq.rfqNumber}.xlsx"`);
          break;

        case 'json':
          exportResult = await rfqService.exportToJSON(rfq, exportOptions);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="RFQ_${rfq.rfqNumber}.json"`);
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported export format',
            supportedFormats: ['pdf', 'excel', 'json']
          });
      }

      // Log export activity
      await rfqService.logEvent(req.params.id, 'EXPORTED', {
        format,
        exportedBy: req.user.id,
        include,
        template,
        size: exportResult.length
      });

      res.send(exportResult);

    } catch (error) {
      logger.error('Error exporting RFQ', { 
        error: error.message, 
        stack: error.stack,
        rfqId: req.params.id,
        format: req.query.format,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

module.exports = router;
