const mongoose = require('mongoose');
const Award = require('../db/models/Award');
const Procurement = require('../db/models/Procurement');
const Supplier = require('../db/models/Supplier');
const Contract = require('../db/models/Contract');
const Evaluation = require('../db/models/Evaluation');
const User = require('../db/models/User');
const Document = require('../db/models/Document');
const AuditLog = require('../db/models/AuditLog');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const documentService = require('./documentService');
const contractService = require('./contractService');
const auditService = require('./auditService');
const approvalService = require('./approvalService');
const { validateInput, sanitize } = require('../utils/validation');
const { generateReportId, formatCurrency, calculatePercentage } = require('../utils/helpers');

// Constants for award management
const AWARD_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  AWARDED: 'awarded',
  CONTRACT_GENERATED: 'contract_generated',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

const AWARD_TYPES = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
  FRAMEWORK: 'framework',
  LOT_BASED: 'lot_based',
  PHASED: 'phased'
};

const EVALUATION_CRITERIA = {
  PRICE: 'price',
  QUALITY: 'quality',
  TECHNICAL: 'technical',
  DELIVERY: 'delivery',
  EXPERIENCE: 'experience',
  COMPLIANCE: 'compliance',
  SUSTAINABILITY: 'sustainability',
  INNOVATION: 'innovation'
};

const AWARD_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
  EMERGENCY: 'emergency'
};

const DISPUTE_STATUS = {
  FILED: 'filed',
  UNDER_REVIEW: 'under_review',
  MEDIATION: 'mediation',
  RESOLVED: 'resolved',
  UPHELD: 'upheld',
  DISMISSED: 'dismissed'
};

const CONTRACT_TYPES = {
  FIXED_PRICE: 'fixed_price',
  TIME_AND_MATERIALS: 'time_and_materials',
  COST_PLUS: 'cost_plus',
  FRAMEWORK_AGREEMENT: 'framework_agreement',
  BLANKET_ORDER: 'blanket_order'
};

class AwardService {
  /**
   * Create new award
   */
  static async createAward(awardData, userId, requestInfo = {}) {
    try {
      const {
        procurementId,
        type = AWARD_TYPES.SINGLE,
        evaluationId,
        selectedSuppliers,
        awardCriteria,
        totalValue,
        currency = 'USD',
        expectedDeliveryDate,
        contractType = CONTRACT_TYPES.FIXED_PRICE,
        terms,
        conditions,
        notes,
        attachments = [],
        priority = AWARD_PRIORITY.MEDIUM
      } = awardData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!procurementId || !selectedSuppliers || selectedSuppliers.length === 0) {
        throw new Error('Procurement ID and selected suppliers are required');
      }

      // Validate procurement exists and is ready for award
      const procurement = await Procurement.findById(procurementId);
      if (!procurement) {
        throw new Error('Procurement not found');
      }

      if (!['evaluation_completed', 'ready_for_award'].includes(procurement.status)) {
        throw new Error('Procurement is not ready for award');
      }

      // Validate evaluation if provided
      let evaluation = null;
      if (evaluationId) {
        evaluation = await Evaluation.findById(evaluationId);
        if (!evaluation) {
          throw new Error('Evaluation not found');
        }
      }

      // Validate selected suppliers
      const suppliers = await Supplier.find({
        _id: { $in: selectedSuppliers.map(s => s.supplierId) }
      });

      if (suppliers.length !== selectedSuppliers.length) {
        throw new Error('One or more selected suppliers not found');
      }

      // Generate award number
      const awardNumber = await this.generateAwardNumber();

      // Calculate award details
      const awardDetails = await this.calculateAwardDetails(selectedSuppliers, awardCriteria, evaluation);

      // Create award document
      const award = new Award({
        awardNumber,
        procurementId: new mongoose.Types.ObjectId(procurementId),
        evaluationId: evaluationId ? new mongoose.Types.ObjectId(evaluationId) : null,
        type,
        status: AWARD_STATUS.DRAFT,
        priority,
        awardDetails: {
          selectedSuppliers: selectedSuppliers.map(supplier => ({
            supplierId: new mongoose.Types.ObjectId(supplier.supplierId),
            supplierName: suppliers.find(s => s._id.toString() === supplier.supplierId).name,
            awardedValue: supplier.awardedValue,
            awardedQuantity: supplier.awardedQuantity,
            percentage: supplier.percentage || 0,
            lotNumbers: supplier.lotNumbers || [],
            deliveryTerms: supplier.deliveryTerms,
            paymentTerms: supplier.paymentTerms,
            evaluationScore: supplier.evaluationScore,
            ranking: supplier.ranking,
            awardReason: supplier.awardReason
          })),
          totalValue,
          currency,
          averageScore: awardDetails.averageScore,
          winningCriteria: awardDetails.winningCriteria,
          competitionMetrics: awardDetails.competitionMetrics
        },
        contractDetails: {
          type: contractType,
          expectedStartDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          expectedEndDate: this.calculateContractEndDate(expectedDeliveryDate, procurement.duration),
          terms: sanitize(terms),
          conditions: sanitize(conditions),
          deliverables: procurement.requirements?.deliverables || [],
          performanceKPIs: procurement.requirements?.performanceKPIs || [],
          penaltyClauses: procurement.requirements?.penaltyClauses || []
        },
        approvalChain: await this.buildAwardApprovalChain(totalValue, procurement.department, procurement.category),
        compliance: {
          regulatoryCompliance: await this.checkRegulatoryCompliance(procurement, selectedSuppliers),
          internalPolicies: await this.checkInternalPolicies(totalValue, type, selectedSuppliers),
          ethicsReview: await this.performEthicsReview(selectedSuppliers),
          conflictOfInterest: await this.checkConflictOfInterest(selectedSuppliers, userId)
        },
        timeline: {
          awardNotificationDate: new Date(),
          challengePeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
          expectedContractSigningDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          expectedDeliveryStart: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null
        },
        metadata: {
          notes: sanitize(notes),
          attachments: attachments.map(att => ({
            documentId: att.documentId,
            filename: att.filename,
            type: att.type || 'supporting_document',
            uploadedBy: userId,
            uploadedAt: new Date()
          })),
          createdBy: new mongoose.Types.ObjectId(userId),
          createdAt: new Date(),
          createdIP: ipAddress,
          createdUserAgent: userAgent
        }
      });

      await award.save();

      // Update procurement status
      await Procurement.findByIdAndUpdate(procurementId, {
        $set: {
          status: 'awarded',
          awardId: award._id,
          awardedAt: new Date(),
          awardedBy: userId
        }
      });

      // Create approval workflow if required
      if (award.approvalChain.length > 0) {
        await this.initiateApprovalWorkflow(award._id, userId);
      }

      // Log audit event
      await auditService.logAuditEvent({
        action: 'award_created',
        entityType: 'award',
        entityId: award._id,
        userId,
        metadata: {
          awardNumber: award.awardNumber,
          procurementId,
          totalValue,
          suppliersCount: selectedSuppliers.length,
          type,
          ipAddress,
          userAgent
        }
      });

      // Send notifications to stakeholders
      await this.sendAwardCreatedNotifications(award, procurement);

      return {
        success: true,
        message: 'Award created successfully',
        award: {
          id: award._id,
          awardNumber: award.awardNumber,
          status: award.status,
          totalValue: award.awardDetails.totalValue,
          currency: award.awardDetails.currency,
          suppliersCount: selectedSuppliers.length,
          requiresApproval: award.approvalChain.length > 0
        }
      };

    } catch (error) {
      logger.error('Error creating award', { error: error.message, awardData, userId });
      throw new Error(`Award creation failed: ${error.message}`);
    }
  }

  /**
   * Get award by ID with full details
   */
  static async getAwardById(awardId, userId, includeHistory = false) {
    try {
      if (!mongoose.Types.ObjectId.isValid(awardId)) {
        throw new Error('Invalid award ID');
      }

      const award = await Award.findById(awardId)
        .populate('procurementId', 'procurementNumber title category department requirements')
        .populate('evaluationId', 'evaluationNumber scores recommendations')
        .populate('awardDetails.selectedSuppliers.supplierId', 'name contactInfo registration capabilities')
        .populate('approvalChain.approvers', 'username firstName lastName email department')
        .populate('metadata.createdBy', 'username firstName lastName')
        .lean();

      if (!award) {
        throw new Error('Award not found');
      }

      // Check user access permissions
      const hasAccess = await this.checkAwardAccess(award, userId);
      if (!hasAccess) {
        throw new Error('Insufficient permissions to access this award');
      }

      let awardHistory = [];
      if (includeHistory) {
        awardHistory = await this.getAwardHistory(awardId);
      }

      // Get related contracts if any
      const contracts = await Contract.find({ awardId }).select('contractNumber status value signedDate');

      // Get dispute information if any
      const disputes = await this.getAwardDisputes(awardId);

      // Log access event
      await auditService.logDataAccess({
        entityType: 'award',
        entityId: awardId,
        userId,
        action: 'read',
        metadata: { includeHistory }
      });

      return {
        ...award,
        history: awardHistory,
        contracts: contracts || [],
        disputes: disputes || [],
        permissions: {
          canEdit: await this.canEditAward(award, userId),
          canApprove: await this.canApproveAward(award, userId),
          canDispute: await this.canDisputeAward(award, userId),
          canGenerateContract: await this.canGenerateContract(award, userId)
        }
      };

    } catch (error) {
      logger.error('Error getting award', { error: error.message, awardId, userId });
      throw new Error(`Failed to get award: ${error.message}`);
    }
  }

  /**
   * List awards with filtering and pagination
   */
  static async listAwards(filters = {}, pagination = {}, userId) {
    try {
      const {
        status,
        type,
        procurementId,
        supplierId,
        department,
        category,
        priority,
        startDate,
        endDate,
        minValue,
        maxValue,
        currency,
        search
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = pagination;

      // Build filter query
      const filterQuery = {};

      if (status) {
        if (Array.isArray(status)) {
          filterQuery.status = { $in: status };
        } else {
          filterQuery.status = status;
        }
      }

      if (type) filterQuery.type = type;
      if (procurementId) filterQuery.procurementId = new mongoose.Types.ObjectId(procurementId);
      if (priority) filterQuery.priority = priority;

      if (supplierId) {
        filterQuery['awardDetails.selectedSuppliers.supplierId'] = new mongoose.Types.ObjectId(supplierId);
      }

      if (startDate || endDate) {
        filterQuery.createdAt = {};
        if (startDate) filterQuery.createdAt.$gte = new Date(startDate);
        if (endDate) filterQuery.createdAt.$lte = new Date(endDate);
      }

      if (minValue || maxValue) {
        filterQuery['awardDetails.totalValue'] = {};
        if (minValue) filterQuery['awardDetails.totalValue'].$gte = minValue;
        if (maxValue) filterQuery['awardDetails.totalValue'].$lte = maxValue;
      }

      if (currency) filterQuery['awardDetails.currency'] = currency;

      // Add user access restrictions
      const userAccessFilter = await this.getUserAccessFilter(userId);
      Object.assign(filterQuery, userAccessFilter);

      // Add search functionality
      if (search) {
        filterQuery.$or = [
          { awardNumber: { $regex: search, $options: 'i' } },
          { 'awardDetails.selectedSuppliers.supplierName': { $regex: search, $options: 'i' } },
          { 'metadata.notes': { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder };

      const [awards, totalCount] = await Promise.all([
        Award.find(filterQuery)
          .populate('procurementId', 'procurementNumber title category department')
          .populate('awardDetails.selectedSuppliers.supplierId', 'name registration.status')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Award.countDocuments(filterQuery)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Add summary statistics
      const summary = await this.getAwardsSummary(filterQuery);

      // Log list access
      await auditService.logDataAccess({
        entityType: 'award',
        entityId: null,
        userId,
        action: 'list',
        metadata: {
          filters,
          pagination: { page, limit },
          resultCount: awards.length,
          totalCount
        }
      });

      return {
        awards,
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
          available: await this.getAvailableFilters(userId)
        }
      };

    } catch (error) {
      logger.error('Error listing awards', { error: error.message, filters, userId });
      throw new Error(`Failed to list awards: ${error.message}`);
    }
  }

  /**
   * Update award
   */
  static async updateAward(awardId, updateData, userId, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      if (!mongoose.Types.ObjectId.isValid(awardId)) {
        throw new Error('Invalid award ID');
      }

      // Get existing award
      const existingAward = await Award.findById(awardId);
      if (!existingAward) {
        throw new Error('Award not found');
      }

      // Check permissions
      const canEdit = await this.canEditAward(existingAward, userId);
      if (!canEdit) {
        throw new Error('Insufficient permissions to update this award');
      }

      // Validate update based on current status
      await this.validateAwardUpdate(existingAward, updateData, userId);

      // Prepare update data
      const sanitizedUpdate = this.sanitizeUpdateData(updateData);
      
      // Add update metadata
      sanitizedUpdate.$push = {
        'metadata.updateHistory': {
          updatedBy: new mongoose.Types.ObjectId(userId),
          updatedAt: new Date(),
          updatedIP: ipAddress,
          updatedUserAgent: userAgent,
          changes: this.calculateChanges(existingAward, updateData),
          reason: sanitize(updateData.updateReason)
        }
      };

      // Update award
      const updatedAward = await Award.findByIdAndUpdate(
        awardId,
        sanitizedUpdate,
        { new: true, runValidators: true }
      ).populate('procurementId awardDetails.selectedSuppliers.supplierId');

      // Handle status changes
      if (updateData.status && updateData.status !== existingAward.status) {
        await this.handleStatusChange(updatedAward, existingAward.status, userId);
      }

      // Recalculate approval chain if award details changed
      if (updateData.awardDetails) {
        const newApprovalChain = await this.buildAwardApprovalChain(
          updatedAward.awardDetails.totalValue,
          updatedAward.procurementId.department,
          updatedAward.procurementId.category
        );
        
        if (JSON.stringify(newApprovalChain) !== JSON.stringify(existingAward.approvalChain)) {
          updatedAward.approvalChain = newApprovalChain;
          await updatedAward.save();
        }
      }

      // Log audit event
      await auditService.logAuditEvent({
        action: 'award_updated',
        entityType: 'award',
        entityId: awardId,
        userId,
        metadata: {
          awardNumber: existingAward.awardNumber,
          changes: this.calculateChanges(existingAward, updateData),
          statusChanged: updateData.status !== existingAward.status,
          ipAddress,
          userAgent
        }
      });

      // Send notifications for significant changes
      await this.sendAwardUpdateNotifications(updatedAward, existingAward, userId);

      return {
        success: true,
        message: 'Award updated successfully',
        award: updatedAward
      };

    } catch (error) {
      logger.error('Error updating award', { error: error.message, awardId, userId });
      throw new Error(`Award update failed: ${error.message}`);
    }
  }

  /**
   * Submit award for approval
   */
  static async submitForApproval(awardId, userId, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      const award = await Award.findById(awardId);
      if (!award) {
        throw new Error('Award not found');
      }

      // Validate current status
      if (award.status !== AWARD_STATUS.DRAFT) {
        throw new Error('Award must be in draft status to submit for approval');
      }

      // Check permissions
      const canSubmit = await this.canSubmitForApproval(award, userId);
      if (!canSubmit) {
        throw new Error('Insufficient permissions to submit this award for approval');
      }

      // Validate award completeness
      const validationResult = await this.validateAwardCompleteness(award);
      if (!validationResult.isValid) {
        throw new Error(`Award validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Update award status
      await Award.findByIdAndUpdate(awardId, {
        $set: {
          status: AWARD_STATUS.PENDING_APPROVAL,
          'timeline.submittedForApproval': new Date(),
          'metadata.submittedBy': userId,
          'metadata.submittedAt': new Date()
        }
      });

      // Initiate approval workflow
      const approvalWorkflow = await approvalService.createApprovalWorkflow({
        entityType: 'award',
        entityId: awardId,
        approvalChain: award.approvalChain,
        requestedBy: userId,
        urgency: award.priority === AWARD_PRIORITY.CRITICAL ? 'urgent' : 'normal',
        metadata: {
          awardNumber: award.awardNumber,
          totalValue: award.awardDetails.totalValue,
          suppliersCount: award.awardDetails.selectedSuppliers.length
        }
      }, { ipAddress, userAgent });

      // Log audit event
      await auditService.logAuditEvent({
        action: 'award_submitted_for_approval',
        entityType: 'award',
        entityId: awardId,
        userId,
        metadata: {
          awardNumber: award.awardNumber,
          approvalWorkflowId: approvalWorkflow.workflowId,
          approversCount: award.approvalChain.length,
          ipAddress,
          userAgent
        }
      });

      // Send notifications to approvers
      await this.sendApprovalRequestNotifications(award, approvalWorkflow);

      return {
        success: true,
        message: 'Award submitted for approval successfully',
        approvalWorkflow: {
          workflowId: approvalWorkflow.workflowId,
          approversCount: award.approvalChain.length,
          estimatedCompletionTime: this.calculateEstimatedApprovalTime(award.approvalChain)
        }
      };

    } catch (error) {
      logger.error('Error submitting award for approval', { error: error.message, awardId, userId });
      throw new Error(`Failed to submit award for approval: ${error.message}`);
    }
  }

  /**
   * Process award approval
   */
  static async processApproval(awardId, approvalDecision, userId, requestInfo = {}) {
    try {
      const { decision, comments, conditions } = approvalDecision;
      const { ipAddress, userAgent } = requestInfo;

      const award = await Award.findById(awardId);
      if (!award) {
        throw new Error('Award not found');
      }

      // Validate approval permissions
      const canApprove = await this.canApproveAward(award, userId);
      if (!canApprove) {
        throw new Error('Insufficient permissions to approve this award');
      }

      // Process through approval service
      const approvalResult = await approvalService.processApproval({
        entityType: 'award',
        entityId: awardId,
        approverId: userId,
        decision,
        comments: sanitize(comments),
        conditions: conditions?.map(c => sanitize(c)),
        metadata: {
          awardNumber: award.awardNumber,
          totalValue: award.awardDetails.totalValue
        }
      }, { ipAddress, userAgent });

      let newStatus = award.status;
      if (approvalResult.workflowComplete) {
        newStatus = approvalResult.finalDecision === 'approved' 
          ? AWARD_STATUS.APPROVED 
          : AWARD_STATUS.DRAFT;
      }

      // Update award status if workflow is complete
      if (newStatus !== award.status) {
        await Award.findByIdAndUpdate(awardId, {
          $set: {
            status: newStatus,
            'approval.completedAt': new Date(),
            'approval.finalDecision': approvalResult.finalDecision,
            'approval.conditions': conditions || []
          }
        });

        // Handle post-approval actions
        if (newStatus === AWARD_STATUS.APPROVED) {
          await this.handleAwardApproval(award, userId);
        }
      }

      // Log audit event
      await auditService.logAuditEvent({
        action: `award_${decision}`,
        entityType: 'award',
        entityId: awardId,
        userId,
        metadata: {
          awardNumber: award.awardNumber,
          approvalLevel: approvalResult.currentLevel,
          workflowComplete: approvalResult.workflowComplete,
          finalDecision: approvalResult.finalDecision,
          comments,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: `Award ${decision} processed successfully`,
        approvalStatus: {
          workflowComplete: approvalResult.workflowComplete,
          finalDecision: approvalResult.finalDecision,
          currentLevel: approvalResult.currentLevel,
          newStatus
        }
      };

    } catch (error) {
      logger.error('Error processing award approval', { error: error.message, awardId, userId });
      throw new Error(`Failed to process award approval: ${error.message}`);
    }
  }

  /**
   * Generate contract from award
   */
  static async generateContract(awardId, contractData, userId, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      const award = await Award.findById(awardId)
        .populate('procurementId')
        .populate('awardDetails.selectedSuppliers.supplierId');

      if (!award) {
        throw new Error('Award not found');
      }

      // Validate award status
      if (award.status !== AWARD_STATUS.APPROVED) {
        throw new Error('Award must be approved before generating contract');
      }

      // Check permissions
      const canGenerate = await this.canGenerateContract(award, userId);
      if (!canGenerate) {
        throw new Error('Insufficient permissions to generate contract');
      }

      // Generate contracts for each awarded supplier
      const contracts = [];
      for (const supplierAward of award.awardDetails.selectedSuppliers) {
        const contractInput = {
          awardId: award._id,
          procurementId: award.procurementId._id,
          supplierId: supplierAward.supplierId._id,
          contractType: award.contractDetails.type,
          value: supplierAward.awardedValue,
          currency: award.awardDetails.currency,
          terms: award.contractDetails.terms,
          conditions: award.contractDetails.conditions,
          deliverables: award.contractDetails.deliverables,
          performanceKPIs: award.contractDetails.performanceKPIs,
          startDate: award.contractDetails.expectedStartDate,
          endDate: award.contractDetails.expectedEndDate,
          ...contractData
        };

        const contract = await contractService.createContract(contractInput, userId, { ipAddress, userAgent });
        contracts.push(contract);
      }

      // Update award status
      await Award.findByIdAndUpdate(awardId, {
        $set: {
          status: AWARD_STATUS.CONTRACT_GENERATED,
          'contractGeneration.generatedAt': new Date(),
          'contractGeneration.generatedBy': userId,
          'contractGeneration.contractIds': contracts.map(c => c.contract.id)
        }
      });

      // Log audit event
      await auditService.logAuditEvent({
        action: 'contract_generated_from_award',
        entityType: 'award',
        entityId: awardId,
        userId,
        metadata: {
          awardNumber: award.awardNumber,
          contractsGenerated: contracts.length,
          contractIds: contracts.map(c => c.contract.id),
          ipAddress,
          userAgent
        }
      });

      // Send notifications
      await this.sendContractGeneratedNotifications(award, contracts);

      return {
        success: true,
        message: `${contracts.length} contract(s) generated successfully`,
        contracts: contracts.map(c => ({
          contractId: c.contract.id,
          contractNumber: c.contract.contractNumber,
          supplierId: c.contract.supplierId,
          value: c.contract.value
        }))
      };

    } catch (error) {
      logger.error('Error generating contract from award', { error: error.message, awardId, userId });
      throw new Error(`Contract generation failed: ${error.message}`);
    }
  }

  /**
   * File award dispute
   */
  static async fileDispute(awardId, disputeData, userId, requestInfo = {}) {
    try {
      const { reason, evidence, requestedAction, urgency = 'normal' } = disputeData;
      const { ipAddress, userAgent } = requestInfo;

      const award = await Award.findById(awardId);
      if (!award) {
        throw new Error('Award not found');
      }

      // Check if user can file dispute
      const canDispute = await this.canDisputeAward(award, userId);
      if (!canDispute) {
        throw new Error('You do not have permission to file a dispute for this award');
      }

      // Check if dispute period is still open
      if (new Date() > award.timeline.challengePeriodEnd) {
        throw new Error('The challenge period for this award has expired');
      }

      // Check if dispute already exists
      const existingDispute = await this.getActiveDispute(awardId, userId);
      if (existingDispute) {
        throw new Error('A dispute is already active for this award');
      }

      // Create dispute record
      const disputeNumber = await this.generateDisputeNumber();
      const dispute = {
        disputeNumber,
        awardId,
        disputedBy: userId,
        reason: sanitize(reason),
        evidence: evidence.map(e => sanitize(e)),
        requestedAction: sanitize(requestedAction),
        urgency,
        status: DISPUTE_STATUS.FILED,
        filedAt: new Date(),
        timeline: {
          reviewDeadline: new Date(Date.now() + (urgency === 'urgent' ? 5 : 10) * 24 * 60 * 60 * 1000)
        }
      };

      // Update award with dispute information
      await Award.findByIdAndUpdate(awardId, {
        $set: { status: AWARD_STATUS.DISPUTED },
        $push: { 'disputes': dispute }
      });

      // Log audit event
      await auditService.logAuditEvent({
        action: 'award_dispute_filed',
        entityType: 'award',
        entityId: awardId,
        userId,
        metadata: {
          awardNumber: award.awardNumber,
          disputeNumber,
          reason: reason.substring(0, 200),
          urgency,
          ipAddress,
          userAgent
        }
      });

      // Send notifications to stakeholders
      await this.sendDisputeNotifications(award, dispute);

      return {
        success: true,
        message: 'Dispute filed successfully',
        dispute: {
          disputeNumber,
          status: dispute.status,
          reviewDeadline: dispute.timeline.reviewDeadline
        }
      };

    } catch (error) {
      logger.error('Error filing award dispute', { error: error.message, awardId, userId });
      throw new Error(`Failed to file dispute: ${error.message}`);
    }
  }

  /**
   * Cancel award
   */
  static async cancelAward(awardId, cancellationData, userId, requestInfo = {}) {
    try {
      const { reason, notifySuppliers = true, refundRequired = false } = cancellationData;
      const { ipAddress, userAgent } = requestInfo;

      const award = await Award.findById(awardId)
        .populate('procurementId')
        .populate('awardDetails.selectedSuppliers.supplierId');

      if (!award) {
        throw new Error('Award not found');
      }

      // Check permissions
      const canCancel = await this.canCancelAward(award, userId);
      if (!canCancel) {
        throw new Error('Insufficient permissions to cancel this award');
      }

      // Validate cancellation based on current status
      if ([AWARD_STATUS.COMPLETED, AWARD_STATUS.CANCELLED].includes(award.status)) {
        throw new Error('Award cannot be cancelled in its current status');
      }

      // Update award status
      await Award.findByIdAndUpdate(awardId, {
        $set: {
          status: AWARD_STATUS.CANCELLED,
          'cancellation.cancelledAt': new Date(),
          'cancellation.cancelledBy': userId,
          'cancellation.reason': sanitize(reason),
          'cancellation.refundRequired': refundRequired
        }
      });

      // Update related procurement status
      await Procurement.findByIdAndUpdate(award.procurementId._id, {
        $set: { status: 'award_cancelled' }
      });

      // Cancel any active contracts
      if (award.contractGeneration?.contractIds) {
        for (const contractId of award.contractGeneration.contractIds) {
          await contractService.cancelContract(contractId, {
            reason: `Related award cancelled: ${reason}`,
            automaticCancellation: true
          }, userId, { ipAddress, userAgent });
        }
      }

      // Log audit event
      await auditService.logAuditEvent({
        action: 'award_cancelled',
        entityType: 'award',
        entityId: awardId,
        userId,
        metadata: {
          awardNumber: award.awardNumber,
          reason: reason.substring(0, 200),
          contractsCancelled: award.contractGeneration?.contractIds?.length || 0,
          refundRequired,
          ipAddress,
          userAgent
        }
      });

      // Send cancellation notifications
      if (notifySuppliers) {
        await this.sendCancellationNotifications(award, reason);
      }

      return {
        success: true,
        message: 'Award cancelled successfully',
        cancellation: {
          reason,
          cancelledAt: new Date(),
          contractsAffected: award.contractGeneration?.contractIds?.length || 0
        }
      };

    } catch (error) {
      logger.error('Error cancelling award', { error: error.message, awardId, userId });
      throw new Error(`Award cancellation failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive award reports
   */
  static async generateAwardReport(reportType, filters = {}, userId) {
    try {
      const reportId = generateReportId();
      let reportData;

      switch (reportType) {
        case 'award_summary':
          reportData = await this.generateAwardSummaryReport(filters);
          break;

        case 'supplier_performance':
          reportData = await this.generateSupplierPerformanceReport(filters);
          break;

        case 'compliance_report':
          reportData = await this.generateComplianceReport(filters);
          break;

        case 'financial_analysis':
          reportData = await this.generateFinancialAnalysisReport(filters);
          break;

        case 'timeline_analysis':
          reportData = await this.generateTimelineAnalysisReport(filters);
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Log report generation
      await auditService.logAuditEvent({
        action: 'award_report_generated',
        entityType: 'award',
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
          reportPeriod: filters.startDate && filters.endDate ? 
            `${filters.startDate} to ${filters.endDate}` : 'All time'
        }
      };

    } catch (error) {
      logger.error('Error generating award report', { error: error.message, reportType, userId });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  // Helper Methods
  static async generateAwardNumber() {
    const prefix = 'AWD';
    const year = new Date().getFullYear();
    const lastAward = await Award.findOne({
      awardNumber: { $regex: `^${prefix}-${year}` }
    }).sort({ awardNumber: -1 });

    let sequence = 1;
    if (lastAward) {
      const lastSequence = parseInt(lastAward.awardNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
  }

  static async generateDisputeNumber() {
    const prefix = 'DSP';
    const year = new Date().getFullYear();
    const lastDispute = await Award.findOne({
      'disputes.disputeNumber': { $regex: `^${prefix}-${year}` }
    }).sort({ 'disputes.disputeNumber': -1 });

    let sequence = 1;
    if (lastDispute && lastDispute.disputes.length > 0) {
      const lastSequence = parseInt(lastDispute.disputes[0].disputeNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  static calculateContractEndDate(startDate, duration) {
    if (!startDate || !duration) return null;
    const start = new Date(startDate);
    const durationDays = typeof duration === 'object' ? duration.days : duration;
    start.setDate(start.getDate() + durationDays);
    return start;
  }

  static async calculateAwardDetails(selectedSuppliers, criteria, evaluation) {
    // Calculate average evaluation score
    const scores = selectedSuppliers.map(s => s.evaluationScore).filter(Boolean);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Determine winning criteria
    const winningCriteria = criteria || (evaluation ? evaluation.criteria : ['price', 'quality']);

    // Calculate competition metrics
    const competitionMetrics = {
      totalBidders: selectedSuppliers.length,
      averageScore,
      scoringCriteria: winningCriteria,
      competitivenessFactor: this.calculateCompetitivenessFactor(selectedSuppliers)
    };

    return {
      averageScore,
      winningCriteria,
      competitionMetrics
    };
  }

  static calculateCompetitivenessFactor(suppliers) {
    if (suppliers.length < 2) return 0;
    
    const scores = suppliers.map(s => s.evaluationScore).filter(Boolean).sort((a, b) => b - a);
    if (scores.length < 2) return 0;
    
    return ((scores[0] - scores[1]) / scores[0] * 100).toFixed(2);
  }

  // Placeholder methods for complex operations (to be implemented)
  static async buildAwardApprovalChain(value, department, category) { return []; }
  static async checkRegulatoryCompliance(procurement, suppliers) { return true; }
  static async checkInternalPolicies(value, type, suppliers) { return true; }
  static async performEthicsReview(suppliers) { return { passed: true }; }
  static async checkConflictOfInterest(suppliers, userId) { return { conflicts: [] }; }
  static async checkAwardAccess(award, userId) { return true; }
  static async canEditAward(award, userId) { return true; }
  static async canApproveAward(award, userId) { return true; }
  static async canDisputeAward(award, userId) { return true; }
  static async canGenerateContract(award, userId) { return true; }
  static async canCancelAward(award, userId) { return true; }
  static async canSubmitForApproval(award, userId) { return true; }
  static async getUserAccessFilter(userId) { return {}; }
  static async getAvailableFilters(userId) { return {}; }
  static async getAwardsSummary(query) { return {}; }
  static async getAwardHistory(awardId) { return []; }
  static async getAwardDisputes(awardId) { return []; }
  static async getActiveDispute(awardId, userId) { return null; }
  static async validateAwardUpdate(award, updateData, userId) { return true; }
  static async validateAwardCompleteness(award) { return { isValid: true, errors: [] }; }
  static sanitizeUpdateData(data) { return { $set: data }; }
  static calculateChanges(oldData, newData) { return {}; }
  static calculateEstimatedApprovalTime(chain) { return '3-5 business days'; }
  static async handleStatusChange(award, oldStatus, userId) { }
  static async handleAwardApproval(award, userId) { }
  static async initiateApprovalWorkflow(awardId, userId) { }
  
  // Notification methods
  static async sendAwardCreatedNotifications(award, procurement) { }
  static async sendAwardUpdateNotifications(updatedAward, existingAward, userId) { }
  static async sendApprovalRequestNotifications(award, workflow) { }
  static async sendContractGeneratedNotifications(award, contracts) { }
  static async sendDisputeNotifications(award, dispute) { }
  static async sendCancellationNotifications(award, reason) { }

  // Report generation methods
  static async generateAwardSummaryReport(filters) { return { recordCount: 0 }; }
  static async generateSupplierPerformanceReport(filters) { return { recordCount: 0 }; }
  static async generateComplianceReport(filters) { return { recordCount: 0 }; }
  static async generateFinancialAnalysisReport(filters) { return { recordCount: 0 }; }
  static async generateTimelineAnalysisReport(filters) { return { recordCount: 0 }; }
}

module.exports = AwardService;
