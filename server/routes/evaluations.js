/**
 * Evaluation Routes
 * 
 * Routes for managing procurement evaluations, scoring, and assessment processes
 * Feature 8: Supplier evaluation and scoring system with comprehensive assessment capabilities
 * 
 * Enhanced with authentication, validation, scoring matrices, consensus building, and comprehensive evaluation lifecycle management
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize, validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logStatusChange, logApproval } = require('../middleware/auditLogger');

// Service imports
const evaluationService = require('../services/evaluationService');
const rfqService = require('../services/rfqService');
const submissionService = require('../services/submissionService');
const notificationService = require('../services/notificationService');
const pdfService = require('../services/pdfService');
const complianceService = require('../services/complianceService');

// Validation schemas
const evaluationValidation = {
  create: {
    rfqId: { type: 'string', required: true, minLength: 1 },
    title: { type: 'string', required: true, minLength: 5, maxLength: 200 },
    description: { type: 'string', maxLength: 1000 },
    evaluationType: { type: 'string', enum: ['technical', 'commercial', 'combined', 'prequalification', 'post_award'], required: true },
    scoringMethod: { type: 'string', enum: ['weighted_scoring', 'points_system', 'pass_fail', 'ranking', 'hybrid'], required: true },
    maxScore: { type: 'number', required: true, min: 1, max: 1000 },
    passingScore: { type: 'number', min: 0 },
    criteria: { type: 'array', items: { type: 'object' }, required: true, minItems: 1 },
    evaluators: { type: 'array', items: { type: 'object' }, required: true, minItems: 1 },
    isBlindEvaluation: { type: 'boolean', default: false },
    allowConsensus: { type: 'boolean', default: true },
    consensusThreshold: { type: 'number', min: 50, max: 100, default: 75 }, // Percentage agreement required
    deadlineDate: { type: 'string', format: 'datetime', required: true },
    instructions: { type: 'string', maxLength: 2000 },
    attachments: { type: 'array', items: { type: 'string' } },
    autoPublishResults: { type: 'boolean', default: false },
    requireJustification: { type: 'boolean', default: true }
  },
  update: {
    title: { type: 'string', minLength: 5, maxLength: 200 },
    description: { type: 'string', maxLength: 1000 },
    criteria: { type: 'array', items: { type: 'object' } },
    evaluators: { type: 'array', items: { type: 'object' } },
    deadlineDate: { type: 'string', format: 'datetime' },
    instructions: { type: 'string', maxLength: 2000 },
    consensusThreshold: { type: 'number', min: 50, max: 100 },
    requireJustification: { type: 'boolean' },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  score: {
    submissionId: { type: 'string', required: true },
    scores: { type: 'array', items: { type: 'object' }, required: true },
    overallScore: { type: 'number', required: true, min: 0 },
    overallRating: { type: 'string', enum: ['excellent', 'good', 'satisfactory', 'poor', 'fail'], required: true },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    justification: { type: 'string', maxLength: 2000 },
    comments: { type: 'string', maxLength: 3000 },
    attachments: { type: 'array', items: { type: 'string' } },
    confidenceLevel: { type: 'string', enum: ['high', 'medium', 'low'], default: 'medium' },
    riskAssessment: { type: 'object' }
  },
  consensus: {
    finalScores: { type: 'array', items: { type: 'object' }, required: true },
    consensusNotes: { type: 'string', maxLength: 2000 },
    disputes: { type: 'array', items: { type: 'object' } },
    resolution: { type: 'string', maxLength: 1000 },
    agreedBy: { type: 'array', items: { type: 'string' }, required: true }
  },
  finalize: {
    finalRankings: { type: 'array', items: { type: 'object' }, required: true },
    recommendation: { type: 'string', enum: ['award', 'reject_all', 'negotiate', 'request_clarification'], required: true },
    recommendedSupplierId: { type: 'string' },
    recommendationNotes: { type: 'string', required: true, maxLength: 2000 },
    conditions: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  query: {
    rfqId: { type: 'string' },
    evaluationType: { type: 'string', enum: ['technical', 'commercial', 'combined', 'prequalification', 'post_award'] },
    status: { type: 'string', enum: ['draft', 'active', 'in_progress', 'consensus', 'completed', 'cancelled', 'expired'] },
    scoringMethod: { type: 'string', enum: ['weighted_scoring', 'points_system', 'pass_fail', 'ranking', 'hybrid'] },
    evaluatorId: { type: 'string' },
    createdBy: { type: 'string' },
    isBlindEvaluation: { type: 'boolean' },
    hasConsensus: { type: 'boolean' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    deadlinePassed: { type: 'boolean' },
    search: { type: 'string', minLength: 3, maxLength: 100 },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 100, default: 20 },
    sortBy: { type: 'string', enum: ['createdAt', 'deadlineDate', 'title', 'status', 'evaluationType'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeScores: { type: 'boolean', default: false },
    includeStats: { type: 'boolean', default: false }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  },
  template: {
    name: { type: 'string', required: true, minLength: 3, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    evaluationType: { type: 'string', enum: ['technical', 'commercial', 'combined', 'prequalification', 'post_award'], required: true },
    criteria: { type: 'array', items: { type: 'object' }, required: true },
    scoringMethod: { type: 'string', enum: ['weighted_scoring', 'points_system', 'pass_fail', 'ranking', 'hybrid'], required: true },
    isPublic: { type: 'boolean', default: false }
  }
};

/**
 * @route   GET /api/evaluations
 * @desc    Get all evaluations with advanced filtering and analytics
 * @access  Private - requires 'evaluations:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('evaluations:read'),
  validateQuery(evaluationValidation.query),
  sanitize(),
  logView('evaluations', 'list'),
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      rfqId,
      evaluationType,
      status,
      scoringMethod,
      evaluatorId,
      createdBy,
      isBlindEvaluation,
      hasConsensus,
      startDate,
      endDate,
      deadlinePassed,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeScores = false,
      includeStats = false
    } = req.query;

    // Build filter criteria
    const filters = {};
    if (rfqId) filters.rfqId = rfqId;
    if (evaluationType) filters.evaluationType = evaluationType;
    if (status) filters.status = status;
    if (scoringMethod) filters.scoringMethod = scoringMethod;
    if (evaluatorId) filters['evaluators.userId'] = evaluatorId;
    if (createdBy) filters.createdBy = createdBy;
    if (isBlindEvaluation !== undefined) filters.isBlindEvaluation = isBlindEvaluation === 'true';
    if (hasConsensus !== undefined) filters.hasConsensus = hasConsensus === 'true';
    
    // Date range filters
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Deadline filters
    if (deadlinePassed !== undefined) {
      filters.deadlineDate = deadlinePassed === 'true' ? 
        { $lt: new Date() } : { $gte: new Date() };
    }

    // Apply user-level filtering if not admin
    if (!req.user.permissions.includes('evaluations:read:all')) {
      filters.$or = [
        { createdBy: req.user.id },
        { 'evaluators.userId': req.user.id },
        { stakeholders: req.user.id }
      ];
    }

    const result = await evaluationService.list({
      filters,
      search,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeScores: includeScores === 'true',
      includeStats: includeStats === 'true',
      includeRfqDetails: true,
      includeEvaluators: true
    });

    res.json({
      success: true,
      data: result.evaluations,
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
        typeBreakdown: result.typeBreakdown,
        averageScore: result.averageScore,
        completionRate: result.completionRate,
        overdueCoun: result.overdueCount
      },
      filters: filters,
      sort: { [sortBy]: sortOrder }
    });
  })
);

/**
 * @route   POST /api/evaluations
 * @desc    Create a new evaluation
 * @access  Private - requires 'evaluations:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('evaluations:create'),
  validateBody(evaluationValidation.create),
  sanitize(),
  logCreate('evaluations'),
  asyncHandler(async (req, res) => {
    const evaluationData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'draft',
      evaluationNumber: await evaluationService.generateEvaluationNumber()
    };

    // Validate RFQ exists and is in correct state
    const rfq = await rfqService.getById(req.body.rfqId);
    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found'
      });
    }

    // Check if RFQ is ready for evaluation
    if (rfq.status !== 'submissions_closed' && rfq.status !== 'evaluation') {
      return res.status(400).json({
        success: false,
        message: 'RFQ is not ready for evaluation'
      });
    }

    // Validate deadline is in the future
    if (new Date(evaluationData.deadlineDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation deadline must be in the future'
      });
    }

    // Validate evaluators exist and have permissions
    const evaluatorValidation = await evaluationService.validateEvaluators(evaluationData.evaluators);
    if (!evaluatorValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: evaluatorValidation.message
      });
    }

    // Validate criteria structure
    const criteriaValidation = await evaluationService.validateCriteria(
      evaluationData.criteria, 
      evaluationData.scoringMethod,
      evaluationData.maxScore
    );
    if (!criteriaValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: criteriaValidation.message
      });
    }

    const evaluation = await evaluationService.create(evaluationData);

    // Send notifications to evaluators
    await notificationService.notifyEvaluatorsAssigned(evaluation.id, evaluationData.evaluators);

    res.status(201).json({
      success: true,
      data: evaluation,
      message: 'Evaluation created successfully'
    });
  })
);

/**
 * @route   GET /api/evaluations/:id
 * @desc    Get evaluation by ID with comprehensive details
 * @access  Private - requires 'evaluations:read' permission
 */
router.get('/:id',
  verifyToken,
  checkAnyPermission(['evaluations:read', 'evaluations:read:own']),
  validateParams(evaluationValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'evaluations:read:all'),
  logView('evaluations', 'detail'),
  asyncHandler(async (req, res) => {
    const evaluation = await evaluationService.getById(req.params.id, {
      includeRfq: true,
      includeSubmissions: true,
      includeScores: true,
      includeEvaluators: true,
      includeConsensusData: true,
      includeAttachments: true,
      includeAuditTrail: true
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check if user is an evaluator or has access
    if (!req.user.permissions.includes('evaluations:read:all')) {
      const hasAccess = evaluation.createdBy === req.user.id ||
                       evaluation.evaluators?.some(e => e.userId === req.user.id) ||
                       evaluation.stakeholders?.includes(req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // For blind evaluations, hide other evaluators' scores
    if (evaluation.isBlindEvaluation && !req.user.permissions.includes('evaluations:read:all')) {
      evaluation.scores = evaluation.scores?.filter(
        score => score.evaluatedBy === req.user.id
      ) || [];
    }

    res.json({
      success: true,
      data: evaluation
    });
  })
);

/**
 * @route   PUT /api/evaluations/:id
 * @desc    Update evaluation (only if not started)
 * @access  Private - requires 'evaluations:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['evaluations:update', 'evaluations:update:own']),
  validateParams(evaluationValidation.params),
  validateBody(evaluationValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'createdBy', 'evaluations:update:all'),
  logUpdate('evaluations'),
  asyncHandler(async (req, res) => {
    const evaluationId = req.params.id;
    const updates = req.body;

    const existingEvaluation = await evaluationService.getById(evaluationId);
    if (!existingEvaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check if evaluation is in editable state
    const editableStates = ['draft'];
    if (!editableStates.includes(existingEvaluation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation cannot be modified after it has started'
      });
    }

    // Validate deadline changes
    if (updates.deadlineDate && new Date(updates.deadlineDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation deadline must be in the future'
      });
    }

    // Add update metadata
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const updatedEvaluation = await evaluationService.update(evaluationId, updates);

    // Notify evaluators of changes if evaluator list was modified
    if (updates.evaluators) {
      await notificationService.notifyEvaluationUpdated(evaluationId, updates.evaluators);
    }

    res.json({
      success: true,
      data: updatedEvaluation,
      message: 'Evaluation updated successfully'
    });
  })
);

/**
 * @route   POST /api/evaluations/:id/start
 * @desc    Start evaluation process
 * @access  Private - requires 'evaluations:start' permission
 */
router.post('/:id/start',
  verifyToken,
  checkPermission('evaluations:start'),
  validateParams(evaluationValidation.params),
  logStatusChange('evaluations'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const evaluation = await evaluationService.getById(id);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    if (evaluation.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Evaluation has already started'
      });
    }

    // Validate all submissions are available
    const submissions = await submissionService.getByRfqId(evaluation.rfqId);
    if (submissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No submissions found for evaluation'
      });
    }

    const startedEvaluation = await evaluationService.start(id, {
      startedBy: req.user.id,
      startedAt: new Date(),
      submissionCount: submissions.length
    });

    // Send start notifications to evaluators
    await notificationService.notifyEvaluationStarted(id, evaluation.evaluators);

    res.json({
      success: true,
      data: startedEvaluation,
      message: 'Evaluation started successfully'
    });
  })
);

/**
 * @route   POST /api/evaluations/:id/score
 * @desc    Submit scores for evaluation
 * @access  Private - requires 'evaluations:score' permission
 */
router.post('/:id/score',
  verifyToken,
  checkPermission('evaluations:score'),
  validateParams(evaluationValidation.params),
  validateBody(evaluationValidation.score),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const scoreData = {
      ...req.body,
      evaluatedBy: req.user.id,
      evaluatedAt: new Date()
    };

    const evaluation = await evaluationService.getById(id, { includeEvaluators: true });
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check if evaluation is active
    if (evaluation.status !== 'active' && evaluation.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Evaluation is not active for scoring'
      });
    }

    // Check if user is authorized evaluator
    const isAuthorizedEvaluator = evaluation.evaluators.some(
      e => e.userId === req.user.id && e.status === 'active'
    );

    if (!isAuthorizedEvaluator) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized to score this evaluation'
      });
    }

    // Validate submission exists
    const submission = await submissionService.getById(scoreData.submissionId);
    if (!submission || submission.rfqId !== evaluation.rfqId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission for this evaluation'
      });
    }

    // Validate scores against criteria
    const scoreValidation = await evaluationService.validateScores(
      scoreData.scores,
      evaluation.criteria,
      evaluation.maxScore
    );

    if (!scoreValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: scoreValidation.message
      });
    }

    const submittedScore = await evaluationService.submitScore(id, scoreData);

    // Check if this evaluator has completed all submissions
    const completionStatus = await evaluationService.checkEvaluatorCompletion(id, req.user.id);
    
    if (completionStatus.completed) {
      await notificationService.notifyEvaluatorCompleted(id, req.user.id);
    }

    // Check if all evaluators have completed
    const allCompleted = await evaluationService.checkAllEvaluatorsCompleted(id);
    if (allCompleted) {
      await evaluationService.updateStatus(id, 'consensus');
      await notificationService.notifyEvaluationReadyForConsensus(id);
    }

    res.json({
      success: true,
      data: {
        score: submittedScore,
        evaluatorCompleted: completionStatus.completed,
        allEvaluatorsCompleted: allCompleted
      },
      message: 'Score submitted successfully'
    });
  })
);

/**
 * @route   POST /api/evaluations/:id/consensus
 * @desc    Build consensus on evaluation results
 * @access  Private - requires 'evaluations:consensus' permission
 */
router.post('/:id/consensus',
  verifyToken,
  checkPermission('evaluations:consensus'),
  validateParams(evaluationValidation.params),
  validateBody(evaluationValidation.consensus),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const consensusData = {
      ...req.body,
      facilitatedBy: req.user.id,
      consensusDate: new Date()
    };

    const evaluation = await evaluationService.getById(id);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    if (evaluation.status !== 'consensus') {
      return res.status(400).json({
        success: false,
        message: 'Evaluation is not ready for consensus'
      });
    }

    // Validate consensus agreement percentage
    const agreementPercentage = (consensusData.agreedBy.length / evaluation.evaluators.length) * 100;
    if (agreementPercentage < evaluation.consensusThreshold) {
      return res.status(400).json({
        success: false,
        message: `Consensus threshold of ${evaluation.consensusThreshold}% not met`
      });
    }

    const consensus = await evaluationService.buildConsensus(id, consensusData);

    // Update evaluation status
    await evaluationService.updateStatus(id, 'completed');

    // Send consensus notifications
    await notificationService.notifyConsensusReached(id, consensus);

    res.json({
      success: true,
      data: consensus,
      message: 'Consensus built successfully'
    });
  })
);

/**
 * @route   POST /api/evaluations/:id/finalize
 * @desc    Finalize evaluation with recommendations
 * @access  Private - requires 'evaluations:finalize' permission
 */
router.post('/:id/finalize',
  verifyToken,
  checkPermission('evaluations:finalize'),
  validateParams(evaluationValidation.params),
  validateBody(evaluationValidation.finalize),
  sanitize(),
  logApproval('evaluations'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const finalizationData = {
      ...req.body,
      finalizedBy: req.user.id,
      finalizedAt: new Date()
    };

    const evaluation = await evaluationService.getById(id);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    if (evaluation.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Evaluation must be completed before finalization'
      });
    }

    const finalizedEvaluation = await evaluationService.finalize(id, finalizationData);

    // Generate evaluation report
    const report = await evaluationService.generateReport(id, {
      includeDetailedScores: true,
      includeConsensusData: true,
      includeRecommendations: true
    });

    // Send finalization notifications
    await notificationService.notifyEvaluationFinalized(id, finalizedEvaluation);

    res.json({
      success: true,
      data: {
        evaluation: finalizedEvaluation,
        reportId: report.id
      },
      message: 'Evaluation finalized successfully'
    });
  })
);

/**
 * @route   GET /api/evaluations/:id/results
 * @desc    Get evaluation results and rankings
 * @access  Private - requires 'evaluations:read' permission
 */
router.get('/:id/results',
  verifyToken,
  checkPermission('evaluations:read'),
  validateParams(evaluationValidation.params),
  logView('evaluations', 'results'),
  asyncHandler(async (req, res) => {
    const evaluation = await evaluationService.getById(req.params.id);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check if results are available
    if (evaluation.status !== 'completed' && evaluation.status !== 'finalized') {
      return res.status(400).json({
        success: false,
        message: 'Evaluation results not yet available'
      });
    }

    const results = await evaluationService.getResults(req.params.id, {
      includeDetailedScores: true,
      includeRankings: true,
      includeStatistics: true,
      includeRecommendations: evaluation.status === 'finalized'
    });

    res.json({
      success: true,
      data: results
    });
  })
);

/**
 * @route   GET /api/evaluations/:id/report
 * @desc    Generate and download evaluation report
 * @access  Private - requires 'evaluations:read' permission
 */
router.get('/:id/report',
  verifyToken,
  checkPermission('evaluations:read'),
  validateParams(evaluationValidation.params),
  validateQuery({
    format: { type: 'string', enum: ['pdf', 'excel', 'json'], default: 'pdf' },
    includeScores: { type: 'boolean', default: true },
    includeCharts: { type: 'boolean', default: true }
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'pdf', includeScores = true, includeCharts = true } = req.query;

    const evaluation = await evaluationService.getById(id, { includeAll: true });
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    const reportData = await evaluationService.generateReport(id, {
      format,
      includeScores: includeScores === 'true',
      includeCharts: includeCharts === 'true',
      includeConsensus: true,
      includeRecommendations: true
    });

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData
      });
    } else {
      // Return file for PDF/Excel formats
      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="evaluation-report-${evaluation.evaluationNumber}.${format}"`);
      res.send(reportData.buffer);
    }
  })
);

/**
 * @route   GET /api/evaluations/templates
 * @desc    Get evaluation templates
 * @access  Private - requires 'evaluations:read' permission
 */
router.get('/templates',
  verifyToken,
  checkPermission('evaluations:read'),
  validateQuery({
    evaluationType: { type: 'string', enum: ['technical', 'commercial', 'combined', 'prequalification', 'post_award'] },
    isPublic: { type: 'boolean' }
  }),
  logView('evaluations', 'templates'),
  asyncHandler(async (req, res) => {
    const { evaluationType, isPublic } = req.query;
    
    const templates = await evaluationService.getTemplates({
      evaluationType,
      isPublic: isPublic === 'true',
      userId: req.user.id,
      includePreview: true
    });

    res.json({
      success: true,
      data: templates
    });
  })
);

/**
 * @route   POST /api/evaluations/templates
 * @desc    Create evaluation template
 * @access  Private - requires 'evaluations:template' permission
 */
router.post('/templates',
  verifyToken,
  checkPermission('evaluations:template'),
  validateBody(evaluationValidation.template),
  sanitize(),
  asyncHandler(async (req, res) => {
    const templateData = {
      ...req.body,
      createdBy: req.user.id
    };

    const template = await evaluationService.createTemplate(templateData);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Evaluation template created successfully'
    });
  })
);

/**
 * @route   GET /api/evaluations/analytics/dashboard
 * @desc    Get evaluation analytics for dashboard
 * @access  Private - requires 'evaluations:read' permission
 */
router.get('/analytics/dashboard',
  verifyToken,
  checkPermission('evaluations:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['30d', '90d', '180d', '1y'], default: '90d' }
  }),
  logView('evaluations', 'analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '90d' } = req.query;
    
    const analytics = await evaluationService.getAnalytics({
      timeframe,
      userId: req.user.permissions.includes('evaluations:read:all') ? null : req.user.id
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   POST /api/evaluations/:id/dispute
 * @desc    Raise dispute on evaluation results
 * @access  Private - requires 'evaluations:dispute' permission
 */
router.post('/:id/dispute',
  verifyToken,
  checkPermission('evaluations:dispute'),
  validateParams(evaluationValidation.params),
  validateBody({
    disputeType: { type: 'string', enum: ['scoring', 'bias', 'process', 'criteria'], required: true },
    description: { type: 'string', required: true, maxLength: 2000 },
    evidence: { type: 'array', items: { type: 'string' } },
    requestedAction: { type: 'string', enum: ['re_evaluate', 'review_scores', 'change_evaluator', 'appeal'], required: true }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const disputeData = {
      ...req.body,
      disputedBy: req.user.id,
      disputeDate: new Date()
    };

    const evaluation = await evaluationService.getById(id);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    const dispute = await evaluationService.createDispute(id, disputeData);

    // Send dispute notifications
    await notificationService.notifyEvaluationDispute(id, dispute);

    res.status(201).json({
      success: true,
      data: dispute,
      message: 'Evaluation dispute raised successfully'
    });
  })
);

/**
 * @route   DELETE /api/evaluations/:id
 * @desc    Cancel evaluation (only if not started)
 * @access  Private - requires 'evaluations:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['evaluations:delete', 'evaluations:delete:own']),
  validateParams(evaluationValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'evaluations:delete:all'),
  logDelete('evaluations'),
  asyncHandler(async (req, res) => {
    const evaluationId = req.params.id;

    const evaluation = await evaluationService.getById(evaluationId);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    // Check if evaluation can be cancelled
    const cancellableStates = ['draft'];
    if (!cancellableStates.includes(evaluation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation cannot be cancelled once started'
      });
    }

    const result = await evaluationService.cancel(evaluationId, {
      cancelledBy: req.user.id,
      reason: req.body.reason || 'Cancelled by user',
      cancellationDate: new Date()
    });

    // Send cancellation notifications
    await notificationService.notifyEvaluationCancelled(evaluationId, evaluation.evaluators);

    res.json({
      success: true,
      data: result,
      message: 'Evaluation cancelled successfully'
    });
  })
);

module.exports = router;
