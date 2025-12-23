/**
 * Submission Routes - Comprehensive Supplier Submission Management System
 *
 * Advanced API endpoints for complete submission lifecycle management including:
 * - Submission creation, validation, and processing
 * - Document management and version control
 * - Compliance checking and validation
 * - Evaluation integration and scoring
 * - Amendment and revision workflows
 * - Real-time collaboration and feedback
 * - Analytics, reporting, and performance metrics
 * - Template system and standardization
 * - Timeline management and deadline tracking
 * - Integration with RFQ, evaluation, and award systems
 * - Supplier performance tracking and analytics
 * - Multi-format export and reporting capabilities
 *
 * @version 2.0.0
 * @author Procurement Team
 */

const express = require('express');
const router = express.Router();
const Submission = require('../db/models/Submission');
const RFQ = require('../db/models/RFQ');
const Supplier = require('../db/models/Supplier');
const Document = require('../db/models/Document');
const Evaluation = require('../db/models/Evaluation');
const Template = require('../db/models/Template');
const Notification = require('../db/models/Notification');
const { verifyToken, checkPermission, rateLimiter } = require('../middleware/auth');
const { 
  validateBody, 
  validateFile, 
  sanitizeInput, 
  checkSecurityThreats,
  validateSubmissionDocuments 
} = require('../middleware/validation');
const { 
  logCreate, 
  logUpdate, 
  logDelete, 
  logView, 
  logStatusChange, 
  logBulkOperation 
} = require('../middleware/auditLogger');
const logger = require('../utils/logger');
const { 
  SUBMISSION_SCHEMA, 
  SUBMISSION_UPDATE_SCHEMA,
  SUBMISSION_AMENDMENT_SCHEMA,
  DOCUMENT_UPLOAD_SCHEMA,
  EVALUATION_RESPONSE_SCHEMA
} = require('../shared/validation-rules');
const { PERMISSIONS } = require('../config/permissions');
const { 
  SUBMISSION_STATUS, 
  DOCUMENT_TYPES,
  EVALUATION_TYPES,
  NOTIFICATION_TYPES,
  SUBMISSION_STAGES 
} = require('../shared/constants');

// Import services
const submissionService = require('../services/submissionService');
const rfqService = require('../services/rfqService');
const supplierService = require('../services/supplierService');
const documentService = require('../services/documentService');
const evaluationService = require('../services/evaluationService');
const notificationService = require('../services/notificationService');
const templateService = require('../services/templateService');
const complianceService = require('../services/complianceService');
const analyticsService = require('../services/analyticsService');
const pdfService = require('../services/pdfService');
const validationService = require('../services/validationService');

// WebSocket for real-time updates
const WebSocket = require('ws');
let wss;

// ============ COMPREHENSIVE SUBMISSION MANAGEMENT ENDPOINTS ============

/**
 * Get all submissions with advanced filtering and analytics
 * GET /api/submissions
 * Features: Multi-dimensional filtering, search, analytics, export capabilities
 */
router.get('/',
  verifyToken,
  rateLimiter(100, 15), // 100 requests per 15 minutes
  logView('SUBMISSION', 'list'),
  async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        sort = '-submissionDate',
        status,
        rfqId,
        vendorId,
        evaluationStatus,
        complianceStatus,
        dateRange,
        search,
        category,
        priority,
        scoreRange,
        includeAnalytics,
        includeDocuments,
        export: exportFormat
      } = req.query;

      // Build comprehensive filters
      const filters = {};
      
      // Status filtering
      if (status) filters.status = { $in: status.split(',') };
      if (evaluationStatus) filters.evaluationStatus = evaluationStatus;
      if (complianceStatus) filters.complianceStatus = complianceStatus;
      
      // Entity relationships
      if (rfqId) filters.rfqId = rfqId;
      if (vendorId) filters.vendorId = vendorId;
      if (category) filters.category = category;
      if (priority) filters.priority = priority;
      
      // Date range filtering
      if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        filters.submissionDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      // Score range filtering
      if (scoreRange) {
        const [minScore, maxScore] = scoreRange.split(',');
        filters['evaluation.totalScore'] = {
          $gte: parseFloat(minScore),
          $lte: parseFloat(maxScore)
        };
      }
      
      // Text search across multiple fields
      if (search) {
        filters.$or = [
          { 'technicalProposal.summary': { $regex: search, $options: 'i' } },
          { 'financialProposal.summary': { $regex: search, $options: 'i' } },
          { 'vendor.name': { $regex: search, $options: 'i' } },
          { 'rfq.title': { $regex: search, $options: 'i' } }
        ];
      }

      // Check user permissions for data access
      const userPermissions = await submissionService.getUserSubmissionPermissions(req.user);
      if (!userPermissions.viewAll) {
        // Restrict to user's submissions if not admin
        if (req.user.role === 'supplier') {
          filters.vendorId = req.user.supplierId;
        } else if (req.user.role === 'evaluator') {
          filters.rfqId = { $in: await submissionService.getUserAssignedRFQs(req.user.id) };
        }
      }

      // Execute query with pagination
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: sort,
        populate: [
          { path: 'rfqId', select: 'title category status closingDate' },
          { path: 'vendorId', select: 'name category rating contactInfo location' },
          { path: 'evaluations', populate: { path: 'evaluatorId', select: 'name department' } },
          { path: 'documents', select: 'name type size uploadedAt status' },
          { path: 'amendments', select: 'version reason createdAt status' }
        ]
      };

      let result;
      if (exportFormat) {
        // Export functionality
        const allSubmissions = await submissionService.getAllSubmissions(filters, { ...options, limit: 0 });
        
        if (exportFormat === 'pdf') {
          const pdfBuffer = await pdfService.generateSubmissionReport(allSubmissions.data, {
            includeDocuments: includeDocuments === 'true',
            includeAnalytics: includeAnalytics === 'true'
          });
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="submissions_report.pdf"');
          return res.send(pdfBuffer);
        } else if (exportFormat === 'excel') {
          const excelBuffer = await submissionService.exportToExcel(allSubmissions.data);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="submissions_export.xlsx"');
          return res.send(excelBuffer);
        }
      } else {
        result = await submissionService.getAllSubmissions(filters, options);
      }

      // Add analytics if requested
      let analytics = null;
      if (includeAnalytics === 'true') {
        analytics = await submissionService.getSubmissionAnalytics(filters, req.user);
      }

      // Add document summaries if requested
      if (includeDocuments === 'true') {
        result.data = await Promise.all(
          result.data.map(async (submission) => ({
            ...submission.toObject(),
            documentSummary: await documentService.getSubmissionDocumentSummary(submission._id)
          }))
        );
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
        summary: {
          totalSubmissions: result.totalItems,
          byStatus: await submissionService.getSubmissionStatusSummary(filters),
          averageScore: await submissionService.getAverageScore(filters),
          completionRate: await submissionService.getCompletionRate(filters)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          processingTime: Date.now() - req.startTime,
          userPermissions: userPermissions.level
        }
      });

    } catch (error) {
      logger.error('Error fetching submissions', { 
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
 * Get submission by ID with comprehensive details
 * GET /api/submissions/:id
 * Features: Full entity relationships, evaluation data, document access, timeline
 */
router.get('/:id',
  verifyToken,
  rateLimiter(200, 15),
  logView('SUBMISSION', 'detail'),
  async (req, res, next) => {
    try {
      const { 
        includeTimeline, 
        includeEvaluations, 
        includeDocuments,
        includeComparison,
        includeAnalytics 
      } = req.query;
      
      const submission = await submissionService.getSubmissionById(req.params.id, {
        populate: [
          { path: 'rfqId', populate: { path: 'createdBy', select: 'name department' } },
          { path: 'vendorId', select: 'name category rating contactInfo capabilities' },
          { path: 'evaluations', populate: { 
            path: 'evaluatorId', 
            select: 'name department expertise' 
          }},
          { path: 'documents', select: 'name type size uploadedAt status version' },
          { path: 'amendments', populate: { path: 'createdBy', select: 'name' } },
          { path: 'complianceChecks', select: 'category status issues recommendations' }
        ]
      });

      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check access permissions
      const hasAccess = await submissionService.checkUserAccess(submission, req.user);
      if (!hasAccess.allowed) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied to this submission',
          reason: hasAccess.reason,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Enhance response with additional data
      const response = { ...submission.toObject() };

      // Add timeline if requested
      if (includeTimeline === 'true') {
        response.timeline = await submissionService.getSubmissionTimeline(req.params.id);
      }

      // Add detailed evaluations if requested
      if (includeEvaluations === 'true') {
        response.detailedEvaluations = await evaluationService.getDetailedEvaluations(req.params.id);
        response.evaluationSummary = await evaluationService.getEvaluationSummary(req.params.id);
      }

      // Add document details if requested
      if (includeDocuments === 'true') {
        response.documentDetails = await documentService.getSubmissionDocuments(req.params.id, {
          includeVersions: true,
          includeAccess: true
        });
      }

      // Add comparison data if requested
      if (includeComparison === 'true') {
        const competingSubmissions = await submissionService.getCompetingSubmissions(
          submission.rfqId, 
          req.params.id
        );
        response.comparison = await submissionService.generateComparisonData(
          submission,
          competingSubmissions
        );
      }

      // Add analytics if requested
      if (includeAnalytics === 'true') {
        response.analytics = await submissionService.getSubmissionAnalytics({ 
          _id: req.params.id 
        }, req.user);
      }

      // Add user-specific data
      response.userPermissions = await submissionService.getUserPermissions(req.params.id, req.user);
      response.availableActions = await submissionService.getAvailableUserActions(submission, req.user);

      res.json({
        success: true,
        data: response,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          accessLevel: hasAccess.level,
          lastModified: submission.updatedAt,
          version: submission.version || '1.0'
        }
      });

    } catch (error) {
      logger.error('Error fetching submission details', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Create comprehensive submission with validation and processing
 * POST /api/submissions
 * Features: Multi-stage validation, document processing, compliance checking
 */
router.post('/',
  verifyToken,
  checkPermission(PERMISSIONS.SUBMIT_PROPOSAL),
  rateLimiter(5, 60), // 5 submissions per hour per user
  validateBody(SUBMISSION_SCHEMA),
  sanitizeInput,
  checkSecurityThreats,
  logCreate('SUBMISSION'),
  async (req, res, next) => {
    try {
      // Validate RFQ exists and is open
      const rfq = await rfqService.getRFQById(req.body.rfqId);
      if (!rfq) {
        return res.status(404).json({
          success: false,
          message: 'RFQ not found',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Validate submission eligibility
      const eligibilityCheck = await submissionService.checkSubmissionEligibility(
        req.body.rfqId,
        req.user.supplierId || req.user.id
      );

      if (!eligibilityCheck.eligible) {
        return res.status(400).json({
          success: false,
          message: 'Not eligible to submit for this RFQ',
          reasons: eligibilityCheck.reasons,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Validate submission completeness
      const completenessCheck = await submissionService.validateSubmissionCompleteness(
        req.body,
        rfq.requirements
      );

      if (!completenessCheck.complete) {
        return res.status(400).json({
          success: false,
          message: 'Submission is incomplete',
          missingRequirements: completenessCheck.missing,
          completionPercentage: completenessCheck.percentage,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Validate documents if provided
      let documentValidation = { valid: true, issues: [] };
      if (req.body.documents && req.body.documents.length > 0) {
        documentValidation = await documentService.validateSubmissionDocuments(
          req.body.documents,
          rfq.documentRequirements
        );
        
        if (!documentValidation.valid) {
          return res.status(400).json({
            success: false,
            message: 'Document validation failed',
            documentIssues: documentValidation.issues,
            meta: { timestamp: new Date().toISOString(), requestId: req.id }
          });
        }
      }

      // Run compliance checks
      const complianceCheck = await complianceService.checkSubmissionCompliance(
        req.body,
        rfq.complianceRequirements
      );

      // Prepare submission data
      const submissionData = {
        ...req.body,
        vendorId: req.user.supplierId || req.user.id,
        submissionDate: new Date(),
        status: SUBMISSION_STATUS.SUBMITTED,
        stage: SUBMISSION_STAGES.RECEIVED,
        version: 1,
        complianceStatus: complianceCheck.status,
        complianceScore: complianceCheck.score,
        completenessScore: completenessCheck.percentage,
        metadata: {
          submittedBy: req.user.id,
          submissionIP: req.ip,
          userAgent: req.get('User-Agent'),
          validationResults: {
            completeness: completenessCheck,
            documents: documentValidation,
            compliance: complianceCheck
          }
        }
      };

      // Create submission
      const submission = await submissionService.createSubmission(submissionData);

      // Process documents asynchronously
      if (req.body.documents && req.body.documents.length > 0) {
        await documentService.processSubmissionDocuments(
          submission._id,
          req.body.documents,
          req.user.id
        );
      }

      // Generate submission number/reference
      const submissionNumber = await submissionService.generateSubmissionNumber(
        rfq.rfqNumber,
        req.user.supplierId || req.user.id
      );

      await submissionService.updateSubmission(submission._id, { submissionNumber });

      // Run additional background processing
      setTimeout(async () => {
        try {
          // Generate automatic evaluation scores where applicable
          await evaluationService.generateAutomaticScores(submission._id, rfq.evaluationCriteria);
          
          // Update RFQ submission statistics
          await rfqService.updateSubmissionStatistics(req.body.rfqId);
          
          // Trigger any workflow automations
          await submissionService.triggerWorkflowAutomations(submission._id, 'SUBMITTED');
          
        } catch (bgError) {
          logger.error('Background processing error for submission', {
            error: bgError.message,
            submissionId: submission._id
          });
        }
      }, 1000);

      // Send notifications
      await Promise.all([
        // Confirm to supplier
        notificationService.notifySupplier(
          req.user.supplierId || req.user.id,
          NOTIFICATION_TYPES.SUBMISSION_CONFIRMED,
          {
            submissionId: submission._id,
            submissionNumber,
            rfqTitle: rfq.title,
            submissionDate: submission.submissionDate
          }
        ),
        
        // Notify RFQ team
        notificationService.notifyRFQTeam(
          rfq,
          NOTIFICATION_TYPES.NEW_SUBMISSION_RECEIVED,
          {
            submissionId: submission._id,
            submissionNumber,
            supplierName: req.user.supplierName || req.user.name,
            rfqTitle: rfq.title,
            complianceScore: complianceCheck.score
          }
        )
      ]);

      // Get populated submission for response
      const populatedSubmission = await submissionService.getSubmissionById(submission._id, {
        populate: [
          { path: 'rfqId', select: 'title rfqNumber closingDate' },
          { path: 'vendorId', select: 'name category rating' },
          { path: 'documents', select: 'name type size status' }
        ]
      });

      res.status(201).json({
        success: true,
        data: populatedSubmission,
        submissionNumber,
        validationSummary: {
          completenessScore: completenessCheck.percentage,
          complianceScore: complianceCheck.score,
          documentsValidated: req.body.documents?.length || 0,
          totalRequirements: rfq.requirements?.length || 0
        },
        message: 'Submission created successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          version: '1',
          processingTime: Date.now() - req.startTime
        }
      });

    } catch (error) {
      logger.error('Error creating submission', { 
        error: error.message, 
        stack: error.stack,
        userId: req.user.id,
        rfqId: req.body.rfqId,
        supplierId: req.user.supplierId 
      });
      next(error);
    }
  }
);

/**
 * Update submission with version control and change tracking
 * PUT /api/submissions/:id
 * Features: Version control, change detection, re-validation, approval workflows
 */
router.put('/:id',
  verifyToken,
  checkPermission(PERMISSIONS.UPDATE_SUBMISSION),
  validateBody(SUBMISSION_UPDATE_SCHEMA),
  sanitizeInput,
  logUpdate('SUBMISSION'),
  async (req, res, next) => {
    try {
      const existingSubmission = await submissionService.getSubmissionById(req.params.id, {
        populate: [
          { path: 'rfqId', select: 'title status allowSubmissionUpdates submissionUpdateDeadline' },
          { path: 'vendorId', select: 'name category' }
        ]
      });
      
      if (!existingSubmission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check ownership/permissions
      const canUpdate = await submissionService.canUserUpdate(existingSubmission, req.user);
      if (!canUpdate.allowed) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied to update this submission',
          reason: canUpdate.reason,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check if updates are allowed
      const rfq = existingSubmission.rfqId;
      if (!rfq.allowSubmissionUpdates) {
        return res.status(400).json({
          success: false,
          message: 'Updates are not allowed for this RFQ',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check update deadline
      const updateDeadline = rfq.submissionUpdateDeadline;
      if (updateDeadline && new Date() > new Date(updateDeadline)) {
        return res.status(400).json({
          success: false,
          message: 'Submission update deadline has passed',
          deadline: updateDeadline,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Detect significant changes
      const changeAnalysis = await submissionService.analyzeChanges(existingSubmission, req.body);
      
      // Re-validate if significant changes detected
      let validationResults = { valid: true };
      if (changeAnalysis.significant) {
        validationResults = await submissionService.validateSubmissionCompleteness(
          { ...existingSubmission.toObject(), ...req.body },
          rfq.requirements
        );

        if (!validationResults.complete) {
          return res.status(400).json({
            success: false,
            message: 'Updated submission does not meet requirements',
            validationErrors: validationResults.missing,
            meta: { timestamp: new Date().toISOString(), requestId: req.id }
          });
        }
      }

      // Create version snapshot before update
      await submissionService.createVersionSnapshot(req.params.id, {
        version: existingSubmission.version,
        createdBy: req.user.id,
        changes: changeAnalysis.changes
      });

      // Prepare update data
      const updateData = {
        ...req.body,
        lastModified: new Date(),
        lastModifiedBy: req.user.id,
        version: (existingSubmission.version || 1) + 1,
        stage: changeAnalysis.significant ? SUBMISSION_STAGES.UPDATED : existingSubmission.stage,
        metadata: {
          ...existingSubmission.metadata,
          updates: [
            ...(existingSubmission.metadata.updates || []),
            {
              version: (existingSubmission.version || 1) + 1,
              date: new Date(),
              by: req.user.id,
              changes: changeAnalysis.changes,
              significant: changeAnalysis.significant
            }
          ]
        }
      };

      // Re-run compliance checks if significant changes
      if (changeAnalysis.significant) {
        const complianceCheck = await complianceService.checkSubmissionCompliance(
          { ...existingSubmission.toObject(), ...req.body },
          rfq.complianceRequirements
        );
        
        updateData.complianceStatus = complianceCheck.status;
        updateData.complianceScore = complianceCheck.score;
      }

      // Update submission
      const updatedSubmission = await submissionService.updateSubmission(req.params.id, updateData);

      // Handle significant change notifications
      if (changeAnalysis.significant) {
        await Promise.all([
          // Notify RFQ team about significant changes
          notificationService.notifyRFQTeam(
            rfq,
            NOTIFICATION_TYPES.SUBMISSION_SIGNIFICANTLY_UPDATED,
            {
              submissionId: req.params.id,
              supplierName: existingSubmission.vendorId.name,
              rfqTitle: rfq.title,
              version: updateData.version,
              changesSummary: changeAnalysis.summary
            }
          ),
          
          // Notify evaluators if evaluation is in progress
          evaluationService.notifyEvaluatorsOfChanges(req.params.id, changeAnalysis)
        ]);

        // Re-trigger automatic evaluation scores
        setTimeout(async () => {
          try {
            await evaluationService.regenerateAutomaticScores(req.params.id, rfq.evaluationCriteria);
          } catch (evalError) {
            logger.error('Error regenerating evaluation scores', {
              error: evalError.message,
              submissionId: req.params.id
            });
          }
        }, 2000);
      }

      const populatedSubmission = await submissionService.getSubmissionById(req.params.id, {
        populate: [
          { path: 'rfqId', select: 'title rfqNumber' },
          { path: 'vendorId', select: 'name category' },
          { path: 'lastModifiedBy', select: 'name email' }
        ]
      });

      res.json({
        success: true,
        data: populatedSubmission,
        updateSummary: {
          version: updateData.version,
          significantChanges: changeAnalysis.significant,
          changesDetected: changeAnalysis.changes.length,
          validationPassed: validationResults.complete !== false,
          complianceUpdated: changeAnalysis.significant
        },
        message: 'Submission updated successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          previousVersion: existingSubmission.version || 1,
          newVersion: updateData.version
        }
      });

    } catch (error) {
      logger.error('Error updating submission', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Delete submission with security checks and cleanup
 * DELETE /api/submissions/:id
 * Features: Security validation, cascading cleanup, audit preservation
 */
router.delete('/:id',
  verifyToken,
  checkPermission(PERMISSIONS.DELETE_SUBMISSION),
  rateLimiter(10, 60), // 10 deletions per hour
  logDelete('SUBMISSION'),
  async (req, res, next) => {
    try {
      const submission = await submissionService.getSubmissionById(req.params.id, {
        populate: [
          { path: 'rfqId', select: 'title status' },
          { path: 'vendorId', select: 'name' },
          { path: 'evaluations', select: 'status evaluatorId' },
          { path: 'documents', select: 'name type' }
        ]
      });
      
      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found',
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check deletion eligibility
      const canDelete = await submissionService.canUserDelete(submission, req.user);
      if (!canDelete.allowed) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied to delete this submission',
          reason: canDelete.reason,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Check if submission is in a state that allows deletion
      if (submission.status === SUBMISSION_STATUS.UNDER_EVALUATION && 
          submission.evaluations.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete submission that is under evaluation',
          currentStatus: submission.status,
          evaluationsCount: submission.evaluations.length,
          meta: { timestamp: new Date().toISOString(), requestId: req.id }
        });
      }

      // Preserve audit trail before deletion
      const auditData = await submissionService.exportAuditTrail(req.params.id);
      await submissionService.preserveAuditTrail(auditData, {
        deletedBy: req.user.id,
        deletionReason: req.body.reason || 'Manual deletion',
        deletionDate: new Date()
      });

      // Handle document cleanup
      const documentCleanupResult = await documentService.handleSubmissionDocumentDeletion(
        req.params.id,
        {
          archive: req.body.archiveDocuments !== false, // Default to archive
          deletedBy: req.user.id
        }
      );

      // Cancel any pending evaluations
      if (submission.evaluations.length > 0) {
        await evaluationService.cancelSubmissionEvaluations(req.params.id, {
          cancelledBy: req.user.id,
          reason: 'Submission deleted'
        });
      }

      // Delete submission and related entities
      const deletionResult = await submissionService.deleteSubmission(req.params.id, {
        deletedBy: req.user.id,
        preserveAudit: true,
        cascadeDelete: true,
        reason: req.body.reason
      });

      // Update RFQ statistics
      await rfqService.updateSubmissionStatistics(submission.rfqId._id);

      // Send deletion notifications
      await notificationService.notifyRFQTeam(
        { _id: submission.rfqId._id, title: submission.rfqId.title },
        NOTIFICATION_TYPES.SUBMISSION_DELETED,
        {
          submissionId: req.params.id,
          supplierName: submission.vendorId.name,
          deletedBy: req.user.name,
          reason: req.body.reason || 'Not specified'
        }
      );

      res.json({
        success: true,
        message: 'Submission deleted successfully',
        deletionSummary: {
          submissionId: req.params.id,
          supplierName: submission.vendorId.name,
          rfqTitle: submission.rfqId.title,
          documentsHandled: documentCleanupResult.count,
          documentsArchived: documentCleanupResult.archived,
          evaluationsCancelled: submission.evaluations.length,
          auditTrailPreserved: true
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          deletedBy: req.user.id
        }
      });

  }
);

// ============ SUBMISSION STATUS MANAGEMENT ENDPOINTS ============

/**
 * Update submission status with workflow management
 * PATCH /api/submissions/:id/status
 * Features: Status validation, workflow triggers, notification management
 */
router.patch('/:id/status',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_SUBMISSION_STATUS),
  validateBody({ 
    status: 'required|string',
    reason: 'string',
    notifyStakeholders: 'boolean'
  }),
  logStatusChange('SUBMISSION'),
  async (req, res, next) => {
    try {
      const { status, reason, notifyStakeholders = true } = req.body;
      
      const submission = await submissionService.getSubmissionById(req.params.id, {
        populate: [
          { path: 'rfqId', select: 'title status' },
          { path: 'vendorId', select: 'name email' },
          { path: 'evaluations', select: 'status evaluatorId' }
        ]
      });

      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      // Validate status transition
      const statusValidation = await submissionService.validateStatusTransition(
        submission.status,
        status,
        req.user
      );

      if (!statusValidation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status transition',
          currentStatus: submission.status,
          requestedStatus: status,
          validTransitions: statusValidation.validTransitions
        });
      }

      // Update submission status
      const updatedSubmission = await submissionService.updateSubmissionStatus(req.params.id, {
        status,
        statusChangedBy: req.user.id,
        statusChangedDate: new Date(),
        statusChangeReason: reason,
        previousStatus: submission.status
      });

      // Trigger workflow actions based on new status
      const workflowActions = await submissionService.triggerWorkflowActions(
        req.params.id,
        status,
        req.user.id
      );

      // Send notifications if requested
      if (notifyStakeholders) {
        await submissionService.notifyStatusChange(
          updatedSubmission,
          submission.status,
          status,
          reason,
          req.user
        );
      }

      res.json({
        success: true,
        data: updatedSubmission,
        statusTransition: {
          from: submission.status,
          to: status,
          triggeredActions: workflowActions,
          notificationsSent: notifyStakeholders
        },
        message: 'Submission status updated successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          changedBy: req.user.name
        }
      });

    } catch (error) {
      logger.error('Error updating submission status', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        requestedStatus: req.body.status,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Submit submission for evaluation
 * POST /api/submissions/:id/submit-for-evaluation
 * Features: Readiness validation, evaluator assignment, timeline management
 */
router.post('/:id/submit-for-evaluation',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_EVALUATIONS),
  validateBody({ 
    evaluators: 'array',
    evaluationDeadline: 'date',
    priority: 'string'
  }),
  logStatusChange('SUBMISSION', 'submit_for_evaluation'),
  async (req, res, next) => {
    try {
      const { evaluators, evaluationDeadline, priority = 'normal' } = req.body;
      
      const submission = await submissionService.getSubmissionById(req.params.id, {
        populate: [
          { path: 'rfqId', select: 'title evaluationCriteria' },
          { path: 'vendorId', select: 'name' }
        ]
      });

      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      // Validate submission readiness for evaluation
      const readinessCheck = await submissionService.validateEvaluationReadiness(submission);
      if (!readinessCheck.ready) {
        return res.status(400).json({
          success: false,
          message: 'Submission not ready for evaluation',
          issues: readinessCheck.issues,
          completionPercentage: readinessCheck.completionPercentage
        });
      }

      // Create evaluation sessions
      const evaluationSessions = await evaluationService.createEvaluationSessions(
        req.params.id,
        {
          evaluators: evaluators || await evaluationService.getDefaultEvaluators(submission.rfqId),
          deadline: evaluationDeadline,
          priority,
          criteria: submission.rfqId.evaluationCriteria,
          submittedBy: req.user.id
        }
      );

      // Update submission status
      await submissionService.updateSubmissionStatus(req.params.id, {
        status: SUBMISSION_STATUS.UNDER_EVALUATION,
        evaluationStartDate: new Date(),
        evaluationDeadline: evaluationDeadline,
        evaluationPriority: priority
      });

      // Notify evaluators
      await notificationService.notifyEvaluators(
        evaluators || evaluationSessions.evaluators,
        NOTIFICATION_TYPES.EVALUATION_ASSIGNED,
        {
          submissionId: req.params.id,
          rfqTitle: submission.rfqId.title,
          supplierName: submission.vendorId.name,
          deadline: evaluationDeadline,
          priority,
          sessionIds: evaluationSessions.sessionIds
        }
      );

      res.json({
        success: true,
        data: {
          submissionId: req.params.id,
          evaluationSessions,
          status: SUBMISSION_STATUS.UNDER_EVALUATION
        },
        evaluationSummary: {
          evaluatorsAssigned: evaluationSessions.evaluators.length,
          sessionsCreated: evaluationSessions.sessionIds.length,
          deadline: evaluationDeadline,
          priority
        },
        message: 'Submission submitted for evaluation successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          submittedBy: req.user.name
        }
      });

    } catch (error) {
      logger.error('Error submitting for evaluation', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

// ============ DOCUMENT MANAGEMENT ENDPOINTS ============

/**
 * Upload documents to submission
 * POST /api/submissions/:id/documents
 * Features: Multi-file upload, validation, version control, virus scanning
 */
router.post('/:id/documents',
  verifyToken,
  checkPermission(PERMISSIONS.MANAGE_SUBMISSION_DOCUMENTS),
  rateLimiter(20, 60), // 20 document uploads per hour
  validateFile,
  validateBody(DOCUMENT_UPLOAD_SCHEMA),
  logCreate('SUBMISSION_DOCUMENT'),
  async (req, res, next) => {
    try {
      const submission = await submissionService.getSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      // Check if user can upload documents to this submission
      const canUpload = await submissionService.canUserUploadDocuments(submission, req.user);
      if (!canUpload) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied to upload documents to this submission'
        });
      }

      // Process file uploads
      const uploadResults = await documentService.processSubmissionDocumentUploads(
        req.params.id,
        req.files || req.body.documents,
        {
          uploadedBy: req.user.id,
          category: req.body.category,
          description: req.body.description,
          replaceExisting: req.body.replaceExisting === true
        }
      );

      // Update submission with document references
      await submissionService.updateSubmissionDocuments(req.params.id, uploadResults.documents);

      // Send notifications for significant document uploads
      if (uploadResults.documents.length > 0) {
        await notificationService.notifySubmissionStakeholders(
          submission,
          NOTIFICATION_TYPES.SUBMISSION_DOCUMENTS_UPDATED,
          {
            documentsAdded: uploadResults.documents.length,
            uploadedBy: req.user.name,
            documentTypes: uploadResults.documents.map(doc => doc.type)
          }
        );
      }

      res.json({
        success: true,
        data: uploadResults.documents,
        uploadSummary: {
          totalUploaded: uploadResults.successful.length,
          totalFailed: uploadResults.failed.length,
          virusScansCompleted: uploadResults.virusScanned,
          sizeTotal: uploadResults.totalSize
        },
        failures: uploadResults.failed,
        message: 'Documents uploaded successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          submissionId: req.params.id
        }
      });

    } catch (error) {
      logger.error('Error uploading submission documents', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Get submission documents with access control
 * GET /api/submissions/:id/documents
 * Features: Access control, version history, download tracking
 */
router.get('/:id/documents',
  verifyToken,
  rateLimiter(100, 15),
  logView('SUBMISSION_DOCUMENTS'),
  async (req, res, next) => {
    try {
      const { includeVersions, category, type } = req.query;
      
      const submission = await submissionService.getSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      // Check document access permissions
      const accessLevel = await submissionService.getDocumentAccessLevel(submission, req.user);
      if (accessLevel === 'none') {
        return res.status(403).json({
          success: false,
          message: 'Access denied to submission documents'
        });
      }

      // Build filters
      const filters = { submissionId: req.params.id };
      if (category) filters.category = category;
      if (type) filters.type = type;

      // Get documents
      const documents = await documentService.getSubmissionDocuments(req.params.id, {
        filters,
        includeVersions: includeVersions === 'true',
        accessLevel,
        requestedBy: req.user.id
      });

      // Filter sensitive documents based on access level
      const filteredDocuments = documents.filter(doc => 
        documentService.canUserAccessDocument(doc, req.user, accessLevel)
      );

      res.json({
        success: true,
        data: filteredDocuments,
        summary: {
          totalDocuments: filteredDocuments.length,
          byCategory: await documentService.getDocumentSummaryByCategory(filteredDocuments),
          byType: await documentService.getDocumentSummaryByType(filteredDocuments),
          totalSize: filteredDocuments.reduce((sum, doc) => sum + (doc.size || 0), 0)
        },
        accessLevel,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          submissionId: req.params.id
        }
      });

    } catch (error) {
      logger.error('Error fetching submission documents', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

// ============ EVALUATION INTEGRATION ENDPOINTS ============

/**
 * Get submission evaluations with detailed analysis
 * GET /api/submissions/:id/evaluations
 * Features: Detailed scoring, consensus analysis, evaluator insights
 */
router.get('/:id/evaluations',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_EVALUATIONS),
  rateLimiter(50, 15),
  logView('SUBMISSION_EVALUATIONS'),
  async (req, res, next) => {
    try {
      const { includeDetails, includeConsensus, evaluatorId } = req.query;
      
      const submission = await submissionService.getSubmissionById(req.params.id, {
        populate: [
          { path: 'rfqId', select: 'title evaluationCriteria' },
          { path: 'vendorId', select: 'name' }
        ]
      });

      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      // Check evaluation access permissions
      const canViewEvaluations = await evaluationService.canUserViewEvaluations(
        submission,
        req.user
      );

      if (!canViewEvaluations) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to submission evaluations'
        });
      }

      // Build filters
      const filters = { submissionId: req.params.id };
      if (evaluatorId) filters.evaluatorId = evaluatorId;

      // Get evaluations
      let evaluations = await evaluationService.getSubmissionEvaluations(req.params.id, {
        filters,
        populate: [
          { path: 'evaluatorId', select: 'name department expertise' },
          { path: 'scores.criteriaId', select: 'name weight maxScore' }
        ]
      });

      // Add detailed analysis if requested
      if (includeDetails === 'true') {
        evaluations = await Promise.all(
          evaluations.map(async (evaluation) => ({
            ...evaluation.toObject(),
            detailedAnalysis: await evaluationService.getDetailedEvaluationAnalysis(evaluation._id)
          }))
        );
      }

      // Add consensus analysis if requested
      let consensusAnalysis = null;
      if (includeConsensus === 'true') {
        consensusAnalysis = await evaluationService.getConsensusAnalysis(req.params.id);
      }

      // Calculate summary statistics
      const summary = {
        totalEvaluations: evaluations.length,
        completedEvaluations: evaluations.filter(e => e.status === 'completed').length,
        averageScore: await evaluationService.getAverageScore(req.params.id),
        scoreRange: await evaluationService.getScoreRange(req.params.id),
        evaluationProgress: await evaluationService.getEvaluationProgress(req.params.id)
      };

      res.json({
        success: true,
        data: evaluations,
        summary,
        consensusAnalysis,
        criteria: submission.rfqId.evaluationCriteria,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          submissionId: req.params.id,
          includeDetails: includeDetails === 'true',
          includeConsensus: includeConsensus === 'true'
        }
      });

    } catch (error) {
      logger.error('Error fetching submission evaluations', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

// ============ ANALYTICS AND REPORTING ENDPOINTS ============

/**
 * Get comprehensive submission analytics
 * GET /api/submissions/:id/analytics
 * Features: Performance metrics, comparison analysis, trend insights
 */
router.get('/:id/analytics',
  verifyToken,
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  rateLimiter(30, 60),
  logView('SUBMISSION_ANALYTICS'),
  async (req, res, next) => {
    try {
      const { timeframe = '30d', includeComparison, includeTrends } = req.query;
      
      const submission = await submissionService.getSubmissionById(req.params.id, {
        populate: [
          { path: 'rfqId', select: 'title category' },
          { path: 'vendorId', select: 'name category performance' }
        ]
      });

      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      // Generate comprehensive analytics
      const analytics = await analyticsService.generateSubmissionAnalytics(req.params.id, {
        timeframe,
        includeComparison: includeComparison === 'true',
        includeTrends: includeTrends === 'true',
        requestedBy: req.user.id
      });

      res.json({
        success: true,
        data: analytics,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          submissionId: req.params.id,
          timeframe,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Error generating submission analytics', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Export submission data in multiple formats
 * GET /api/submissions/:id/export
 * Features: PDF, Excel, JSON exports with customizable templates
 */
router.get('/:id/export',
  verifyToken,
  checkPermission(PERMISSIONS.EXPORT_DATA),
  rateLimiter(10, 60), // 10 exports per hour
  logView('SUBMISSION_EXPORT'),
  async (req, res, next) => {
    try {
      const { 
        format = 'pdf', 
        include = 'all',
        template = 'standard',
        includeDocuments = 'false' 
      } = req.query;

      const submission = await submissionService.getSubmissionById(req.params.id, {
        populate: 'all' // Full population for export
      });

      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      // Check export permissions
      const canExport = await submissionService.canUserExport(submission, req.user);
      if (!canExport) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied to export this submission'
        });
      }

      let exportResult;
      const exportOptions = {
        include: include.split(','),
        template,
        includeDocuments: includeDocuments === 'true',
        exportedBy: req.user.id
      };

      switch (format.toLowerCase()) {
        case 'pdf':
          exportResult = await pdfService.generateSubmissionReport(submission, exportOptions);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Submission_${submission.submissionNumber}.pdf"`);
          break;

        case 'excel':
          exportResult = await submissionService.exportToExcel(submission, exportOptions);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="Submission_${submission.submissionNumber}.xlsx"`);
          break;

        case 'json':
          exportResult = await submissionService.exportToJSON(submission, exportOptions);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="Submission_${submission.submissionNumber}.json"`);
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported export format',
            supportedFormats: ['pdf', 'excel', 'json']
          });
      }

      // Log export activity
      await submissionService.logExportActivity(req.params.id, {
        format,
        exportedBy: req.user.id,
        include,
        template,
        includeDocuments: includeDocuments === 'true',
        size: exportResult.length
      });

      res.send(exportResult);

    } catch (error) {
      logger.error('Error exporting submission', { 
        error: error.message, 
        stack: error.stack,
        submissionId: req.params.id,
        format: req.query.format,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

/**
 * Bulk operations for submission management
 * POST /api/submissions/bulk
 * Features: Bulk status updates, evaluations, notifications
 */
router.post('/bulk',
  verifyToken,
  checkPermission(PERMISSIONS.BULK_MANAGE_SUBMISSIONS),
  rateLimiter(5, 60), // 5 bulk operations per hour
  validateBody({
    operation: 'required|string',
    submissionIds: 'required|array',
    data: 'object'
  }),
  logBulkOperation('SUBMISSION'),
  async (req, res, next) => {
    try {
      const { operation, submissionIds, data } = req.body;
      
      // Validate submission IDs
      const submissions = await submissionService.getSubmissionsByIds(submissionIds, {
        populate: [
          { path: 'rfqId', select: 'title' },
          { path: 'vendorId', select: 'name' }
        ]
      });

      if (submissions.length !== submissionIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some submissions were not found',
          found: submissions.length,
          requested: submissionIds.length
        });
      }

      let result;
      switch (operation) {
        case 'updateStatus':
          result = await submissionService.bulkUpdateStatus(submissionIds, {
            status: data.status,
            reason: data.reason,
            updatedBy: req.user.id
          });
          break;

        case 'submitForEvaluation':
          result = await submissionService.bulkSubmitForEvaluation(submissionIds, {
            evaluators: data.evaluators,
            deadline: data.deadline,
            submittedBy: req.user.id
          });
          break;

        case 'sendNotification':
          result = await submissionService.bulkSendNotification(submissionIds, {
            message: data.message,
            type: data.type,
            sentBy: req.user.id
          });
          break;

        case 'export':
          result = await submissionService.bulkExport(submissionIds, {
            format: data.format,
            template: data.template,
            exportedBy: req.user.id
          });
          
          // Return file for bulk export
          if (result.buffer) {
            const filename = `bulk_submissions_${new Date().getTime()}.${data.format}`;
            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(result.buffer);
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Unsupported bulk operation',
            supportedOperations: ['updateStatus', 'submitForEvaluation', 'sendNotification', 'export']
          });
      }

      res.json({
        success: true,
        data: result,
        operation,
        submissionsProcessed: submissionIds.length,
        message: `Bulk ${operation} completed successfully`,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id,
          executedBy: req.user.name
        }
      });

    } catch (error) {
      logger.error('Error executing bulk submission operation', { 
        error: error.message, 
        stack: error.stack,
        operation: req.body.operation,
        submissionCount: req.body.submissionIds?.length,
        userId: req.user.id 
      });
      next(error);
    }
  }
);

module.exports = router;
