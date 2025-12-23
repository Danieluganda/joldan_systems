/**
 * RFQ Service
 * 
 * Comprehensive Request for Quotation management with lifecycle tracking,
 * vendor management, evaluation workflows, and advanced analytics
 * Feature 3: Advanced RFQ creation and management system
 */

const mongoose = require('mongoose');
const RFQ = require('../db/models/RFQ');
const Submission = require('../db/models/Submission');
const Evaluation = require('../db/models/Evaluation');
const Vendor = require('../db/models/Vendor');
const User = require('../db/models/User');
const Procurement = require('../db/models/Procurement');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const approvalService = require('./approvalService');
const documentService = require('./documentService');
const pdfService = require('./pdfService');
const { validateInput, sanitize } = require('../utils/validation');
const { formatDate, formatCurrency, generateRFQNumber, calculateDateDifference } = require('../utils/helpers');
const { assessRFQComplexity, calculateRiskScore, validateVendorEligibility } = require('../utils/procurementAnalytics');
const { generateRFQReport, generateVendorAnalysis } = require('../utils/reportGenerator');

// RFQ status constants
const RFQ_STATUS = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  OPEN: 'open',
  CLOSED: 'closed',
  EVALUATED: 'evaluated',
  AWARDED: 'awarded',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// RFQ types
const RFQ_TYPES = {
  OPEN_TENDER: 'open_tender',
  RESTRICTED_TENDER: 'restricted_tender',
  NEGOTIATED_PROCEDURE: 'negotiated_procedure',
  COMPETITIVE_DIALOGUE: 'competitive_dialogue',
  INNOVATION_PARTNERSHIP: 'innovation_partnership',
  FRAMEWORK_AGREEMENT: 'framework_agreement',
  DYNAMIC_PURCHASING: 'dynamic_purchasing'
};

// Evaluation criteria types
const EVALUATION_CRITERIA = {
  LOWEST_PRICE: 'lowest_price',
  MOST_ECONOMICALLY_ADVANTAGEOUS: 'most_economically_advantageous',
  BEST_PRICE_QUALITY_RATIO: 'best_price_quality_ratio',
  COST_EFFECTIVENESS: 'cost_effectiveness'
};

// RFQ complexity levels
const COMPLEXITY_LEVELS = {
  SIMPLE: 'simple',
  MODERATE: 'moderate',
  COMPLEX: 'complex',
  HIGHLY_COMPLEX: 'highly_complex'
};

// RFQ events for audit trail
const RFQ_EVENTS = {
  CREATED: 'rfq_created',
  UPDATED: 'rfq_updated',
  SUBMITTED: 'rfq_submitted',
  APPROVED: 'rfq_approved',
  PUBLISHED: 'rfq_published',
  CLOSED: 'rfq_closed',
  EVALUATED: 'rfq_evaluated',
  AWARDED: 'rfq_awarded',
  CANCELLED: 'rfq_cancelled'
};

class RFQService {
  /**
   * Create comprehensive RFQ
   */
  static async createRFQ(rfqData, userId, requestInfo = {}) {
    try {
      const {
        title,
        description,
        procurementId,
        rfqType = RFQ_TYPES.OPEN_TENDER,
        specifications = [],
        evaluationCriteria = [],
        qualificationCriteria = [],
        technicalRequirements = [],
        commercialTerms = {},
        timeline = {},
        budget = {},
        vendorRestrictions = {},
        submissionRequirements = {},
        attachments = [],
        contactInfo = {},
        legalTerms = {},
        metadata = {}
      } = rfqData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!title || !description || !procurementId) {
        throw new Error('Title, description, and procurement ID are required');
      }

      // Sanitize inputs
      const sanitizedTitle = sanitize(title);
      const sanitizedDescription = sanitize(description);

      // Generate RFQ number
      const rfqNumber = await generateRFQNumber(procurementId, rfqType);

      // Assess RFQ complexity
      const complexityAssessment = await assessRFQComplexity({
        specifications,
        evaluationCriteria,
        technicalRequirements,
        estimatedValue: budget.estimatedValue
      });

      // Calculate risk score
      const riskScore = await calculateRiskScore(rfqData, complexityAssessment.level);

      // Validate timeline
      this.validateRFQTimeline(timeline);

      // Create RFQ record
      const rfq = new RFQ({
        rfqNumber,
        title: sanitizedTitle,
        description: sanitizedDescription,
        
        // Procurement context
        procurementId: new mongoose.Types.ObjectId(procurementId),
        rfqType,
        complexityLevel: complexityAssessment.level,
        riskScore,
        
        // RFQ details
        specifications: specifications.map(spec => ({
          id: spec.id || new mongoose.Types.ObjectId(),
          title: sanitize(spec.title),
          description: sanitize(spec.description),
          category: spec.category,
          quantity: spec.quantity || 1,
          unit: spec.unit,
          technicalSpecs: spec.technicalSpecs || {},
          mandatory: spec.mandatory !== false,
          weight: spec.weight || 1
        })),
        
        // Evaluation framework
        evaluation: {
          criteria: evaluationCriteria.map(criterion => ({
            id: criterion.id || new mongoose.Types.ObjectId(),
            name: sanitize(criterion.name),
            description: sanitize(criterion.description || ''),
            type: criterion.type || 'score',
            weight: criterion.weight || 1,
            maxScore: criterion.maxScore || 100,
            passingScore: criterion.passingScore || 60,
            mandatory: criterion.mandatory !== false,
            subCriteria: (criterion.subCriteria || []).map(sub => ({
              name: sanitize(sub.name),
              weight: sub.weight || 1,
              maxScore: sub.maxScore || 100
            }))
          })),
          method: EVALUATION_CRITERIA.MOST_ECONOMICALLY_ADVANTAGEOUS,
          technicalWeight: evaluationCriteria.find(c => c.type === 'technical')?.weight || 60,
          financialWeight: evaluationCriteria.find(c => c.type === 'financial')?.weight || 40,
          qualityWeight: evaluationCriteria.find(c => c.type === 'quality')?.weight || 0
        },
        
        // Qualification requirements
        qualification: {
          criteria: qualificationCriteria.map(criterion => ({
            id: criterion.id || new mongoose.Types.ObjectId(),
            requirement: sanitize(criterion.requirement),
            category: criterion.category || 'general',
            mandatory: criterion.mandatory !== false,
            verification: criterion.verification || 'document',
            documents: criterion.documents || []
          })),
          minimumRequirements: qualificationCriteria.filter(c => c.mandatory),
          experienceRequirements: qualificationCriteria.filter(c => c.category === 'experience'),
          financialRequirements: qualificationCriteria.filter(c => c.category === 'financial'),
          technicalCapabilities: qualificationCriteria.filter(c => c.category === 'technical')
        },
        
        // Technical specifications
        technical: {
          requirements: technicalRequirements.map(req => ({
            id: req.id || new mongoose.Types.ObjectId(),
            section: req.section,
            requirement: sanitize(req.requirement),
            specification: req.specification,
            testing: req.testing || '',
            compliance: req.compliance || 'mandatory',
            standards: req.standards || []
          })),
          drawings: attachments.filter(att => att.type === 'drawing'),
          standards: technicalRequirements.flatMap(req => req.standards || []),
          testing: technicalRequirements.filter(req => req.testing),
          warranty: technicalRequirements.find(req => req.section === 'warranty')
        },
        
        // Commercial terms
        commercial: {
          currency: commercialTerms.currency || 'USD',
          paymentTerms: commercialTerms.paymentTerms || 'Net 30',
          deliveryTerms: commercialTerms.deliveryTerms || 'FOB Destination',
          deliveryLocation: commercialTerms.deliveryLocation,
          deliverySchedule: commercialTerms.deliverySchedule || [],
          warrantyPeriod: commercialTerms.warrantyPeriod,
          penaltyClause: commercialTerms.penaltyClause,
          bonusClause: commercialTerms.bonusClause,
          priceValidity: commercialTerms.priceValidity || 90,
          priceAdjustment: commercialTerms.priceAdjustment || false
        },
        
        // Timeline management
        timeline: {
          publishDate: timeline.publishDate ? new Date(timeline.publishDate) : null,
          clarificationDeadline: timeline.clarificationDeadline ? new Date(timeline.clarificationDeadline) : null,
          submissionDeadline: new Date(timeline.submissionDeadline),
          evaluationPeriod: timeline.evaluationPeriod || 14,
          awardDate: timeline.awardDate ? new Date(timeline.awardDate) : null,
          contractStartDate: timeline.contractStartDate ? new Date(timeline.contractStartDate) : null,
          milestones: (timeline.milestones || []).map(milestone => ({
            name: sanitize(milestone.name),
            date: new Date(milestone.date),
            description: sanitize(milestone.description || '')
          }))
        },
        
        // Budget information
        budget: {
          estimatedValue: budget.estimatedValue || 0,
          currency: budget.currency || 'USD',
          budgetSource: budget.budgetSource,
          costBreakdown: budget.breakdown || [],
          contingency: budget.contingency || 0,
          totalBudget: (budget.estimatedValue || 0) + (budget.contingency || 0)
        },
        
        // Vendor management
        vendors: {
          restrictions: {
            geographicRestrictions: vendorRestrictions.geographic || [],
            industryRestrictions: vendorRestrictions.industry || [],
            sizeRestrictions: vendorRestrictions.size || {},
            certificationRequirements: vendorRestrictions.certifications || []
          },
          invitedVendors: [], // Will be populated when publishing
          registeredVendors: [],
          qualifiedVendors: [],
          disqualifiedVendors: []
        },
        
        // Submission requirements
        submission: {
          format: submissionRequirements.format || 'electronic',
          language: submissionRequirements.language || 'en',
          currency: submissionRequirements.currency || commercialTerms.currency || 'USD',
          documents: (submissionRequirements.documents || []).map(doc => ({
            name: sanitize(doc.name),
            type: doc.type,
            mandatory: doc.mandatory !== false,
            format: doc.format || 'pdf',
            maxSize: doc.maxSize || 10485760, // 10MB default
            description: sanitize(doc.description || '')
          })),
          technicalProposal: submissionRequirements.technicalProposal || {},
          financialProposal: submissionRequirements.financialProposal || {},
          bondRequirements: submissionRequirements.bonds || []
        },
        
        // Contact information
        contact: {
          procurementOfficer: contactInfo.officer,
          email: contactInfo.email,
          phone: contactInfo.phone,
          address: contactInfo.address,
          office: contactInfo.office,
          alternateContact: contactInfo.alternate,
          enquiryHours: contactInfo.hours || 'Business hours'
        },
        
        // Legal and compliance
        legal: {
          governingLaw: legalTerms.governingLaw,
          jurisdiction: legalTerms.jurisdiction,
          disputeResolution: legalTerms.disputeResolution || 'arbitration',
          confidentiality: legalTerms.confidentiality || true,
          intellectualProperty: legalTerms.intellectualProperty || {},
          liability: legalTerms.liability || {},
          insurance: legalTerms.insurance || {},
          compliance: legalTerms.compliance || []
        },
        
        // Document management
        documents: {
          attachments: attachments.map(att => ({
            id: att.id || new mongoose.Types.ObjectId(),
            filename: att.filename,
            type: att.type || 'specification',
            size: att.size || 0,
            url: att.url,
            mandatory: att.mandatory !== false,
            description: sanitize(att.description || '')
          })),
          templates: [],
          generatedDocuments: []
        },
        
        // Status and workflow
        status: RFQ_STATUS.DRAFT,
        workflow: {
          currentPhase: 'creation',
          approvalRequired: complexityAssessment.level !== COMPLEXITY_LEVELS.SIMPLE,
          approvalWorkflow: [],
          publishApproval: null
        },
        
        // Analytics and tracking
        analytics: {
          viewCount: 0,
          downloadCount: 0,
          inquiryCount: 0,
          submissionCount: 0,
          clarificationCount: 0,
          viewerStats: new Map(),
          accessLog: []
        },
        
        // Lifecycle management
        lifecycle: {
          version: '1.0',
          createdAt: new Date(),
          createdBy: userId,
          lastModified: new Date(),
          modifiedBy: userId,
          statusHistory: [{
            status: RFQ_STATUS.DRAFT,
            changedAt: new Date(),
            changedBy: userId,
            reason: 'RFQ creation'
          }]
        },
        
        // System tracking
        system: {
          creationIP: ipAddress,
          creationUserAgent: userAgent,
          complexity: complexityAssessment,
          riskAssessment: { score: riskScore, factors: [] },
          qualityScore: 85, // Initial quality score
          completionScore: this.calculateCompletionScore(rfqData)
        },
        
        // Metadata and tags
        metadata: {
          tags: metadata.tags || [],
          category: metadata.category || 'general',
          priority: metadata.priority || 'medium',
          customFields: metadata.customFields || {},
          externalReferences: metadata.externalReferences || []
        }
      });

      await rfq.save();

      // Create initial document attachments
      if (attachments.length > 0) {
        await this.processRFQAttachments(rfq, attachments, userId);
      }

      // Set up approval workflow if required
      if (rfq.workflow.approvalRequired) {
        await this.setupApprovalWorkflow(rfq, userId);
      }

      // Create audit trail
      await auditService.logAuditEvent({
        action: RFQ_EVENTS.CREATED,
        entityType: 'rfq',
        entityId: rfq._id,
        userId,
        metadata: {
          rfqNumber: rfq.rfqNumber,
          rfqType,
          procurementId,
          complexityLevel: complexityAssessment.level,
          estimatedValue: budget.estimatedValue,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: 'RFQ created successfully',
        rfq: {
          id: rfq._id,
          rfqNumber: rfq.rfqNumber,
          title: rfq.title,
          status: rfq.status,
          rfqType: rfq.rfqType,
          complexityLevel: rfq.complexityLevel,
          estimatedValue: rfq.budget.estimatedValue,
          submissionDeadline: rfq.timeline.submissionDeadline
        }
      };

    } catch (error) {
      logger.error('Error creating RFQ', { 
        error: error.message, 
        rfqData, 
        userId 
      });
      throw new Error(`RFQ creation failed: ${error.message}`);
    }
  }

  /**
   * Publish RFQ and notify vendors (enhanced legacy method)
   */
  static async publishRFQ(rfqId, userId = null, publishOptions = {}) {
    try {
      const rfq = await RFQ.findById(rfqId);
      if (!rfq) {
        throw new Error('RFQ not found');
      }

      // Validate RFQ readiness for publication
      const readinessCheck = await this.validateRFQReadiness(rfq);
      if (!readinessCheck.ready) {
        throw new Error(`RFQ not ready for publication: ${readinessCheck.issues.join(', ')}`);
      }

      // Check if approval is required and obtained
      if (rfq.workflow.approvalRequired && rfq.workflow.publishApproval?.status !== 'approved') {
        throw new Error('RFQ approval required before publication');
      }

      // Update RFQ status
      rfq.status = RFQ_STATUS.PUBLISHED;
      rfq.workflow.currentPhase = 'published';
      rfq.timeline.publishDate = new Date();

      // Set opening and closing dates
      const openDate = publishOptions.openDate ? new Date(publishOptions.openDate) : new Date();
      rfq.timeline.openDate = openDate;
      
      if (!rfq.timeline.submissionDeadline) {
        const defaultDeadline = new Date(openDate);
        defaultDeadline.setDate(defaultDeadline.getDate() + 21); // 21 days default
        rfq.timeline.submissionDeadline = defaultDeadline;
      }

      // Identify and invite eligible vendors
      const eligibleVendors = await this.identifyEligibleVendors(rfq);
      rfq.vendors.invitedVendors = eligibleVendors.map(vendor => ({
        vendorId: vendor._id,
        invitedAt: new Date(),
        invitationMethod: 'system',
        status: 'invited'
      }));

      // Generate RFQ PDF document
      const pdfResult = await pdfService.generateRFQPDF({
        ...rfq.toObject(),
        id: rfq._id
      }, userId);

      if (pdfResult.success) {
        rfq.documents.generatedDocuments.push({
          type: 'rfq_pdf',
          documentId: pdfResult.document.id,
          filename: pdfResult.document.filename,
          generatedAt: new Date()
        });
      }

      // Update lifecycle
      rfq.lifecycle.statusHistory.push({
        status: RFQ_STATUS.PUBLISHED,
        changedAt: new Date(),
        changedBy: userId || 'system',
        reason: publishOptions.reason || 'RFQ published'
      });

      await rfq.save();

      // Send notifications to eligible vendors
      if (eligibleVendors.length > 0) {
        await this.sendVendorInvitations(rfq, eligibleVendors, userId);
      }

      // Notify internal stakeholders
      await this.sendPublicationNotifications(rfq, userId);

      // Create audit trail
      await auditService.logAuditEvent({
        action: RFQ_EVENTS.PUBLISHED,
        entityType: 'rfq',
        entityId: rfq._id,
        userId: userId || 'system',
        metadata: {
          rfqNumber: rfq.rfqNumber,
          invitedVendors: eligibleVendors.length,
          publishDate: rfq.timeline.publishDate,
          submissionDeadline: rfq.timeline.submissionDeadline
        }
      });

      logger.info('RFQ published successfully', { 
        rfqId: rfq._id,
        rfqNumber: rfq.rfqNumber,
        invitedVendors: eligibleVendors.length 
      });

      return {
        success: true,
        message: 'RFQ published successfully',
        rfq: {
          id: rfq._id,
          rfqNumber: rfq.rfqNumber,
          status: rfq.status,
          publishDate: rfq.timeline.publishDate,
          submissionDeadline: rfq.timeline.submissionDeadline,
          invitedVendors: eligibleVendors.length
        },
        invitedVendors: eligibleVendors.map(v => ({
          id: v._id,
          name: v.name,
          email: v.email
        }))
      };

    } catch (error) {
      logger.error('Error publishing RFQ', { error: error.message, rfqId });
      throw new Error(`RFQ publication failed: ${error.message}`);
    }
  }

  /**
   * Close RFQ and prevent new submissions (enhanced legacy method)
   */
  static async closeRFQ(rfqId, userId = null, closureOptions = {}) {
    try {
      const rfq = await RFQ.findById(rfqId);
      if (!rfq) {
        throw new Error('RFQ not found');
      }

      if (rfq.status !== RFQ_STATUS.PUBLISHED && rfq.status !== RFQ_STATUS.OPEN) {
        throw new Error(`Cannot close RFQ with status: ${rfq.status}`);
      }

      // Validate closure
      const closureValidation = await this.validateRFQClosure(rfqId);
      if (!closureValidation.valid && !closureOptions.forceClose) {
        throw new Error(`RFQ closure validation failed: ${closureValidation.message}`);
      }

      // Update RFQ status
      rfq.status = RFQ_STATUS.CLOSED;
      rfq.workflow.currentPhase = 'closed';
      rfq.timeline.closedDate = new Date();

      // Calculate final statistics
      const submissions = await Submission.find({ rfqId: rfq._id });
      rfq.analytics.submissionCount = submissions.length;
      rfq.analytics.finalStats = {
        totalSubmissions: submissions.length,
        qualifiedSubmissions: submissions.filter(s => s.status === 'qualified').length,
        uniqueVendors: new Set(submissions.map(s => s.vendorId.toString())).size,
        averageSubmissionValue: submissions.length > 0 
          ? submissions.reduce((sum, s) => sum + (s.quotedPrice || 0), 0) / submissions.length 
          : 0,
        closureReason: closureOptions.reason || 'Submission deadline reached'
      };

      // Update lifecycle
      rfq.lifecycle.statusHistory.push({
        status: RFQ_STATUS.CLOSED,
        changedAt: new Date(),
        changedBy: userId || 'system',
        reason: closureOptions.reason || 'Submission deadline reached'
      });

      await rfq.save();

      // Notify vendors about closure
      await this.sendRFQClosureNotifications(rfq, submissions, userId);

      // Notify internal stakeholders
      await this.sendInternalClosureNotifications(rfq, userId);

      // Create audit trail
      await auditService.logAuditEvent({
        action: RFQ_EVENTS.CLOSED,
        entityType: 'rfq',
        entityId: rfq._id,
        userId: userId || 'system',
        metadata: {
          rfqNumber: rfq.rfqNumber,
          submissionCount: submissions.length,
          closedDate: rfq.timeline.closedDate,
          reason: closureOptions.reason
        }
      });

      logger.info('RFQ closed successfully', { 
        rfqId: rfq._id,
        rfqNumber: rfq.rfqNumber,
        submissionCount: submissions.length 
      });

      return {
        success: true,
        message: 'RFQ closed successfully',
        rfq: {
          id: rfq._id,
          rfqNumber: rfq.rfqNumber,
          status: rfq.status,
          closedDate: rfq.timeline.closedDate,
          submissionCount: submissions.length
        },
        statistics: rfq.analytics.finalStats
      };

    } catch (error) {
      logger.error('Error closing RFQ', { error: error.message, rfqId });
      throw new Error(`RFQ closure failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive submission statistics (enhanced legacy method)
   */
  static async getSubmissionStats(rfqId, userId = null, options = {}) {
    try {
      const rfq = await RFQ.findById(rfqId);
      if (!rfq) {
        throw new Error('RFQ not found');
      }

      const submissions = await Submission.find({ rfqId: rfq._id })
        .populate('vendorId', 'name email phone address')
        .populate('submittedBy', 'name email');

      // Basic statistics
      const basicStats = {
        rfqId: rfq._id,
        rfqNumber: rfq.rfqNumber,
        totalSubmissions: submissions.length,
        submissionsByStatus: this._groupByStatus(submissions),
        priceRange: this._calculatePriceRange(submissions),
        vendorCount: new Set(submissions.map(s => s.vendorId?._id?.toString())).size,
        uniqueVendors: [...new Set(submissions.map(s => s.vendorId?._id?.toString()))].length
      };

      // Enhanced analytics
      const enhancedStats = {
        ...basicStats,
        submissionTimeline: this._analyzeSubmissionTimeline(submissions, rfq.timeline),
        geographicDistribution: this._analyzeGeographicDistribution(submissions),
        vendorTypeAnalysis: this._analyzeVendorTypes(submissions),
        qualificationStatus: this._analyzeQualificationStatus(submissions),
        documentCompliance: await this._analyzeDocumentCompliance(submissions),
        priceAnalytics: this._analyzePriceDistribution(submissions),
        competitiveness: this._analyzeCompetitiveness(submissions),
        riskAssessment: await this._analyzeSubmissionRisks(submissions)
      };

      // Time-based analysis
      if (options.includeTimeAnalysis) {
        enhancedStats.timeAnalysis = {
          submissionsByDay: this._groupSubmissionsByDay(submissions),
          lastMinuteSubmissions: this._getLastMinuteSubmissions(submissions, rfq.timeline.submissionDeadline),
          averageSubmissionTime: this._calculateAverageSubmissionTime(submissions),
          submissionVelocity: this._calculateSubmissionVelocity(submissions, rfq.timeline)
        };
      }

      // Detailed vendor analysis
      if (options.includeVendorAnalysis) {
        enhancedStats.vendorAnalysis = await this._generateVendorAnalysis(submissions);
      }

      // Update analytics
      await RFQ.findByIdAndUpdate(rfqId, {
        $set: {
          'analytics.lastAnalysis': new Date(),
          'analytics.submissionCount': submissions.length
        }
      });

      return {
        success: true,
        statistics: enhancedStats,
        generatedAt: new Date(),
        dataPoints: submissions.length
      };

    } catch (error) {
      logger.error('Error getting submission statistics', { 
        error: error.message, 
        rfqId 
      });
      throw new Error(`Statistics retrieval failed: ${error.message}`);
    }
  }

  /**
   * Consolidate evaluation scores (enhanced legacy method)
   */
  static async consolidateEvaluations(rfqId, userId = null, consolidationOptions = {}) {
    try {
      const rfq = await RFQ.findById(rfqId);
      if (!rfq) {
        throw new Error('RFQ not found');
      }

      const submissions = await Submission.find({ rfqId: rfq._id })
        .populate('vendorId', 'name email')
        .populate('evaluations');

      const consolidatedResults = [];

      for (const submission of submissions) {
        const evaluations = await Evaluation.find({ submissionId: submission._id })
          .populate('evaluatorId', 'name email role');

        // Calculate weighted scores based on RFQ evaluation criteria
        const scoreCalculation = await this._calculateWeightedScores(
          evaluations,
          rfq.evaluation,
          consolidationOptions
        );

        // Perform statistical analysis
        const statisticalAnalysis = this._performStatisticalAnalysis(evaluations);

        // Assess evaluation quality
        const qualityAssessment = this._assessEvaluationQuality(evaluations, rfq.evaluation);

        consolidatedResults.push({
          submissionId: submission._id,
          vendorId: submission.vendorId._id,
          vendorName: submission.vendorId.name,
          
          // Score breakdown
          scores: {
            technical: scoreCalculation.technical,
            financial: scoreCalculation.financial,
            quality: scoreCalculation.quality,
            overall: scoreCalculation.overall,
            weighted: scoreCalculation.weighted
          },
          
          // Statistical measures
          statistics: {
            ...statisticalAnalysis,
            consistency: qualityAssessment.consistency,
            reliability: qualityAssessment.reliability
          },
          
          // Evaluation details
          evaluation: {
            count: evaluations.length,
            evaluators: evaluations.map(e => ({
              id: e.evaluatorId._id,
              name: e.evaluatorId.name,
              role: e.evaluatorId.role,
              scores: e.scores
            })),
            completeness: qualityAssessment.completeness,
            consensus: qualityAssessment.consensus
          },
          
          // Ranking information
          ranking: 0, // Will be set after sorting
          qualification: submission.qualificationStatus || 'pending',
          
          // Risk and compliance
          compliance: {
            documentsComplete: submission.documentsComplete || false,
            qualificationMet: submission.qualificationMet || false,
            technicalCompliance: scoreCalculation.technicalCompliance,
            commercialCompliance: scoreCalculation.commercialCompliance
          },
          
          // Additional metadata
          metadata: {
            submissionDate: submission.submittedAt,
            evaluationPeriod: this._calculateEvaluationPeriod(evaluations),
            lastUpdated: new Date()
          }
        });
      }

      // Sort by overall weighted score descending
      consolidatedResults.sort((a, b) => b.scores.weighted - a.scores.weighted);

      // Assign rankings
      consolidatedResults.forEach((result, index) => {
        result.ranking = index + 1;
      });

      // Generate summary statistics
      const summaryStats = {
        totalSubmissions: consolidatedResults.length,
        qualifiedSubmissions: consolidatedResults.filter(r => r.qualification === 'qualified').length,
        averageScore: consolidatedResults.reduce((sum, r) => sum + r.scores.overall, 0) / consolidatedResults.length,
        scoreRange: {
          highest: Math.max(...consolidatedResults.map(r => r.scores.overall)),
          lowest: Math.min(...consolidatedResults.map(r => r.scores.overall))
        },
        evaluationQuality: this._assessOverallEvaluationQuality(consolidatedResults),
        recommendedAward: consolidatedResults[0] || null
      };

      // Update RFQ status if all evaluations are complete
      if (rfq.status === RFQ_STATUS.CLOSED) {
        rfq.status = RFQ_STATUS.EVALUATED;
        rfq.workflow.currentPhase = 'evaluated';
        rfq.lifecycle.statusHistory.push({
          status: RFQ_STATUS.EVALUATED,
          changedAt: new Date(),
          changedBy: userId || 'system',
          reason: 'Evaluation consolidation completed'
        });
        await rfq.save();
      }

      // Create audit trail
      await auditService.logAuditEvent({
        action: RFQ_EVENTS.EVALUATED,
        entityType: 'rfq',
        entityId: rfq._id,
        userId: userId || 'system',
        metadata: {
          rfqNumber: rfq.rfqNumber,
          consolidatedSubmissions: consolidatedResults.length,
          averageScore: summaryStats.averageScore,
          recommendedVendor: summaryStats.recommendedAward?.vendorId
        }
      });

      logger.info('Evaluations consolidated successfully', { 
        rfqId: rfq._id,
        submissionCount: consolidatedResults.length,
        averageScore: summaryStats.averageScore 
      });

      return {
        success: true,
        message: 'Evaluations consolidated successfully',
        consolidatedResults,
        summary: summaryStats,
        consolidatedAt: new Date(),
        consolidatedBy: userId
      };

    } catch (error) {
      logger.error('Error consolidating evaluations', { 
        error: error.message, 
        rfqId 
      });
      throw new Error(`Evaluation consolidation failed: ${error.message}`);
    }
  }

  /**
   * Get ranked submissions (enhanced legacy method)
   */
  static async getRankedSubmissions(rfqId, userId = null, rankingOptions = {}) {
    try {
      const consolidationResult = await this.consolidateEvaluations(rfqId, userId, rankingOptions);
      
      if (!consolidationResult.success) {
        throw new Error('Failed to consolidate evaluations for ranking');
      }

      // Apply additional ranking criteria if specified
      let rankedSubmissions = consolidationResult.consolidatedResults;

      if (rankingOptions.applyPreferences) {
        rankedSubmissions = await this._applyRankingPreferences(rankedSubmissions, rankingOptions.preferences);
      }

      if (rankingOptions.includeRecommendations) {
        rankedSubmissions = await this._generateRankingRecommendations(rankedSubmissions, rfqId);
      }

      return {
        success: true,
        rankedSubmissions,
        ranking: {
          method: rankingOptions.method || 'weighted_score',
          criteria: rankingOptions.criteria || 'standard',
          preferences: rankingOptions.preferences || {},
          generatedAt: new Date()
        },
        summary: consolidationResult.summary
      };

    } catch (error) {
      logger.error('Error getting ranked submissions', { 
        error: error.message, 
        rfqId 
      });
      throw new Error(`Ranking retrieval failed: ${error.message}`);
    }
  }

  /**
   * Validate RFQ closure (enhanced legacy method)
   */
  static async validateRFQClosure(rfqId) {
    try {
      const rfq = await RFQ.findById(rfqId);
      if (!rfq) {
        return { valid: false, message: 'RFQ not found' };
      }

      const submissions = await Submission.find({ rfqId: rfq._id });
      const validationIssues = [];

      // Check submission count
      if (submissions.length === 0) {
        validationIssues.push('No submissions received');
      }

      // Check if minimum viable submissions received
      const qualifiedSubmissions = submissions.filter(s => s.status === 'qualified');
      if (qualifiedSubmissions.length < 1) {
        validationIssues.push('No qualified submissions received');
      }

      // Check timeline compliance
      const now = new Date();
      if (rfq.timeline.submissionDeadline > now) {
        validationIssues.push('Submission deadline has not passed');
      }

      // Check for pending clarifications
      const pendingClarifications = await this._getPendingClarifications(rfqId);
      if (pendingClarifications.length > 0) {
        validationIssues.push(`${pendingClarifications.length} pending clarifications`);
      }

      // Check evaluation readiness
      const evaluationReadiness = await this._checkEvaluationReadiness(rfq, submissions);
      if (!evaluationReadiness.ready) {
        validationIssues.push(...evaluationReadiness.issues);
      }

      return {
        valid: validationIssues.length === 0,
        message: validationIssues.length > 0 ? validationIssues.join('; ') : 'RFQ ready for closure',
        issues: validationIssues,
        submissionCount: submissions.length,
        qualifiedSubmissions: qualifiedSubmissions.length,
        validationDate: new Date()
      };

    } catch (error) {
      logger.error('Error validating RFQ closure', { 
        error: error.message, 
        rfqId 
      });
      return { 
        valid: false, 
        message: `Validation error: ${error.message}`,
        issues: [`Validation error: ${error.message}`]
      };
    }
  }

  // Helper methods for complex operations
  validateRFQTimeline(timeline) {
    if (!timeline.submissionDeadline) {
      throw new Error('Submission deadline is required');
    }

    const now = new Date();
    const submissionDeadline = new Date(timeline.submissionDeadline);

    if (submissionDeadline <= now) {
      throw new Error('Submission deadline must be in the future');
    }

    if (timeline.clarificationDeadline) {
      const clarificationDeadline = new Date(timeline.clarificationDeadline);
      if (clarificationDeadline >= submissionDeadline) {
        throw new Error('Clarification deadline must be before submission deadline');
      }
    }
  }

  calculateCompletionScore(rfqData) {
    let score = 0;
    const weights = {
      title: 5,
      description: 10,
      specifications: 20,
      evaluationCriteria: 15,
      timeline: 15,
      budget: 10,
      technicalRequirements: 15,
      commercialTerms: 10
    };

    if (rfqData.title?.trim()) score += weights.title;
    if (rfqData.description?.trim()) score += weights.description;
    if (rfqData.specifications?.length > 0) score += weights.specifications;
    if (rfqData.evaluationCriteria?.length > 0) score += weights.evaluationCriteria;
    if (rfqData.timeline?.submissionDeadline) score += weights.timeline;
    if (rfqData.budget?.estimatedValue > 0) score += weights.budget;
    if (rfqData.technicalRequirements?.length > 0) score += weights.technicalRequirements;
    if (rfqData.commercialTerms && Object.keys(rfqData.commercialTerms).length > 0) score += weights.commercialTerms;

    return score;
  }

  // Enhanced helper methods (legacy compatible)
  static _groupByStatus(submissions) {
    return submissions.reduce((groups, sub) => {
      const status = sub.status || 'pending';
      groups[status] = (groups[status] || 0) + 1;
      return groups;
    }, {});
  }

  static _calculatePriceRange(submissions) {
    const prices = submissions
      .map(s => parseFloat(s.quotedPrice || s.quoted_price || 0))
      .filter(p => !isNaN(p) && p > 0);

    if (prices.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    const sum = prices.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: sum / prices.length,
      median: this._calculateMedian(prices),
      count: prices.length,
      standardDeviation: this._calculateStandardDeviation(prices, sum / prices.length)
    };
  }

  // Placeholder methods for complex operations
  async validateRFQReadiness(rfq) { return { ready: true, issues: [] }; }
  async identifyEligibleVendors(rfq) { return []; }
  async processRFQAttachments(rfq, attachments, userId) { }
  async setupApprovalWorkflow(rfq, userId) { }
  async sendVendorInvitations(rfq, vendors, userId) { }
  async sendPublicationNotifications(rfq, userId) { }
  async sendRFQClosureNotifications(rfq, submissions, userId) { }
  async sendInternalClosureNotifications(rfq, userId) { }
  _analyzeSubmissionTimeline(submissions, timeline) { return {}; }
  _analyzeGeographicDistribution(submissions) { return {}; }
  _analyzeVendorTypes(submissions) { return {}; }
  _analyzeQualificationStatus(submissions) { return {}; }
  async _analyzeDocumentCompliance(submissions) { return {}; }
  _analyzePriceDistribution(submissions) { return {}; }
  _analyzeCompetitiveness(submissions) { return {}; }
  async _analyzeSubmissionRisks(submissions) { return {}; }
  _groupSubmissionsByDay(submissions) { return {}; }
  _getLastMinuteSubmissions(submissions, deadline) { return []; }
  _calculateAverageSubmissionTime(submissions) { return 0; }
  _calculateSubmissionVelocity(submissions, timeline) { return 0; }
  async _generateVendorAnalysis(submissions) { return {}; }
  async _calculateWeightedScores(evaluations, criteria, options) { return {}; }
  _performStatisticalAnalysis(evaluations) { return {}; }
  _assessEvaluationQuality(evaluations, criteria) { return {}; }
  _calculateEvaluationPeriod(evaluations) { return 0; }
  _assessOverallEvaluationQuality(results) { return 'good'; }
  async _applyRankingPreferences(submissions, preferences) { return submissions; }
  async _generateRankingRecommendations(submissions, rfqId) { return submissions; }
  async _getPendingClarifications(rfqId) { return []; }
  async _checkEvaluationReadiness(rfq, submissions) { return { ready: true, issues: [] }; }
  static _calculateMedian(numbers) { return 0; }
  static _calculateStandardDeviation(numbers, mean) { return 0; }
}

module.exports = RFQService;\n"
