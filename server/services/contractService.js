const mongoose = require('mongoose');
const Contract = require('../db/models/Contract');
const Procurement = require('../db/models/Procurement');
const Award = require('../db/models/Award');
const Supplier = require('../db/models/Supplier');
const User = require('../db/models/User');
const Document = require('../db/models/Document');
const Invoice = require('../db/models/Invoice');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const documentService = require('./documentService');
const auditService = require('./auditService');
const approvalService = require('./approvalService');
const { validateInput, sanitize } = require('../utils/validation');
const { generateSequentialId, formatDate, calculateBusinessDays, formatCurrency } = require('../utils/helpers');
const { generateContractDocument, generateAmendment } = require('../utils/contractGenerator');
const { calculateRisk, assessCompliance } = require('../utils/riskAssessment');

// Constants for contract management
const CONTRACT_STATUS = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PENDING_SIGNATURE: 'pending_signature',
  EXECUTED: 'executed',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  AMENDED: 'amended',
  RENEWED: 'renewed',
  TERMINATED: 'terminated',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

const CONTRACT_TYPES = {
  GOODS: 'goods',
  SERVICES: 'services',
  CONSTRUCTION: 'construction',
  CONSULTANCY: 'consultancy',
  MAINTENANCE: 'maintenance',
  LEASE: 'lease',
  LICENSE: 'license',
  FRAMEWORK: 'framework',
  BLANKET: 'blanket',
  MASTER_SERVICE: 'master_service'
};

const PAYMENT_TERMS = {
  NET_30: 'net_30',
  NET_60: 'net_60',
  NET_90: 'net_90',
  IMMEDIATE: 'immediate',
  ON_DELIVERY: 'on_delivery',
  MILESTONE: 'milestone',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual'
};

const AMENDMENT_TYPES = {
  SCOPE_CHANGE: 'scope_change',
  VALUE_CHANGE: 'value_change',
  TIMELINE_CHANGE: 'timeline_change',
  TERMS_CHANGE: 'terms_change',
  DELIVERABLE_CHANGE: 'deliverable_change',
  PAYMENT_CHANGE: 'payment_change',
  RESOURCE_CHANGE: 'resource_change',
  COMPLIANCE_UPDATE: 'compliance_update'
};

const PERFORMANCE_STATUS = {
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  DELAYED: 'delayed',
  CRITICAL: 'critical',
  COMPLETED: 'completed',
  NON_COMPLIANT: 'non_compliant'
};

const RENEWAL_STATUS = {
  NOT_APPLICABLE: 'not_applicable',
  PENDING_REVIEW: 'pending_review',
  APPROVED_RENEWAL: 'approved_renewal',
  DECLINED_RENEWAL: 'declined_renewal',
  AUTO_RENEWED: 'auto_renewed',
  NEGOTIATING: 'negotiating'
};

class ContractService {
  /**
   * Create contract from award
   */
  static async createContractFromAward(awardId, contractData, userId, requestInfo = {}) {
    try {
      const {
        contractType = CONTRACT_TYPES.SERVICES,
        paymentTerms = PAYMENT_TERMS.NET_30,
        deliveryTerms,
        performanceRequirements = [],
        milestones = [],
        specialConditions = [],
        warrantyClauses = [],
        penaltyClauses = [],
        bonusIncentives = [],
        complianceRequirements = [],
        renewalOptions = null,
        terminationClauses = [],
        disputeResolution = 'arbitration',
        governingLaw = 'local',
        confidentialityLevel = 'standard',
        insuranceRequirements = [],
        securityRequirements = [],
        reportingRequirements = []
      } = contractData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate award
      const award = await Award.findById(awardId)
        .populate('procurementId')
        .populate('supplierId');

      if (!award) {
        throw new Error('Award not found');
      }

      if (award.status !== 'awarded') {
        throw new Error('Award must be in awarded status to create contract');
      }

      // Check if contract already exists for this award
      const existingContract = await Contract.findOne({ awardId: award._id });
      if (existingContract) {
        throw new Error('Contract already exists for this award');
      }

      // Validate user permissions
      const canCreate = await this.canCreateContract(award, userId);
      if (!canCreate.allowed) {
        throw new Error(`Cannot create contract: ${canCreate.reason}`);
      }

      // Generate contract number and details
      const contractNumber = await this.generateContractNumber(award.procurementId.category);
      
      // Calculate contract value and terms
      const contractValue = await this.calculateContractValue(award, milestones);
      const contractDates = await this.calculateContractDates(award, contractData);
      
      // Process and validate contract documents
      const contractDocuments = await this.processContractDocuments(
        award, 
        contractData.documents || [], 
        userId
      );

      // Build contract structure
      const contract = new Contract({
        contractNumber,
        awardId: new mongoose.Types.ObjectId(awardId),
        procurementId: award.procurementId._id,
        supplierId: award.supplierId._id,
        contractType,
        
        // Contract parties
        parties: {
          buyer: {
            organizationId: award.procurementId.organizationId,
            name: award.procurementId.organizationName,
            address: award.procurementId.organizationAddress,
            contactPerson: award.procurementId.contactPerson,
            email: award.procurementId.contactEmail,
            phone: award.procurementId.contactPhone
          },
          supplier: {
            supplierId: award.supplierId._id,
            name: award.supplierId.companyName,
            registrationNumber: award.supplierId.registrationNumber,
            address: award.supplierId.address,
            contactPerson: award.supplierId.contactPerson,
            email: award.supplierId.email,
            phone: award.supplierId.phone,
            taxNumber: award.supplierId.taxNumber
          }
        },

        // Financial details
        financial: {
          totalValue: contractValue.total,
          currency: award.currency || 'USD',
          taxIncluded: award.taxIncluded || false,
          paymentTerms,
          invoiceSchedule: this.generateInvoiceSchedule(milestones, paymentTerms),
          budgetAllocation: contractValue.budgetBreakdown,
          costCenters: award.costCenters || [],
          retentionPercentage: contractData.retentionPercentage || 0,
          advancePayment: contractData.advancePayment || 0,
          contingencyAmount: contractValue.contingency || 0
        },

        // Contract terms
        terms: {
          startDate: contractDates.startDate,
          endDate: contractDates.endDate,
          duration: contractDates.duration,
          deliveryTerms: sanitize(deliveryTerms),
          performanceRequirements: performanceRequirements.map(req => ({
            ...req,
            description: sanitize(req.description)
          })),
          warrantyClauses: warrantyClauses.map(clause => sanitize(clause)),
          penaltyClauses: penaltyClauses.map(clause => ({
            ...clause,
            description: sanitize(clause.description)
          })),
          bonusIncentives: bonusIncentives.map(incentive => ({
            ...incentive,
            description: sanitize(incentive.description)
          })),
          terminationClauses: terminationClauses.map(clause => sanitize(clause)),
          disputeResolution,
          governingLaw,
          confidentialityLevel,
          forcemajeure: contractData.forceMajeureClause || null
        },

        // Deliverables and milestones
        deliverables: {
          items: award.items.map(item => ({
            ...item,
            deliverySchedule: item.deliverySchedule || null,
            acceptanceCriteria: item.acceptanceCriteria || null,
            qualityStandards: item.qualityStandards || []
          })),
          milestones: milestones.map((milestone, index) => ({
            id: index + 1,
            name: sanitize(milestone.name),
            description: sanitize(milestone.description),
            deliverables: milestone.deliverables || [],
            dueDate: new Date(milestone.dueDate),
            paymentPercentage: milestone.paymentPercentage || 0,
            acceptanceCriteria: milestone.acceptanceCriteria || [],
            status: 'pending',
            dependencies: milestone.dependencies || []
          })),
          serviceLevel: contractData.serviceLevelAgreement || null
        },

        // Compliance and requirements
        compliance: {
          requirements: complianceRequirements.map(req => ({
            ...req,
            description: sanitize(req.description)
          })),
          certifications: award.requiredCertifications || [],
          insuranceRequirements: insuranceRequirements.map(ins => ({
            ...ins,
            description: sanitize(ins.description)
          })),
          securityRequirements: securityRequirements.map(sec => ({
            ...sec,
            description: sanitize(sec.description)
          })),
          reportingRequirements: reportingRequirements.map(rep => ({
            ...rep,
            description: sanitize(rep.description)
          })),
          auditRights: contractData.auditRights || false,
          dataProtection: contractData.dataProtectionClause || null
        },

        // Performance tracking
        performance: {
          kpis: contractData.keyPerformanceIndicators || [],
          metrics: [],
          evaluationSchedule: contractData.performanceEvaluationSchedule || null,
          benchmarks: contractData.performanceBenchmarks || [],
          reviewPeriods: this.calculateReviewPeriods(contractDates),
          status: PERFORMANCE_STATUS.ON_TRACK,
          riskScore: 0,
          complianceScore: 100
        },

        // Renewal and extension
        renewal: {
          isRenewable: renewalOptions?.isRenewable || false,
          renewalTerms: renewalOptions?.terms || null,
          renewalOptions: renewalOptions?.options || [],
          autoRenewal: renewalOptions?.autoRenewal || false,
          noticePeriod: renewalOptions?.noticePeriod || 90,
          renewalStatus: RENEWAL_STATUS.NOT_APPLICABLE,
          renewalHistory: []
        },

        // Document management
        documents: {
          contractDocument: null, // Generated after creation
          amendments: [],
          attachments: contractDocuments,
          signatures: [],
          approvals: [],
          certificates: [],
          correspondence: []
        },

        // Workflow and approval
        workflow: {
          approvalChain: await this.buildContractApprovalChain(award, contractValue.total),
          currentStage: 'contract_preparation',
          approvals: [],
          signatures: [],
          notifications: [],
          escalations: []
        },

        // Status and metadata
        status: CONTRACT_STATUS.DRAFT,
        priority: this.calculateContractPriority(contractValue.total, contractType),
        riskLevel: await this.assessContractRisk(award, contractData),
        
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          version: '1.0',
          lastModified: new Date(),
          modifiedBy: userId,
          tags: this.generateContractTags(award, contractType),
          searchKeywords: this.extractContractKeywords(award, contractData),
          externalReferences: contractData.externalReferences || [],
          relatedContracts: [],
          parentContract: contractData.parentContractId || null,
          creationIP: ipAddress,
          creationUserAgent: userAgent
        },

        // Integration data
        integration: {
          erpReference: null,
          financialSystemId: null,
          legalSystemId: null,
          supplierSystemId: award.supplierId.externalId || null,
          projectCodes: award.projectCodes || [],
          costCodes: award.costCodes || []
        }
      });

      await contract.save();

      // Generate contract document
      const contractDocument = await this.generateContractDocument(contract);
      contract.documents.contractDocument = contractDocument.documentId;
      await contract.save();

      // Initialize approval workflow
      await this.initiateContractApproval(contract, userId);

      // Create audit trail
      await auditService.logAuditEvent({
        action: 'contract_created',
        entityType: 'contract',
        entityId: contract._id,
        userId,
        metadata: {
          contractNumber: contract.contractNumber,
          awardId,
          supplierId: award.supplierId._id,
          contractValue: contractValue.total,
          contractType,
          createdFromAward: true,
          ipAddress,
          userAgent
        }
      });

      // Send creation notifications
      await this.sendContractCreationNotifications(contract, award);

      return {
        success: true,
        message: 'Contract created successfully',
        contract: {
          id: contract._id,
          contractNumber: contract.contractNumber,
          status: contract.status,
          totalValue: contract.financial.totalValue,
          supplier: contract.parties.supplier.name,
          startDate: contract.terms.startDate,
          endDate: contract.terms.endDate
        }
      };

    } catch (error) {
      logger.error('Error creating contract from award', { 
        error: error.message, 
        awardId, 
        userId 
      });
      throw new Error(`Contract creation failed: ${error.message}`);
    }
  }

  /**
   * Get contract with full details
   */
  static async getContractById(contractId, userId, includeHistory = false) {
    try {
      if (!mongoose.Types.ObjectId.isValid(contractId)) {
        throw new Error('Invalid contract ID');
      }

      const contract = await Contract.findById(contractId)
        .populate('awardId', 'awardNumber status items totalValue')
        .populate('procurementId', 'procurementNumber title category status')
        .populate('supplierId', 'companyName registrationNumber contactPerson email')
        .populate('documents.contractDocument')
        .populate('workflow.approvals.approver', 'username firstName lastName')
        .lean();

      if (!contract) {
        throw new Error('Contract not found');
      }

      // Check access permissions
      const hasAccess = await this.checkContractAccess(contract, userId);
      if (!hasAccess.allowed) {
        throw new Error(`Access denied: ${hasAccess.reason}`);
      }

      // Get contract history if requested
      let history = [];
      if (includeHistory) {
        history = await this.getContractHistory(contractId);
      }

      // Get performance data
      const performanceData = await this.getContractPerformance(contract);

      // Get financial summary
      const financialSummary = await this.getFinancialSummary(contract);

      // Get upcoming obligations
      const upcomingObligations = await this.getUpcomingObligations(contract);

      // Get user permissions for this contract
      const permissions = await this.getContractPermissions(contract, userId);

      // Calculate contract health score
      const healthScore = await this.calculateContractHealth(contract);

      // Log access
      await auditService.logDataAccess({
        entityType: 'contract',
        entityId: contractId,
        userId,
        action: 'read',
        metadata: { 
          contractNumber: contract.contractNumber,
          includeHistory 
        }
      });

      return {
        ...contract,
        history,
        performance: {
          ...contract.performance,
          ...performanceData,
          healthScore
        },
        financial: {
          ...contract.financial,
          summary: financialSummary
        },
        upcomingObligations,
        permissions,
        computed: {
          daysRemaining: this.calculateDaysRemaining(contract.terms.endDate),
          completionPercentage: this.calculateCompletionPercentage(contract),
          isExpiringSoon: this.isContractExpiringSoon(contract),
          requiresRenewal: this.requiresRenewalDecision(contract),
          hasOverdueMilestones: this.hasOverdueMilestones(contract),
          riskIndicators: await this.getRiskIndicators(contract)
        }
      };

    } catch (error) {
      logger.error('Error getting contract', { 
        error: error.message, 
        contractId, 
        userId 
      });
      throw new Error(`Failed to get contract: ${error.message}`);
    }
  }

  /**
   * List contracts with filtering and pagination
   */
  static async listContracts(filters = {}, pagination = {}, userId) {
    try {
      const {
        status,
        contractType,
        supplierId,
        procurementId,
        priority,
        riskLevel,
        performanceStatus,
        renewalStatus,
        expiringWithinDays,
        valueRange,
        startDate,
        endDate,
        search,
        tags,
        assignedTo
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'metadata.createdAt',
        sortOrder = -1
      } = pagination;

      // Build base query with access controls
      const baseQuery = await this.buildContractAccessQuery(userId);

      // Apply filters
      if (status) {
        if (Array.isArray(status)) {
          baseQuery.status = { $in: status };
        } else {
          baseQuery.status = status;
        }
      }

      if (contractType) baseQuery.contractType = contractType;
      if (supplierId) baseQuery.supplierId = new mongoose.Types.ObjectId(supplierId);
      if (procurementId) baseQuery.procurementId = new mongoose.Types.ObjectId(procurementId);
      if (priority) baseQuery.priority = priority;
      if (riskLevel) baseQuery.riskLevel = riskLevel;
      if (performanceStatus) baseQuery['performance.status'] = performanceStatus;
      if (renewalStatus) baseQuery['renewal.renewalStatus'] = renewalStatus;
      if (assignedTo) baseQuery['workflow.assignedTo'] = new mongoose.Types.ObjectId(assignedTo);
      if (tags && tags.length > 0) baseQuery['metadata.tags'] = { $in: tags };

      // Value range filter
      if (valueRange) {
        baseQuery['financial.totalValue'] = {};
        if (valueRange.min) baseQuery['financial.totalValue'].$gte = valueRange.min;
        if (valueRange.max) baseQuery['financial.totalValue'].$lte = valueRange.max;
      }

      // Date range filters
      if (startDate || endDate) {
        baseQuery['terms.startDate'] = {};
        if (startDate) baseQuery['terms.startDate'].$gte = new Date(startDate);
        if (endDate) baseQuery['terms.startDate'].$lte = new Date(endDate);
      }

      // Expiring contracts filter
      if (expiringWithinDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(expiringWithinDays));
        baseQuery['terms.endDate'] = {
          $gte: new Date(),
          $lte: futureDate
        };
        baseQuery.status = { $in: [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.EXECUTED] };
      }

      // Search functionality
      if (search) {
        baseQuery.$or = [
          { contractNumber: { $regex: search, $options: 'i' } },
          { 'parties.supplier.name': { $regex: search, $options: 'i' } },
          { 'metadata.searchKeywords': { $in: [search.toLowerCase()] } },
          { 'deliverables.items.name': { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder;

      const [contracts, totalCount] = await Promise.all([
        Contract.find(baseQuery)
          .populate('supplierId', 'companyName contactPerson email')
          .populate('procurementId', 'procurementNumber title category')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Contract.countDocuments(baseQuery)
      ]);

      // Enrich contracts with computed fields
      const enrichedContracts = await Promise.all(
        contracts.map(async contract => {
          return {
            ...contract,
            computed: {
              daysRemaining: this.calculateDaysRemaining(contract.terms.endDate),
              completionPercentage: this.calculateCompletionPercentage(contract),
              isExpiringSoon: this.isContractExpiringSoon(contract),
              healthScore: await this.calculateContractHealth(contract),
              nextMilestone: this.getNextMilestone(contract),
              financialStatus: this.getFinancialStatus(contract),
              performanceIndicator: this.getPerformanceIndicator(contract)
            }
          };
        })
      );

      // Calculate pagination
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Generate summary statistics
      const summary = await this.generateContractsSummary(baseQuery);

      // Log list access
      await auditService.logDataAccess({
        entityType: 'contract',
        entityId: null,
        userId,
        action: 'list',
        metadata: {
          filters,
          pagination: { page, limit },
          resultCount: contracts.length,
          totalCount
        }
      });

      return {
        contracts: enrichedContracts,
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
          available: await this.getAvailableContractFilters(userId)
        }
      };

    } catch (error) {
      logger.error('Error listing contracts', { 
        error: error.message, 
        filters, 
        userId 
      });
      throw new Error(`Failed to list contracts: ${error.message}`);
    }
  }

  /**
   * Create contract amendment
   */
  static async createAmendment(contractId, amendmentData, userId, requestInfo = {}) {
    try {
      const {
        amendmentType,
        reason,
        changes = {},
        effectiveDate,
        requiresApproval = true,
        attachments = [],
        justification
      } = amendmentData;

      const { ipAddress, userAgent } = requestInfo;

      // Get original contract
      const contract = await Contract.findById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Validate amendment permissions
      const canAmend = await this.canAmendContract(contract, userId);
      if (!canAmend.allowed) {
        throw new Error(`Cannot amend contract: ${canAmend.reason}`);
      }

      // Generate amendment number
      const amendmentNumber = await this.generateAmendmentNumber(contract.contractNumber);

      // Calculate impact of changes
      const impact = await this.calculateAmendmentImpact(contract, changes);

      // Process amendment documents
      const amendmentDocs = await this.processAmendmentDocuments(attachments, userId);

      // Create amendment
      const amendment = {
        amendmentNumber,
        amendmentType,
        reason: sanitize(reason),
        justification: sanitize(justification),
        changes,
        impact,
        effectiveDate: new Date(effectiveDate),
        createdBy: userId,
        createdAt: new Date(),
        status: requiresApproval ? 'pending_approval' : 'approved',
        documents: amendmentDocs,
        approvals: [],
        metadata: {
          version: contract.metadata.version,
          newVersion: this.incrementVersion(contract.metadata.version),
          creationIP: ipAddress,
          creationUserAgent: userAgent
        }
      };

      // Add to contract
      contract.documents.amendments.push(amendment);
      
      // Update contract if amendment is approved
      if (!requiresApproval) {
        await this.applyAmendmentChanges(contract, amendment);
      }

      await contract.save();

      // Initiate approval process if required
      if (requiresApproval) {
        await this.initiateAmendmentApproval(contract, amendment, userId);
      }

      // Create audit trail
      await auditService.logAuditEvent({
        action: 'contract_amendment_created',
        entityType: 'contract',
        entityId: contractId,
        userId,
        metadata: {
          contractNumber: contract.contractNumber,
          amendmentNumber,
          amendmentType,
          impactLevel: impact.level,
          valueChange: impact.valueChange || 0,
          requiresApproval,
          ipAddress,
          userAgent
        }
      });

      // Send notifications
      await this.sendAmendmentNotifications(contract, amendment);

      return {
        success: true,
        message: requiresApproval ? 
          'Amendment created and sent for approval' : 
          'Amendment created and applied',
        amendment: {
          amendmentNumber,
          status: amendment.status,
          effectiveDate: amendment.effectiveDate,
          impact: impact.summary
        }
      };

    } catch (error) {
      logger.error('Error creating contract amendment', { 
        error: error.message, 
        contractId, 
        userId 
      });
      throw new Error(`Amendment creation failed: ${error.message}`);
    }
  }

  /**
   * Update contract performance
   */
  static async updateContractPerformance(contractId, performanceData, userId, requestInfo = {}) {
    try {
      const {
        milestoneId,
        status,
        completionPercentage,
        actualDeliveryDate,
        qualityScore,
        performanceNotes,
        issues = [],
        risks = [],
        mitigations = []
      } = performanceData;

      const contract = await Contract.findById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Check permissions
      const canUpdate = await this.canUpdatePerformance(contract, userId);
      if (!canUpdate) {
        throw new Error('Insufficient permissions to update contract performance');
      }

      let updatedMilestone = null;
      
      // Update specific milestone if provided
      if (milestoneId) {
        const milestoneIndex = contract.deliverables.milestones.findIndex(
          m => m.id === parseInt(milestoneId)
        );
        
        if (milestoneIndex === -1) {
          throw new Error('Milestone not found');
        }

        const milestone = contract.deliverables.milestones[milestoneIndex];
        
        // Update milestone data
        if (status) milestone.status = status;
        if (completionPercentage !== undefined) milestone.completionPercentage = completionPercentage;
        if (actualDeliveryDate) milestone.actualDeliveryDate = new Date(actualDeliveryDate);
        if (qualityScore !== undefined) milestone.qualityScore = qualityScore;
        if (performanceNotes) milestone.notes = sanitize(performanceNotes);
        
        milestone.lastUpdated = new Date();
        milestone.updatedBy = userId;

        updatedMilestone = milestone;
      }

      // Update contract-level performance metrics
      const performanceUpdate = {
        'performance.lastUpdated': new Date(),
        'performance.updatedBy': userId
      };

      // Add performance issues
      if (issues.length > 0) {
        contract.performance.issues.push(...issues.map(issue => ({
          ...issue,
          description: sanitize(issue.description),
          reportedBy: userId,
          reportedAt: new Date()
        })));
      }

      // Add risks
      if (risks.length > 0) {
        contract.performance.risks.push(...risks.map(risk => ({
          ...risk,
          description: sanitize(risk.description),
          identifiedBy: userId,
          identifiedAt: new Date()
        })));
      }

      // Add mitigations
      if (mitigations.length > 0) {
        contract.performance.mitigations.push(...mitigations.map(mitigation => ({
          ...mitigation,
          description: sanitize(mitigation.description),
          implementedBy: userId,
          implementedAt: new Date()
        })));
      }

      // Recalculate performance scores
      const updatedPerformance = await this.recalculatePerformanceScores(contract);
      Object.assign(performanceUpdate, updatedPerformance);

      await Contract.findByIdAndUpdate(contractId, { $set: performanceUpdate });

      // Log performance update
      await auditService.logAuditEvent({
        action: 'contract_performance_updated',
        entityType: 'contract',
        entityId: contractId,
        userId,
        metadata: {
          contractNumber: contract.contractNumber,
          milestoneId,
          performanceChanges: {
            status,
            completionPercentage,
            qualityScore,
            issuesAdded: issues.length,
            risksAdded: risks.length,
            mitigationsAdded: mitigations.length
          }
        }
      });

      // Send performance notifications if significant changes
      if (this.isSignificantPerformanceChange(performanceData)) {
        await this.sendPerformanceNotifications(contract, performanceData, userId);
      }

      return {
        success: true,
        message: 'Contract performance updated successfully',
        performance: {
          milestoneUpdated: updatedMilestone,
          overallScore: updatedPerformance['performance.complianceScore'],
          riskScore: updatedPerformance['performance.riskScore'],
          lastUpdated: new Date()
        }
      };

    } catch (error) {
      logger.error('Error updating contract performance', { 
        error: error.message, 
        contractId, 
        userId 
      });
      throw new Error(`Performance update failed: ${error.message}`);
    }
  }

  /**
   * Generate contract reports
   */
  static async generateContractReport(reportType, filters = {}, userId) {
    try {
      const reportId = generateSequentialId('CRPT');
      let reportData;

      switch (reportType) {
        case 'summary':
          reportData = await this.generateContractSummaryReport(filters);
          break;

        case 'performance':
          reportData = await this.generatePerformanceReport(filters);
          break;

        case 'financial':
          reportData = await this.generateFinancialReport(filters);
          break;

        case 'compliance':
          reportData = await this.generateComplianceReport(filters);
          break;

        case 'expiring':
          reportData = await this.generateExpiringContractsReport(filters);
          break;

        case 'amendments':
          reportData = await this.generateAmendmentsReport(filters);
          break;

        case 'risk_assessment':
          reportData = await this.generateRiskAssessmentReport(filters);
          break;

        case 'supplier_performance':
          reportData = await this.generateSupplierPerformanceReport(filters);
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Log report generation
      await auditService.logAuditEvent({
        action: 'contract_report_generated',
        entityType: 'contract',
        entityId: null,
        userId,
        metadata: {
          reportId,
          reportType,
          filters,
          recordCount: reportData.recordCount || 0
        }
      });

      return {
        reportId,
        reportType,
        generatedAt: new Date(),
        generatedBy: userId,
        data: reportData,
        summary: {
          totalRecords: reportData.recordCount || 0,
          reportPeriod: this.getReportPeriod(filters),
          generationTime: new Date()
        }
      };

    } catch (error) {
      logger.error('Error generating contract report', { 
        error: error.message, 
        reportType, 
        userId 
      });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  // Helper methods for contract management
  static async generateContractNumber(category) {
    const year = new Date().getFullYear();
    const prefix = `CT-${category.toUpperCase()}-${year}`;
    
    const lastContract = await Contract.findOne({
      contractNumber: { $regex: `^${prefix}` }
    }).sort({ contractNumber: -1 });

    let sequence = 1;
    if (lastContract) {
      const lastSequence = parseInt(lastContract.contractNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  static async calculateContractValue(award, milestones) {
    const baseValue = award.totalValue;
    const contingency = baseValue * 0.1; // 10% contingency
    
    return {
      total: baseValue,
      base: baseValue,
      contingency,
      budgetBreakdown: award.budgetBreakdown || {}
    };
  }

  static async calculateContractDates(award, contractData) {
    const startDate = contractData.startDate ? 
      new Date(contractData.startDate) : 
      new Date();

    const durationDays = contractData.durationDays || 
      award.deliveryPeriod || 
      90;

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    return {
      startDate,
      endDate,
      duration: `${durationDays} days`
    };
  }

  static calculateContractPriority(value, type) {
    if (value > 1000000) return 'high';
    if (value > 100000) return 'medium';
    return 'low';
  }

  static async assessContractRisk(award, contractData) {
    // Simplified risk assessment
    let riskScore = 0;
    
    if (award.totalValue > 1000000) riskScore += 2;
    if (contractData.contractType === CONTRACT_TYPES.CONSTRUCTION) riskScore += 2;
    if (award.supplierId.riskRating === 'high') riskScore += 3;
    
    if (riskScore <= 2) return 'low';
    if (riskScore <= 5) return 'medium';
    return 'high';
  }

  static generateContractTags(award, contractType) {
    return [
      contractType,
      award.procurementId.category,
      award.supplierId.category || 'supplier',
      'contract'
    ];
  }

  static extractContractKeywords(award, contractData) {
    const text = `${award.procurementId.title} ${contractData.deliveryTerms || ''} ${contractData.specialConditions?.join(' ') || ''}`;
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    return [...new Set(words)].slice(0, 20);
  }

  static calculateDaysRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  static calculateCompletionPercentage(contract) {
    const milestones = contract.deliverables?.milestones || [];
    if (milestones.length === 0) return 0;
    
    const completed = milestones.filter(m => m.status === 'completed').length;
    return Math.round((completed / milestones.length) * 100);
  }

  static isContractExpiringSoon(contract, days = 30) {
    const remaining = this.calculateDaysRemaining(contract.terms.endDate);
    return remaining <= days && remaining > 0;
  }

  static requiresRenewalDecision(contract) {
    if (!contract.renewal.isRenewable) return false;
    
    const noticeDays = contract.renewal.noticePeriod || 90;
    const remaining = this.calculateDaysRemaining(contract.terms.endDate);
    
    return remaining <= noticeDays && contract.renewal.renewalStatus === RENEWAL_STATUS.PENDING_REVIEW;
  }

  static hasOverdueMilestones(contract) {
    const now = new Date();
    return contract.deliverables.milestones.some(milestone => 
      milestone.dueDate < now && milestone.status !== 'completed'
    );
  }

  static getNextMilestone(contract) {
    const pending = contract.deliverables.milestones
      .filter(m => m.status === 'pending' || m.status === 'in_progress')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    return pending[0] || null;
  }

  static getFinancialStatus(contract) {
    // Simplified financial status calculation
    return {
      totalBudget: contract.financial.totalValue,
      spent: 0, // Would be calculated from invoices
      remaining: contract.financial.totalValue,
      utilizationPercentage: 0
    };
  }

  static getPerformanceIndicator(contract) {
    const health = contract.performance?.healthScore || 0;
    if (health >= 80) return 'excellent';
    if (health >= 60) return 'good';
    if (health >= 40) return 'fair';
    return 'poor';
  }

  // Placeholder methods for complex operations
  static async canCreateContract(award, userId) { return { allowed: true }; }
  static async processContractDocuments(award, documents, userId) { return documents; }
  static generateInvoiceSchedule(milestones, paymentTerms) { return []; }
  static calculateReviewPeriods(contractDates) { return []; }
  static async buildContractApprovalChain(award, value) { return []; }
  static async generateContractDocument(contract) { return { documentId: null }; }
  static async initiateContractApproval(contract, userId) { }
  static async checkContractAccess(contract, userId) { return { allowed: true }; }
  static async getContractHistory(contractId) { return []; }
  static async getContractPerformance(contract) { return {}; }
  static async getFinancialSummary(contract) { return {}; }
  static async getUpcomingObligations(contract) { return []; }
  static async getContractPermissions(contract, userId) { return {}; }
  static async calculateContractHealth(contract) { return 75; }
  static async getRiskIndicators(contract) { return []; }
  static async buildContractAccessQuery(userId) { return {}; }
  static async generateContractsSummary(query) { return {}; }
  static async getAvailableContractFilters(userId) { return {}; }
  static async canAmendContract(contract, userId) { return { allowed: true }; }
  static async generateAmendmentNumber(contractNumber) { return `${contractNumber}-A01`; }
  static async calculateAmendmentImpact(contract, changes) { return { level: 'medium' }; }
  static async processAmendmentDocuments(attachments, userId) { return attachments; }
  static incrementVersion(version) { 
    const [major, minor] = version.split('.');
    return `${major}.${parseInt(minor) + 1}`;
  }
  static async applyAmendmentChanges(contract, amendment) { }
  static async initiateAmendmentApproval(contract, amendment, userId) { }
  static async canUpdatePerformance(contract, userId) { return true; }
  static async recalculatePerformanceScores(contract) { return {}; }
  static isSignificantPerformanceChange(data) { return false; }

  // Notification methods
  static async sendContractCreationNotifications(contract, award) { }
  static async sendAmendmentNotifications(contract, amendment) { }
  static async sendPerformanceNotifications(contract, performanceData, userId) { }

  // Report generation methods
  static async generateContractSummaryReport(filters) { return { recordCount: 0 }; }
  static async generatePerformanceReport(filters) { return { recordCount: 0 }; }
  static async generateFinancialReport(filters) { return { recordCount: 0 }; }
  static async generateComplianceReport(filters) { return { recordCount: 0 }; }
  static async generateExpiringContractsReport(filters) { return { recordCount: 0 }; }
  static async generateAmendmentsReport(filters) { return { recordCount: 0 }; }
  static async generateRiskAssessmentReport(filters) { return { recordCount: 0 }; }
  static async generateSupplierPerformanceReport(filters) { return { recordCount: 0 }; }

  static getReportPeriod(filters) {
    if (filters.startDate && filters.endDate) {
      return `${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}`;
    }
    return 'All time';
  }
}

module.exports = ContractService;
