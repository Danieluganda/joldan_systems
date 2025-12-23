const mongoose = require('mongoose');
const Evaluation = require('../db/models/Evaluation');
const Procurement = require('../db/models/Procurement');
const RFQ = require('../db/models/RFQ');
const Submission = require('../db/models/Submission');
const User = require('../db/models/User');
const Supplier = require('../db/models/Supplier');
const EvaluationCriteria = require('../db/models/EvaluationCriteria');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const approvalService = require('./approvalService');
const { validateInput, sanitize } = require('../utils/validation');
const { generateSequentialId, formatDate, calculateWeightedScore, formatCurrency } = require('../utils/helpers');
const { calculateRiskScore, assessCompliance } = require('../utils/riskAssessment');
const { generateEvaluationReport } = require('../utils/reportGenerator');

// Constants for evaluation management
const EVALUATION_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  UNDER_REVIEW: 'under_review',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  SUPERSEDED: 'superseded'
};

const EVALUATION_TYPES = {
  TECHNICAL: 'technical',
  COMMERCIAL: 'commercial',
  FINANCIAL: 'financial',
  COMPLIANCE: 'compliance',
  QUALITY: 'quality',
  RISK: 'risk',
  REFERENCE: 'reference',
  PRESENTATION: 'presentation',
  COMBINED: 'combined'
};

const EVALUATION_METHODS = {
  WEIGHTED_SCORING: 'weighted_scoring',
  PASS_FAIL: 'pass_fail',
  RANKING: 'ranking',
  COST_BENEFIT: 'cost_benefit',
  QUALITY_PRICE_RATIO: 'quality_price_ratio',
  MOST_ECONOMICAL: 'most_economical',
  BEST_VALUE: 'best_value'
};

const SCORING_SCALES = {
  FIVE_POINT: 'five_point', // 1-5
  TEN_POINT: 'ten_point', // 1-10
  HUNDRED_POINT: 'hundred_point', // 1-100
  PERCENTAGE: 'percentage', // 0-100%
  PASS_FAIL: 'pass_fail' // Pass/Fail
};

const EVALUATION_PHASES = {
  INITIAL_SCREENING: 'initial_screening',
  DETAILED_EVALUATION: 'detailed_evaluation',
  CLARIFICATION: 'clarification',
  FINAL_REVIEW: 'final_review',
  APPROVAL: 'approval',
  AWARD_RECOMMENDATION: 'award_recommendation'
};

const EVALUATOR_ROLES = {
  LEAD_EVALUATOR: 'lead_evaluator',
  TECHNICAL_EVALUATOR: 'technical_evaluator',
  COMMERCIAL_EVALUATOR: 'commercial_evaluator',
  FINANCIAL_EVALUATOR: 'financial_evaluator',
  COMPLIANCE_EVALUATOR: 'compliance_evaluator',
  INDEPENDENT_REVIEWER: 'independent_reviewer',
  SUBJECT_MATTER_EXPERT: 'subject_matter_expert'
};

const CONFLICT_STATUS = {
  NO_CONFLICT: 'no_conflict',
  POTENTIAL_CONFLICT: 'potential_conflict',
  DECLARED_CONFLICT: 'declared_conflict',
  RESOLVED_CONFLICT: 'resolved_conflict',
  DISQUALIFIED: 'disqualified'
};

class EvaluationService {
  /**
   * Create evaluation session for procurement
   */
  static async createEvaluation(evaluationData, userId, requestInfo = {}) {
    try {
      const {
        procurementId,
        rfqId,
        evaluationType = EVALUATION_TYPES.COMBINED,
        evaluationMethod = EVALUATION_METHODS.WEIGHTED_SCORING,
        scoringScale = SCORING_SCALES.HUNDRED_POINT,
        criteria = [],
        evaluators = [],
        timeline = {},
        blindEvaluation = false,
        consensusRequired = false,
        minimumScore = 70,
        passingThreshold = 60,
        weightingApproach = 'equal',
        allowClarifications = true,
        requireJustification = true,
        anonymousEvaluation = false
      } = evaluationData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!procurementId || criteria.length === 0) {
        throw new Error('Procurement ID and evaluation criteria are required');
      }

      // Validate procurement and RFQ
      const procurement = await Procurement.findById(procurementId);
      if (!procurement) {
        throw new Error('Procurement not found');
      }

      let rfq = null;
      if (rfqId) {
        rfq = await RFQ.findById(rfqId);
        if (!rfq || rfq.procurementId.toString() !== procurementId) {
          throw new Error('RFQ not found or does not belong to this procurement');
        }
      }

      // Check permissions
      const canCreate = await this.canCreateEvaluation(procurement, userId);
      if (!canCreate.allowed) {
        throw new Error(`Cannot create evaluation: ${canCreate.reason}`);
      }

      // Validate and process criteria
      const processedCriteria = await this.processCriteria(criteria, evaluationType, scoringScale);
      
      // Validate criteria weights sum to 100%
      const totalWeight = processedCriteria.reduce((sum, criterion) => sum + criterion.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error('Criteria weights must sum to 100%');
      }

      // Process and validate evaluators
      const processedEvaluators = await this.processEvaluators(evaluators, evaluationType);

      // Generate evaluation number
      const evaluationNumber = await this.generateEvaluationNumber(procurement.category);

      // Calculate evaluation timeline
      const calculatedTimeline = await this.calculateEvaluationTimeline(
        procurement, 
        timeline, 
        evaluationType,
        processedEvaluators.length
      );

      // Create evaluation session
      const evaluation = new Evaluation({
        evaluationNumber,
        procurementId: new mongoose.Types.ObjectId(procurementId),
        rfqId: rfqId ? new mongoose.Types.ObjectId(rfqId) : null,
        
        // Evaluation configuration
        configuration: {
          evaluationType,
          evaluationMethod,
          scoringScale,
          blindEvaluation,
          anonymousEvaluation,
          consensusRequired,
          allowClarifications,
          requireJustification,
          minimumScore,
          passingThreshold,
          weightingApproach,
          autoCalculateScores: true,
          allowPartialScoring: false,
          requireAllCriteria: true
        },

        // Evaluation criteria
        criteria: processedCriteria,

        // Evaluator panel
        evaluators: processedEvaluators,

        // Timeline and phases
        timeline: calculatedTimeline,
        currentPhase: EVALUATION_PHASES.INITIAL_SCREENING,
        phaseHistory: [{
          phase: EVALUATION_PHASES.INITIAL_SCREENING,
          startedAt: new Date(),
          startedBy: userId,
          status: 'active'
        }],

        // Submissions and scoring
        submissions: [], // Will be populated when submissions are received
        scores: new Map(), // evaluatorId -> submissionId -> scores
        rankings: new Map(), // submissionId -> rank data
        
        // Evaluation results
        results: {
          completed: false,
          totalSubmissions: 0,
          qualifiedSubmissions: 0,
          disqualifiedSubmissions: 0,
          averageScore: 0,
          topScore: 0,
          lowestScore: 0,
          recommendedSupplier: null,
          alternateSuppliers: []
        },

        // Consensus and conflicts
        consensus: {
          required: consensusRequired,
          achieved: false,
          sessions: [],
          decisions: [],
          finalDecision: null
        },

        conflicts: {
          declarations: [],
          resolutions: [],
          disqualifications: []
        },

        // Quality assurance
        qualityAssurance: {
          independentReview: false,
          reviewers: [],
          calibrationSession: null,
          consistency: {
            score: 0,
            flags: [],
            adjustments: []
          }
        },

        // Compliance and governance
        compliance: {
          regulatoryRequirements: await this.getComplianceRequirements(procurement),
          checkpoints: [],
          violations: [],
          approvals: [],
          attestations: []
        },

        // Documentation and audit
        documentation: {
          evaluationPlan: null,
          scoringGuidelines: null,
          evaluatorInstructions: null,
          meetingMinutes: [],
          correspondences: [],
          attachments: []
        },

        // Status and workflow
        status: EVALUATION_STATUS.DRAFT,
        workflow: {
          approvals: [],
          reviews: [],
          escalations: [],
          currentStage: 'evaluation_setup',
          nextActions: ['finalize_criteria', 'assign_evaluators', 'schedule_sessions']
        },

        // Metadata
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          lastModified: new Date(),
          modifiedBy: userId,
          version: '1.0',
          tags: this.generateEvaluationTags(procurement, evaluationType),
          searchKeywords: this.extractEvaluationKeywords(procurement, criteria),
          externalReferences: [],
          relatedEvaluations: [],
          creationIP: ipAddress,
          creationUserAgent: userAgent
        }
      });

      await evaluation.save();

      // Set up evaluation workspace
      await this.setupEvaluationWorkspace(evaluation);

      // Send setup notifications to evaluators
      await this.sendEvaluationSetupNotifications(evaluation, processedEvaluators);

      // Create audit trail
      await auditService.logAuditEvent({
        action: 'evaluation_created',
        entityType: 'evaluation',
        entityId: evaluation._id,
        userId,
        metadata: {
          evaluationNumber: evaluation.evaluationNumber,
          procurementId,
          evaluationType,
          evaluationMethod,
          evaluatorCount: processedEvaluators.length,
          criteriaCount: processedCriteria.length,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: 'Evaluation created successfully',
        evaluation: {
          id: evaluation._id,
          evaluationNumber: evaluation.evaluationNumber,
          status: evaluation.status,
          evaluationType: evaluation.configuration.evaluationType,
          evaluatorCount: processedEvaluators.length,
          criteriaCount: processedCriteria.length,
          timeline: evaluation.timeline
        }
      };

    } catch (error) {
      logger.error('Error creating evaluation', { 
        error: error.message, 
        evaluationData, 
        userId 
      });
      throw new Error(`Evaluation creation failed: ${error.message}`);
    }
  }

  /**
   * Submit evaluation scores for a submission
   */
  static async submitEvaluationScores(evaluationId, submissionId, scoresData, userId, requestInfo = {}) {
    try {
      const {
        scores = {},
        overallScore,
        comments = '',
        recommendations = '',
        riskAssessment,
        complianceCheck,
        qualificationDecision = 'qualified', // qualified, disqualified, conditional
        justifications = {},
        attachments = [],
        confidenceLevel = 'high' // high, medium, low
      } = scoresData;

      const { ipAddress, userAgent } = requestInfo;

      // Get evaluation and validate
      const evaluation = await Evaluation.findById(evaluationId)
        .populate('procurementId')
        .populate('submissions.submissionId');

      if (!evaluation) {
        throw new Error('Evaluation not found');
      }

      // Check if user is authorized evaluator
      const evaluator = evaluation.evaluators.find(e => e.userId.toString() === userId);
      if (!evaluator) {
        throw new Error('User is not assigned as evaluator for this evaluation');
      }

      // Check evaluator conflict status
      if (evaluator.conflictStatus === CONFLICT_STATUS.DISQUALIFIED) {
        throw new Error('Evaluator is disqualified due to conflict of interest');
      }

      // Validate submission exists in evaluation
      const submissionData = evaluation.submissions.find(s => s.submissionId.toString() === submissionId);
      if (!submissionData) {
        throw new Error('Submission not found in this evaluation');
      }

      // Validate scoring completeness
      const requiredCriteria = evaluation.criteria.filter(c => c.mandatory);
      const missingScores = requiredCriteria.filter(c => !scores[c.id]);
      if (missingScores.length > 0) {
        throw new Error(`Missing scores for required criteria: ${missingScores.map(c => c.name).join(', ')}`);
      }

      // Validate score ranges
      for (const [criteriaId, score] of Object.entries(scores)) {
        const criteria = evaluation.criteria.find(c => c.id === criteriaId);
        if (!criteria) continue;

        if (!this.isValidScore(score, evaluation.configuration.scoringScale)) {
          throw new Error(`Invalid score for criteria "${criteria.name}": ${score}`);
        }
      }

      // Calculate weighted scores
      const calculatedScores = await this.calculateWeightedScores(
        scores, 
        evaluation.criteria, 
        evaluation.configuration
      );

      // Perform risk assessment if required
      let riskData = null;
      if (evaluation.configuration.evaluationType === EVALUATION_TYPES.RISK || riskAssessment) {
        riskData = await this.performRiskAssessment(submissionData, scores, evaluation);
      }

      // Perform compliance check if required
      let complianceData = null;
      if (evaluation.configuration.evaluationType === EVALUATION_TYPES.COMPLIANCE || complianceCheck) {
        complianceData = await this.performComplianceCheck(submissionData, evaluation);
      }

      // Create evaluation record
      const evaluationRecord = {
        evaluatorId: evaluator.userId,
        evaluatorInfo: {
          name: evaluator.name,
          role: evaluator.role,
          expertise: evaluator.expertise
        },
        submissionId: new mongoose.Types.ObjectId(submissionId),
        scores: {
          individual: scores,
          weighted: calculatedScores.weighted,
          total: calculatedScores.total,
          normalized: calculatedScores.normalized,
          percentile: calculatedScores.percentile
        },
        assessment: {
          overallScore: overallScore || calculatedScores.total,
          qualificationDecision,
          confidenceLevel,
          riskLevel: riskData?.riskLevel || 'low',
          complianceStatus: complianceData?.status || 'compliant'
        },
        feedback: {
          comments: sanitize(comments),
          recommendations: sanitize(recommendations),
          justifications: Object.keys(justifications).reduce((acc, key) => {
            acc[key] = sanitize(justifications[key]);
            return acc;
          }, {}),
          strengths: [],
          weaknesses: [],
          improvementAreas: []
        },
        riskAssessment: riskData,
        complianceCheck: complianceData,
        attachments: await this.processEvaluationAttachments(attachments, userId),
        submittedAt: new Date(),
        submittedBy: userId,
        metadata: {
          submissionIP: ipAddress,
          submissionUserAgent: userAgent,
          evaluationTime: 0, // Will be calculated
          revision: 1
        }
      };

      // Update evaluation with scores
      const evaluationKey = `${evaluatorId}_${submissionId}`;
      if (!evaluation.scores) evaluation.scores = new Map();
      evaluation.scores.set(evaluationKey, evaluationRecord);

      // Update evaluator status
      const evaluatorIndex = evaluation.evaluators.findIndex(e => e.userId.toString() === userId);
      evaluation.evaluators[evaluatorIndex].submissions = evaluation.evaluators[evaluatorIndex].submissions || new Map();
      evaluation.evaluators[evaluatorIndex].submissions.set(submissionId, {
        status: 'completed',
        completedAt: new Date(),
        score: calculatedScores.total
      });

      // Check if all evaluators have completed this submission
      const allCompleted = await this.checkEvaluationCompleteness(evaluation, submissionId);
      if (allCompleted) {
        await this.processSubmissionCompletion(evaluation, submissionId);
      }

      // Check if entire evaluation is complete
      const evaluationComplete = await this.checkFullEvaluationCompleteness(evaluation);
      if (evaluationComplete) {
        await this.processEvaluationCompletion(evaluation);
      }

      await evaluation.save();

      // Create audit trail
      await auditService.logAuditEvent({
        action: 'evaluation_scores_submitted',
        entityType: 'evaluation',
        entityId: evaluationId,
        userId,
        metadata: {
          evaluationNumber: evaluation.evaluationNumber,
          submissionId,
          totalScore: calculatedScores.total,
          qualificationDecision,
          criteriaScored: Object.keys(scores).length,
          ipAddress,
          userAgent
        }
      });

      // Send notifications for significant scores or decisions
      if (qualificationDecision === 'disqualified' || calculatedScores.total < evaluation.configuration.passingThreshold) {
        await this.sendScoreAlertNotifications(evaluation, submissionData, evaluationRecord);
      }

      return {
        success: true,
        message: 'Evaluation scores submitted successfully',
        evaluation: {
          submissionId,
          totalScore: calculatedScores.total,
          qualification: qualificationDecision,
          rank: await this.calculateCurrentRank(evaluation, submissionId),
          evaluationComplete: allCompleted,
          nextSteps: await this.getNextEvaluationSteps(evaluation)
        }
      };

    } catch (error) {
      logger.error('Error submitting evaluation scores', { 
        error: error.message, 
        evaluationId, 
        submissionId, 
        userId 
      });
      throw new Error(`Score submission failed: ${error.message}`);
    }
  }

  /**
   * Get evaluation details with scores and rankings
   */
  static async getEvaluationById(evaluationId, userId, includeScores = false) {
    try {
      if (!mongoose.Types.ObjectId.isValid(evaluationId)) {
        throw new Error('Invalid evaluation ID');
      }

      const evaluation = await Evaluation.findById(evaluationId)
        .populate('procurementId', 'procurementNumber title category status')
        .populate('rfqId', 'rfqNumber title status')
        .populate('evaluators.userId', 'username firstName lastName department')
        .populate('submissions.submissionId')
        .lean();

      if (!evaluation) {
        throw new Error('Evaluation not found');
      }

      // Check access permissions
      const hasAccess = await this.checkEvaluationAccess(evaluation, userId);
      if (!hasAccess.allowed) {
        throw new Error(`Access denied: ${hasAccess.reason}`);
      }

      // Get evaluation progress
      const progress = await this.calculateEvaluationProgress(evaluation);

      // Get rankings if evaluation is in progress or completed
      let rankings = [];
      if (evaluation.status !== EVALUATION_STATUS.DRAFT) {
        rankings = await this.calculateCurrentRankings(evaluation);
      }

      // Include detailed scores if requested and permitted
      let detailedScores = [];
      if (includeScores && hasAccess.level >= 3) {
        detailedScores = await this.getDetailedScores(evaluation, userId);
      }

      // Get evaluation analytics
      const analytics = await this.getEvaluationAnalytics(evaluation);

      // Get user permissions
      const permissions = await this.getEvaluationPermissions(evaluation, userId);

      // Log access
      await auditService.logDataAccess({
        entityType: 'evaluation',
        entityId: evaluationId,
        userId,
        action: 'read',
        metadata: { 
          evaluationNumber: evaluation.evaluationNumber,
          includeScores 
        }
      });

      return {
        ...evaluation,
        progress,
        rankings,
        detailedScores,
        analytics,
        permissions,
        computed: {
          isActive: this.isEvaluationActive(evaluation),
          canSubmitScores: await this.canSubmitScores(evaluation, userId),
          nextDeadline: this.getNextDeadline(evaluation),
          evaluationHealth: await this.assessEvaluationHealth(evaluation),
          consensusStatus: this.getConsensusStatus(evaluation),
          completionPercentage: progress.overallCompletion
        }
      };

    } catch (error) {
      logger.error('Error getting evaluation', { 
        error: error.message, 
        evaluationId, 
        userId 
      });
      throw new Error(`Failed to get evaluation: ${error.message}`);
    }
  }

  /**
   * List evaluations with filtering and pagination
   */
  static async listEvaluations(filters = {}, pagination = {}, userId) {
    try {
      const {
        status,
        evaluationType,
        procurementId,
        evaluatorId,
        phase,
        overdue,
        completed,
        startDate,
        endDate,
        search
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'metadata.createdAt',
        sortOrder = -1
      } = pagination;

      // Build base query with access controls
      const baseQuery = await this.buildEvaluationAccessQuery(userId);

      // Apply filters
      if (status) {
        if (Array.isArray(status)) {
          baseQuery.status = { $in: status };
        } else {
          baseQuery.status = status;
        }
      }

      if (evaluationType) baseQuery['configuration.evaluationType'] = evaluationType;
      if (procurementId) baseQuery.procurementId = new mongoose.Types.ObjectId(procurementId);
      if (phase) baseQuery.currentPhase = phase;
      if (completed !== undefined) baseQuery['results.completed'] = completed;

      // Evaluator filter
      if (evaluatorId) {
        baseQuery['evaluators.userId'] = new mongoose.Types.ObjectId(evaluatorId);
      }

      // Date range filter
      if (startDate || endDate) {
        baseQuery['metadata.createdAt'] = {};
        if (startDate) baseQuery['metadata.createdAt'].$gte = new Date(startDate);
        if (endDate) baseQuery['metadata.createdAt'].$lte = new Date(endDate);
      }

      // Overdue filter
      if (overdue === true) {
        baseQuery['timeline.completionDeadline'] = { $lt: new Date() };
        baseQuery.status = { $nin: [EVALUATION_STATUS.COMPLETED, EVALUATION_STATUS.CANCELLED] };
      }

      // Search functionality
      if (search) {
        baseQuery.$or = [
          { evaluationNumber: { $regex: search, $options: 'i' } },
          { 'metadata.searchKeywords': { $in: [search.toLowerCase()] } }
        ];
      }

      // Execute query
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder;

      const [evaluations, totalCount] = await Promise.all([
        Evaluation.find(baseQuery)
          .populate('procurementId', 'procurementNumber title category')
          .populate('rfqId', 'rfqNumber title')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Evaluation.countDocuments(baseQuery)
      ]);

      // Enrich evaluations with computed fields
      const enrichedEvaluations = await Promise.all(
        evaluations.map(async evaluation => {
          const progress = await this.calculateEvaluationProgress(evaluation);
          return {
            ...evaluation,
            computed: {
              completionPercentage: progress.overallCompletion,
              isOverdue: this.isEvaluationOverdue(evaluation),
              nextDeadline: this.getNextDeadline(evaluation),
              evaluatorCount: evaluation.evaluators?.length || 0,
              submissionCount: evaluation.submissions?.length || 0,
              averageScore: evaluation.results?.averageScore || 0,
              status: this.getEvaluationStatusIndicator(evaluation)
            }
          };
        })
      );

      // Calculate pagination
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Generate summary
      const summary = await this.generateEvaluationsSummary(baseQuery);

      // Log list access
      await auditService.logDataAccess({
        entityType: 'evaluation',
        entityId: null,
        userId,
        action: 'list',
        metadata: {
          filters,
          pagination: { page, limit },
          resultCount: evaluations.length,
          totalCount
        }
      });

      return {
        evaluations: enrichedEvaluations,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        },
        summary,
        filters: {
          applied: filters,
          available: await this.getAvailableEvaluationFilters(userId)
        }
      };

    } catch (error) {
      logger.error('Error listing evaluations', { 
        error: error.message, 
        filters, 
        userId 
      });
      throw new Error(`Failed to list evaluations: ${error.message}`);
    }
  }

  /**
   * Generate evaluation report
   */
  static async generateEvaluationReport(evaluationId, reportType, userId) {
    try {
      const evaluation = await Evaluation.findById(evaluationId)
        .populate('procurementId')
        .populate('submissions.submissionId')
        .populate('evaluators.userId');

      if (!evaluation) {
        throw new Error('Evaluation not found');
      }

      // Check permissions
      const canReport = await this.canGenerateReport(evaluation, userId);
      if (!canReport) {
        throw new Error('Insufficient permissions to generate evaluation report');
      }

      const reportId = generateSequentialId('EVAL-RPT');
      let reportData;

      switch (reportType) {
        case 'summary':
          reportData = await this.generateEvaluationSummaryReport(evaluation);
          break;

        case 'detailed_scores':
          reportData = await this.generateDetailedScoresReport(evaluation);
          break;

        case 'comparative_analysis':
          reportData = await this.generateComparativeAnalysisReport(evaluation);
          break;

        case 'recommendation':
          reportData = await this.generateRecommendationReport(evaluation);
          break;

        case 'compliance':
          reportData = await this.generateComplianceReport(evaluation);
          break;

        case 'risk_assessment':
          reportData = await this.generateRiskAssessmentReport(evaluation);
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Log report generation
      await auditService.logAuditEvent({
        action: 'evaluation_report_generated',
        entityType: 'evaluation',
        entityId: evaluationId,
        userId,
        metadata: {
          reportId,
          reportType,
          evaluationNumber: evaluation.evaluationNumber
        }
      });

      return {
        reportId,
        reportType,
        evaluationNumber: evaluation.evaluationNumber,
        generatedAt: new Date(),
        generatedBy: userId,
        data: reportData
      };

    } catch (error) {
      logger.error('Error generating evaluation report', { 
        error: error.message, 
        evaluationId, 
        reportType, 
        userId 
      });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  // Helper methods for evaluation management
  static async generateEvaluationNumber(category) {
    const year = new Date().getFullYear();
    const prefix = `EVAL-${category.toUpperCase()}-${year}`;
    
    const lastEvaluation = await Evaluation.findOne({
      evaluationNumber: { $regex: `^${prefix}` }
    }).sort({ evaluationNumber: -1 });

    let sequence = 1;
    if (lastEvaluation) {
      const lastSequence = parseInt(lastEvaluation.evaluationNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  static async processCriteria(criteria, evaluationType, scoringScale) {
    return criteria.map((criterion, index) => ({
      id: criterion.id || `criteria_${index + 1}`,
      name: sanitize(criterion.name),
      description: sanitize(criterion.description),
      weight: criterion.weight,
      mandatory: criterion.mandatory || false,
      evaluationType: criterion.evaluationType || evaluationType,
      scoringScale: criterion.scoringScale || scoringScale,
      scoringGuidelines: criterion.scoringGuidelines || '',
      subCriteria: criterion.subCriteria || [],
      expertiseRequired: criterion.expertiseRequired || [],
      benchmarks: criterion.benchmarks || [],
      order: index + 1
    }));
  }

  static async processEvaluators(evaluators, evaluationType) {
    const processedEvaluators = [];
    
    for (const evaluator of evaluators) {
      const user = await User.findById(evaluator.userId)
        .select('username firstName lastName email department expertise roles');
      
      if (!user) {
        throw new Error(`Evaluator not found: ${evaluator.userId}`);
      }

      // Check for conflicts of interest
      const conflictCheck = await this.checkConflictOfInterest(user._id, evaluationType);

      processedEvaluators.push({
        userId: user._id,
        username: user.username,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        department: user.department,
        role: evaluator.role || EVALUATOR_ROLES.TECHNICAL_EVALUATOR,
        expertise: evaluator.expertise || user.expertise || [],
        assignedCriteria: evaluator.assignedCriteria || [],
        weight: evaluator.weight || 1,
        conflictStatus: conflictCheck.status,
        conflictDetails: conflictCheck.details,
        assignedAt: new Date(),
        status: 'active',
        submissions: new Map()
      });
    }

    return processedEvaluators;
  }

  static async calculateWeightedScores(scores, criteria, configuration) {
    let totalWeighted = 0;
    let totalWeight = 0;
    const weighted = {};

    for (const criterion of criteria) {
      if (scores[criterion.id] !== undefined) {
        const score = parseFloat(scores[criterion.id]);
        const weight = criterion.weight / 100;
        
        weighted[criterion.id] = score * weight;
        totalWeighted += weighted[criterion.id];
        totalWeight += weight;
      }
    }

    const total = totalWeight > 0 ? totalWeighted / totalWeight : 0;
    const normalized = this.normalizeScore(total, configuration.scoringScale);
    
    return {
      weighted,
      total: Math.round(total * 100) / 100,
      normalized: Math.round(normalized * 100) / 100,
      percentile: this.calculatePercentile(total)
    };
  }

  static normalizeScore(score, scoringScale) {
    switch (scoringScale) {
      case SCORING_SCALES.FIVE_POINT:
        return (score / 5) * 100;
      case SCORING_SCALES.TEN_POINT:
        return (score / 10) * 100;
      case SCORING_SCALES.HUNDRED_POINT:
        return score;
      case SCORING_SCALES.PERCENTAGE:
        return score;
      default:
        return score;
    }
  }

  static calculatePercentile(score) {
    // Simplified percentile calculation - would use actual distribution in production
    if (score >= 90) return 95;
    if (score >= 80) return 80;
    if (score >= 70) return 65;
    if (score >= 60) return 50;
    if (score >= 50) return 35;
    return 20;
  }

  static isValidScore(score, scoringScale) {
    const numScore = parseFloat(score);
    if (isNaN(numScore)) return false;

    switch (scoringScale) {
      case SCORING_SCALES.FIVE_POINT:
        return numScore >= 1 && numScore <= 5;
      case SCORING_SCALES.TEN_POINT:
        return numScore >= 1 && numScore <= 10;
      case SCORING_SCALES.HUNDRED_POINT:
      case SCORING_SCALES.PERCENTAGE:
        return numScore >= 0 && numScore <= 100;
      case SCORING_SCALES.PASS_FAIL:
        return ['pass', 'fail'].includes(score.toLowerCase());
      default:
        return true;
    }
  }

  static generateEvaluationTags(procurement, evaluationType) {
    return [
      evaluationType,
      procurement.category,
      'evaluation',
      procurement.priority || 'medium'
    ];
  }

  static extractEvaluationKeywords(procurement, criteria) {
    const text = `${procurement.title} ${criteria.map(c => c.name).join(' ')}`;
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    return [...new Set(words)].slice(0, 20);
  }

  static isEvaluationActive(evaluation) {
    return ![EVALUATION_STATUS.COMPLETED, EVALUATION_STATUS.CANCELLED, EVALUATION_STATUS.REJECTED]
      .includes(evaluation.status);
  }

  static isEvaluationOverdue(evaluation) {
    if (!evaluation.timeline?.completionDeadline) return false;
    return new Date() > new Date(evaluation.timeline.completionDeadline) && 
           !evaluation.results?.completed;
  }

  static getNextDeadline(evaluation) {
    const deadlines = [];
    
    if (evaluation.timeline?.initialScreeningDeadline) {
      deadlines.push({
        phase: 'Initial Screening',
        date: evaluation.timeline.initialScreeningDeadline
      });
    }
    
    if (evaluation.timeline?.detailedEvaluationDeadline) {
      deadlines.push({
        phase: 'Detailed Evaluation',
        date: evaluation.timeline.detailedEvaluationDeadline
      });
    }
    
    if (evaluation.timeline?.completionDeadline) {
      deadlines.push({
        phase: 'Completion',
        date: evaluation.timeline.completionDeadline
      });
    }

    const upcoming = deadlines
      .filter(d => new Date(d.date) > new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return upcoming[0] || null;
  }

  static getEvaluationStatusIndicator(evaluation) {
    if (this.isEvaluationOverdue(evaluation)) return 'overdue';
    if (evaluation.results?.completed) return 'completed';
    if (evaluation.status === EVALUATION_STATUS.IN_PROGRESS) return 'active';
    return 'pending';
  }

  static getConsensusStatus(evaluation) {
    if (!evaluation.consensus?.required) return 'not_required';
    if (evaluation.consensus?.achieved) return 'achieved';
    if (evaluation.consensus?.sessions?.length > 0) return 'in_progress';
    return 'pending';
  }

  // Placeholder methods for complex operations (to be implemented)
  static async canCreateEvaluation(procurement, userId) { return { allowed: true }; }
  static async calculateEvaluationTimeline(procurement, timeline, evaluationType, evaluatorCount) { 
    return { 
      startDate: new Date(),
      completionDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      phases: []
    }; 
  }
  static async getComplianceRequirements(procurement) { return []; }
  static async setupEvaluationWorkspace(evaluation) { }
  static async checkConflictOfInterest(userId, evaluationType) { 
    return { status: CONFLICT_STATUS.NO_CONFLICT, details: [] }; 
  }
  static async performRiskAssessment(submission, scores, evaluation) { 
    return { riskLevel: 'low', factors: [], score: 0 }; 
  }
  static async performComplianceCheck(submission, evaluation) { 
    return { status: 'compliant', violations: [], score: 100 }; 
  }
  static async processEvaluationAttachments(attachments, userId) { return attachments; }
  static async checkEvaluationCompleteness(evaluation, submissionId) { return false; }
  static async processSubmissionCompletion(evaluation, submissionId) { }
  static async checkFullEvaluationCompleteness(evaluation) { return false; }
  static async processEvaluationCompletion(evaluation) { }
  static async calculateCurrentRank(evaluation, submissionId) { return 1; }
  static async getNextEvaluationSteps(evaluation) { return []; }
  static async checkEvaluationAccess(evaluation, userId) { 
    return { allowed: true, level: 2, reason: null }; 
  }
  static async calculateEvaluationProgress(evaluation) { 
    return { overallCompletion: 0, phaseCompletion: {} }; 
  }
  static async calculateCurrentRankings(evaluation) { return []; }
  static async getDetailedScores(evaluation, userId) { return []; }
  static async getEvaluationAnalytics(evaluation) { return {}; }
  static async getEvaluationPermissions(evaluation, userId) { return {}; }
  static async canSubmitScores(evaluation, userId) { return false; }
  static async assessEvaluationHealth(evaluation) { return 'good'; }
  static async buildEvaluationAccessQuery(userId) { return {}; }
  static async generateEvaluationsSummary(query) { return {}; }
  static async getAvailableEvaluationFilters(userId) { return {}; }
  static async canGenerateReport(evaluation, userId) { return true; }

  // Notification methods
  static async sendEvaluationSetupNotifications(evaluation, evaluators) { }
  static async sendScoreAlertNotifications(evaluation, submission, record) { }

  // Report generation methods
  static async generateEvaluationSummaryReport(evaluation) { return {}; }
  static async generateDetailedScoresReport(evaluation) { return {}; }
  static async generateComparativeAnalysisReport(evaluation) { return {}; }
  static async generateRecommendationReport(evaluation) { return {}; }
  static async generateComplianceReport(evaluation) { return {}; }
  static async generateRiskAssessmentReport(evaluation) { return {}; }
}

module.exports = EvaluationService;
