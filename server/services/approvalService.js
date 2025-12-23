const { createStore } = require('./baseService');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const auditService = require('./auditService');

// Import models
const Approval = require('../db/models/Approval');
const User = require('../db/models/User');
const Procurement = require('../db/models/Procurement');
const Contract = require('../db/models/Contract');

// Constants for approval workflows
const APPROVAL_TYPES = {
  PROCUREMENT_PLAN: 'procurement_plan',
  RFQ_CREATION: 'rfq_creation',
  VENDOR_SELECTION: 'vendor_selection',
  AWARD_DECISION: 'award_decision',
  CONTRACT_EXECUTION: 'contract_execution',
  BUDGET_APPROVAL: 'budget_approval',
  DOCUMENT_APPROVAL: 'document_approval',
  POLICY_EXCEPTION: 'policy_exception'
};

const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELEGATED: 'delegated',
  ESCALATED: 'escalated',
  EXPIRED: 'expired',
  RECALLED: 'recalled'
};

const APPROVAL_LEVELS = {
  DEPARTMENT: 1,
  MANAGER: 2,
  DIRECTOR: 3,
  VP: 4,
  CEO: 5,
  BOARD: 6
};

class ApprovalService {
  constructor() {
    this.store = createStore('approvals');
  }

  // Core CRUD operations with enhanced functionality
  async listApprovals(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        type,
        priority,
        assignedTo,
        requestedBy,
        dateFrom,
        dateTo,
        department,
        includeExpired = false,
        onlyMyApprovals = false
      } = options;

      // Build aggregation pipeline
      const pipeline = [];

      // Match stage
      const matchStage = { ...filters };

      if (status) {
        matchStage.status = Array.isArray(status) ? { $in: status } : status;
      }

      if (type) {
        matchStage.type = Array.isArray(type) ? { $in: type } : type;
      }

      if (priority) {
        matchStage.priority = priority;
      }

      if (assignedTo) {
        matchStage['currentApprover.userId'] = assignedTo;
      }

      if (requestedBy) {
        matchStage.requestedBy = requestedBy;
      }

      if (department) {
        matchStage.department = department;
      }

      if (!includeExpired) {
        matchStage.$or = [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gte: new Date() } }
        ];
      }

      if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
      }

      pipeline.push({ $match: matchStage });

      // Lookup stages for populating references
      pipeline.push(
        {
          $lookup: {
            from: 'users',
            localField: 'requestedBy',
            foreignField: '_id',
            as: 'requesterInfo'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'currentApprover.userId',
            foreignField: '_id',
            as: 'approverInfo'
          }
        }
      );

      // Add computed fields
      pipeline.push({
        $addFields: {
          isExpired: {
            $and: [
              { $ne: ['$expiresAt', null] },
              { $lt: ['$expiresAt', new Date()] }
            ]
          },
          daysPending: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          },
          requester: { $arrayElemAt: ['$requesterInfo', 0] },
          currentApproverDetail: { $arrayElemAt: ['$approverInfo', 0] }
        }
      });

      // Remove sensitive fields
      pipeline.push({
        $project: {
          'requesterInfo': 0,
          'approverInfo': 0,
          'requester.password': 0,
          'currentApproverDetail.password': 0
        }
      });

      // Sort
      const sortStage = {};
      sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
      pipeline.push({ $sort: sortStage });

      // Pagination
      const skip = (page - 1) * limit;
      pipeline.push({ $skip: skip }, { $limit: limit });

      const [approvals, totalCount] = await Promise.all([
        Approval.aggregate(pipeline),
        Approval.countDocuments(matchStage)
      ]);

      return {
        approvals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Error listing approvals:', error);
      throw new Error('Failed to retrieve approvals');
    }
  }

  async getApprovalById(id, options = {}) {
    try {
      const { 
        includeHistory = true, 
        includeComments = true,
        includeDocuments = true,
        includeWorkflow = true 
      } = options;

      const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(id) } }
      ];

      // Add lookups based on options
      if (includeHistory || includeComments || includeDocuments) {
        pipeline.push(
          {
            $lookup: {
              from: 'users',
              localField: 'requestedBy',
              foreignField: '_id',
              as: 'requesterInfo'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'approvalChain.userId',
              foreignField: '_id',
              as: 'approverInfos'
            }
          }
        );
      }

      if (includeDocuments) {
        pipeline.push({
          $lookup: {
            from: 'documents',
            localField: 'attachments.documentId',
            foreignField: '_id',
            as: 'documentDetails'
          }
        });
      }

      // Add computed fields
      pipeline.push({
        $addFields: {
          isExpired: {
            $and: [
              { $ne: ['$expiresAt', null] },
              { $lt: ['$expiresAt', new Date()] }
            ]
          },
          daysPending: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          },
          requester: { $arrayElemAt: ['$requesterInfo', 0] }
        }
      });

      const result = await Approval.aggregate(pipeline);
      const approval = result[0];

      if (!approval) {
        throw new Error('Approval not found');
      }

      // Get workflow information if requested
      if (includeWorkflow) {
        approval.workflowInfo = await this.getWorkflowInfo(approval.type, approval.value);
      }

      return approval;

    } catch (error) {
      logger.error('Error getting approval by ID:', error);
      throw error;
    }
  }

  async createApproval(approvalData, requesterId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate input data
      await this.validateApprovalData(approvalData);

      // Determine approval workflow
      const workflow = await this.determineApprovalWorkflow(
        approvalData.type,
        approvalData.value,
        approvalData.department
      );

      // Create approval object
      const approval = new Approval({
        ...approvalData,
        requestedBy: requesterId,
        status: APPROVAL_STATUS.PENDING,
        approvalChain: workflow.approvalChain,
        currentApprover: workflow.approvalChain[0],
        currentLevel: 1,
        totalLevels: workflow.approvalChain.length,
        priority: this.calculatePriority(approvalData),
        expiresAt: this.calculateExpiryDate(approvalData.type, approvalData.priority),
        workflow: {
          type: workflow.type,
          rules: workflow.rules,
          escalationPolicy: workflow.escalationPolicy
        },
        metadata: {
          ...approvalData.metadata,
          createdAt: new Date(),
          department: approvalData.department,
          costCenter: approvalData.costCenter
        }
      });

      // Save approval
      await approval.save({ session });

      // Create audit entry
      await auditService.logApprovalCreated(approval, requesterId, session);

      // Send notification to first approver
      await this.notifyApprover(approval, 'new_approval');

      await session.commitTransaction();

      logger.info(`Approval created: ${approval._id} for type: ${approvalData.type}`);
      
      return await this.getApprovalById(approval._id);

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error creating approval:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async approveRequest(approvalId, approverId, approvalData = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const approval = await Approval.findById(approvalId).session(session);
      if (!approval) {
        throw new Error('Approval not found');
      }

      // Validate approver permissions
      await this.validateApprover(approval, approverId);

      const { comments, attachments, conditions } = approvalData;

      // Update current level approval
      const currentApprover = approval.approvalChain[approval.currentLevel - 1];
      currentApprover.status = APPROVAL_STATUS.APPROVED;
      currentApprover.approvedAt = new Date();
      currentApprover.comments = comments;
      currentApprover.attachments = attachments || [];
      currentApprover.conditions = conditions || [];

      // Add to approval history
      approval.approvalHistory.push({
        level: approval.currentLevel,
        userId: approverId,
        action: 'approved',
        timestamp: new Date(),
        comments,
        attachments,
        conditions
      });

      // Check if this is the final approval
      if (approval.currentLevel >= approval.totalLevels) {
        approval.status = APPROVAL_STATUS.APPROVED;
        approval.approvedAt = new Date();
        approval.finalApprover = approverId;
      } else {
        // Move to next approval level
        approval.currentLevel += 1;
        approval.currentApprover = approval.approvalChain[approval.currentLevel - 1];
        approval.currentApprover.assignedAt = new Date();
      }

      await approval.save({ session });

      // Create audit entry
      await auditService.logApprovalAction(approval, approverId, 'approved', {
        comments,
        level: approval.currentLevel - 1,
        conditions
      }, session);

      // Send notifications
      if (approval.status === APPROVAL_STATUS.APPROVED) {
        // Final approval - notify requester and stakeholders
        await this.notifyApprovalComplete(approval);
        await this.executeApprovalActions(approval);
      } else {
        // Move to next level - notify next approver
        await this.notifyApprover(approval, 'approval_required');
      }

      await session.commitTransaction();

      logger.info(`Approval ${approvalId} approved by ${approverId} at level ${approval.currentLevel - 1}`);
      
      return await this.getApprovalById(approvalId);

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error approving request:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async rejectRequest(approvalId, approverId, rejectionData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const approval = await Approval.findById(approvalId).session(session);
      if (!approval) {
        throw new Error('Approval not found');
      }

      // Validate approver permissions
      await this.validateApprover(approval, approverId);

      const { reason, comments, returnToLevel = 0, allowResubmission = true } = rejectionData;

      // Update current level approval
      const currentApprover = approval.approvalChain[approval.currentLevel - 1];
      currentApprover.status = APPROVAL_STATUS.REJECTED;
      currentApprover.rejectedAt = new Date();
      currentApprover.comments = comments;
      currentApprover.rejectionReason = reason;

      // Update approval status
      approval.status = APPROVAL_STATUS.REJECTED;
      approval.rejectedAt = new Date();
      approval.rejectedBy = approverId;
      approval.rejectionReason = reason;
      approval.allowResubmission = allowResubmission;

      // If returning to specific level
      if (returnToLevel > 0 && returnToLevel < approval.currentLevel) {
        approval.returnToLevel = returnToLevel;
      }

      // Add to approval history
      approval.approvalHistory.push({
        level: approval.currentLevel,
        userId: approverId,
        action: 'rejected',
        timestamp: new Date(),
        comments,
        rejectionReason: reason,
        returnToLevel,
        allowResubmission
      });

      await approval.save({ session });

      // Create audit entry
      await auditService.logApprovalAction(approval, approverId, 'rejected', {
        reason,
        comments,
        level: approval.currentLevel,
        returnToLevel,
        allowResubmission
      }, session);

      // Send notifications
      await this.notifyApprovalRejected(approval);

      await session.commitTransaction();

      logger.info(`Approval ${approvalId} rejected by ${approverId} with reason: ${reason}`);
      
      return await this.getApprovalById(approvalId);

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error rejecting request:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async delegateApproval(approvalId, currentApproverId, delegateToId, delegationData = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const approval = await Approval.findById(approvalId).session(session);
      if (!approval) {
        throw new Error('Approval not found');
      }

      // Validate current approver
      await this.validateApprover(approval, currentApproverId);

      // Validate delegate permissions
      await this.validateDelegatePermissions(approval, delegateToId);

      const { reason, comments, expiresAt } = delegationData;

      // Update current approver in chain
      const currentApprover = approval.approvalChain[approval.currentLevel - 1];
      currentApprover.delegatedTo = delegateToId;
      currentApprover.delegatedAt = new Date();
      currentApprover.delegationReason = reason;
      currentApprover.status = APPROVAL_STATUS.DELEGATED;

      // Update current approver reference
      approval.currentApprover = {
        userId: delegateToId,
        level: approval.currentLevel,
        assignedAt: new Date(),
        delegatedFrom: currentApproverId,
        expiresAt: expiresAt || approval.expiresAt
      };

      // Add to delegation history
      if (!approval.delegationHistory) {
        approval.delegationHistory = [];
      }

      approval.delegationHistory.push({
        level: approval.currentLevel,
        fromUserId: currentApproverId,
        toUserId: delegateToId,
        reason,
        comments,
        timestamp: new Date(),
        expiresAt
      });

      await approval.save({ session });

      // Create audit entry
      await auditService.logApprovalAction(approval, currentApproverId, 'delegated', {
        delegateToId,
        reason,
        comments,
        level: approval.currentLevel
      }, session);

      // Send notifications
      await this.notifyDelegation(approval, currentApproverId, delegateToId);

      await session.commitTransaction();

      logger.info(`Approval ${approvalId} delegated from ${currentApproverId} to ${delegateToId}`);
      
      return await this.getApprovalById(approvalId);

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error delegating approval:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async escalateApproval(approvalId, reason, escalatedById) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const approval = await Approval.findById(approvalId).session(session);
      if (!approval) {
        throw new Error('Approval not found');
      }

      // Find escalation path
      const escalationTarget = await this.findEscalationTarget(approval);
      if (!escalationTarget) {
        throw new Error('No escalation path available');
      }

      // Update approval
      approval.status = APPROVAL_STATUS.ESCALATED;
      approval.escalatedAt = new Date();
      approval.escalatedBy = escalatedById;
      approval.escalationReason = reason;

      // Update current approver to escalation target
      approval.currentApprover = {
        userId: escalationTarget.userId,
        level: escalationTarget.level,
        assignedAt: new Date(),
        isEscalation: true,
        originalLevel: approval.currentLevel
      };

      // Add to escalation history
      if (!approval.escalationHistory) {
        approval.escalationHistory = [];
      }

      approval.escalationHistory.push({
        fromLevel: approval.currentLevel,
        toLevel: escalationTarget.level,
        fromUserId: approval.currentApprover.userId,
        toUserId: escalationTarget.userId,
        reason,
        timestamp: new Date(),
        escalatedBy: escalatedById
      });

      await approval.save({ session });

      // Create audit entry
      await auditService.logApprovalAction(approval, escalatedById, 'escalated', {
        reason,
        toLevel: escalationTarget.level,
        toUserId: escalationTarget.userId
      }, session);

      // Send notifications
      await this.notifyEscalation(approval, escalationTarget.userId);

      await session.commitTransaction();

      logger.info(`Approval ${approvalId} escalated to level ${escalationTarget.level}`);
      
      return await this.getApprovalById(approvalId);

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error escalating approval:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async recallApproval(approvalId, requesterId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const approval = await Approval.findById(approvalId).session(session);
      if (!approval) {
        throw new Error('Approval not found');
      }

      // Validate that user can recall this approval
      if (approval.requestedBy.toString() !== requesterId.toString()) {
        throw new Error('Only the requester can recall an approval');
      }

      if (approval.status !== APPROVAL_STATUS.PENDING) {
        throw new Error('Can only recall pending approvals');
      }

      // Update approval
      approval.status = APPROVAL_STATUS.RECALLED;
      approval.recalledAt = new Date();
      approval.recallReason = reason;

      // Add to approval history
      approval.approvalHistory.push({
        level: approval.currentLevel,
        userId: requesterId,
        action: 'recalled',
        timestamp: new Date(),
        comments: reason
      });

      await approval.save({ session });

      // Create audit entry
      await auditService.logApprovalAction(approval, requesterId, 'recalled', {
        reason,
        level: approval.currentLevel
      }, session);

      // Send notifications
      await this.notifyApprovalRecalled(approval);

      await session.commitTransaction();

      logger.info(`Approval ${approvalId} recalled by requester with reason: ${reason}`);
      
      return await this.getApprovalById(approvalId);

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error recalling approval:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Workflow and business logic methods
  async determineApprovalWorkflow(type, value, department) {
    try {
      const workflowRules = await this.getWorkflowRules(type, department);
      const approvalChain = [];

      // Apply value-based rules
      if (type === APPROVAL_TYPES.PROCUREMENT_PLAN || type === APPROVAL_TYPES.BUDGET_APPROVAL) {
        if (value >= 1000000) { // $1M+
          approvalChain.push(...this.buildHighValueChain(department));
        } else if (value >= 100000) { // $100K+
          approvalChain.push(...this.buildMediumValueChain(department));
        } else {
          approvalChain.push(...this.buildStandardChain(department));
        }
      } else {
        // Non-monetary approvals
        approvalChain.push(...this.buildStandardChain(department));
      }

      // Add department-specific approvers
      const departmentApprovers = await this.getDepartmentApprovers(department, type);
      approvalChain.unshift(...departmentApprovers);

      return {
        type: 'sequential',
        approvalChain: approvalChain.map((approver, index) => ({
          ...approver,
          level: index + 1,
          assignedAt: index === 0 ? new Date() : null,
          status: APPROVAL_STATUS.PENDING
        })),
        rules: workflowRules,
        escalationPolicy: await this.getEscalationPolicy(type, department)
      };

    } catch (error) {
      logger.error('Error determining approval workflow:', error);
      throw new Error('Failed to determine approval workflow');
    }
  }

  async validateApprovalData(data) {
    const requiredFields = ['type', 'title', 'description', 'department'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Object.values(APPROVAL_TYPES).includes(data.type)) {
      throw new Error('Invalid approval type');
    }

    if (data.value && (typeof data.value !== 'number' || data.value < 0)) {
      throw new Error('Approval value must be a positive number');
    }

    // Type-specific validation
    switch (data.type) {
      case APPROVAL_TYPES.PROCUREMENT_PLAN:
        if (!data.procurementId) {
          throw new Error('Procurement ID required for procurement plan approval');
        }
        break;
      
      case APPROVAL_TYPES.BUDGET_APPROVAL:
        if (!data.value || data.value <= 0) {
          throw new Error('Budget value required for budget approval');
        }
        break;
      
      case APPROVAL_TYPES.CONTRACT_EXECUTION:
        if (!data.contractId) {
          throw new Error('Contract ID required for contract execution approval');
        }
        break;
    }
  }

  async validateApprover(approval, approverId) {
    // Check if user is current approver
    if (approval.currentApprover.userId.toString() !== approverId.toString()) {
      // Check if it's a valid delegate
      const currentApprover = approval.approvalChain[approval.currentLevel - 1];
      if (currentApprover.delegatedTo && currentApprover.delegatedTo.toString() === approverId.toString()) {
        return true; // Valid delegate
      }
      throw new Error('You are not authorized to approve this request');
    }

    // Check if approval is still pending
    if (approval.status !== APPROVAL_STATUS.PENDING) {
      throw new Error('This approval is no longer pending');
    }

    // Check if approval has expired
    if (approval.expiresAt && approval.expiresAt < new Date()) {
      throw new Error('This approval has expired');
    }

    return true;
  }

  async validateDelegatePermissions(approval, delegateToId) {
    const delegate = await User.findById(delegateToId);
    if (!delegate) {
      throw new Error('Delegate user not found');
    }

    // Check if delegate has appropriate permissions
    const requiredPermission = this.getRequiredPermissionForType(approval.type);
    if (!delegate.permissions.includes(requiredPermission)) {
      throw new Error('Delegate does not have required permissions');
    }

    // Check department/organizational constraints
    if (approval.department && delegate.department !== approval.department) {
      // Check if cross-department delegation is allowed
      const allowCrossDept = await this.checkCrossDepartmentDelegation(approval.type);
      if (!allowCrossDept) {
        throw new Error('Cross-department delegation not allowed for this approval type');
      }
    }

    return true;
  }

  calculatePriority(approvalData) {
    let priority = 'medium';

    // High priority conditions
    if (approvalData.value && approvalData.value >= 500000) {
      priority = 'high';
    } else if (approvalData.type === APPROVAL_TYPES.POLICY_EXCEPTION) {
      priority = 'high';
    } else if (approvalData.urgent === true) {
      priority = 'high';
    }

    // Critical priority conditions
    if (approvalData.value && approvalData.value >= 1000000) {
      priority = 'critical';
    } else if (approvalData.emergency === true) {
      priority = 'critical';
    }

    return priority;
  }

  calculateExpiryDate(type, priority) {
    const baseDays = {
      'critical': 1,
      'high': 3,
      'medium': 7,
      'low': 14
    };

    const typeDays = {
      [APPROVAL_TYPES.POLICY_EXCEPTION]: 2,
      [APPROVAL_TYPES.BUDGET_APPROVAL]: 5,
      [APPROVAL_TYPES.CONTRACT_EXECUTION]: 10
    };

    const days = Math.min(
      baseDays[priority] || 7,
      typeDays[type] || 14
    );

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    return expiryDate;
  }

  // Workflow building methods
  buildHighValueChain(department) {
    return [
      { userId: this.getDepartmentManager(department), role: 'department_manager', level: APPROVAL_LEVELS.MANAGER },
      { userId: this.getDepartmentDirector(department), role: 'department_director', level: APPROVAL_LEVELS.DIRECTOR },
      { userId: this.getVP(department), role: 'vp', level: APPROVAL_LEVELS.VP },
      { userId: this.getCEO(), role: 'ceo', level: APPROVAL_LEVELS.CEO }
    ];
  }

  buildMediumValueChain(department) {
    return [
      { userId: this.getDepartmentManager(department), role: 'department_manager', level: APPROVAL_LEVELS.MANAGER },
      { userId: this.getDepartmentDirector(department), role: 'department_director', level: APPROVAL_LEVELS.DIRECTOR },
      { userId: this.getVP(department), role: 'vp', level: APPROVAL_LEVELS.VP }
    ];
  }

  buildStandardChain(department) {
    return [
      { userId: this.getDepartmentManager(department), role: 'department_manager', level: APPROVAL_LEVELS.MANAGER },
      { userId: this.getDepartmentDirector(department), role: 'department_director', level: APPROVAL_LEVELS.DIRECTOR }
    ];
  }

  // Notification methods
  async notifyApprover(approval, eventType) {
    try {
      const approver = await User.findById(approval.currentApprover.userId);
      if (!approver) return;

      const notification = {
        type: eventType,
        title: this.getNotificationTitle(eventType, approval),
        message: this.getNotificationMessage(eventType, approval),
        priority: approval.priority,
        recipients: [approver._id],
        data: {
          approvalId: approval._id,
          approvalType: approval.type,
          value: approval.value,
          department: approval.department,
          requestedBy: approval.requestedBy
        }
      };

      await notificationService.sendNotification(notification);

      // Send email for high priority approvals
      if (approval.priority === 'high' || approval.priority === 'critical') {
        await notificationService.sendEmail({
          to: approver.email,
          subject: notification.title,
          template: 'approval_notification',
          data: {
            approverName: approver.name,
            approval: approval,
            actionUrl: `${process.env.FRONTEND_URL}/approvals/${approval._id}`
          }
        });
      }

    } catch (error) {
      logger.error('Error sending approver notification:', error);
    }
  }

  async notifyApprovalComplete(approval) {
    try {
      const requester = await User.findById(approval.requestedBy);
      if (!requester) return;

      await notificationService.sendNotification({
        type: 'approval_completed',
        title: 'Approval Completed',
        message: `Your ${approval.type.replace('_', ' ')} request "${approval.title}" has been fully approved`,
        priority: 'medium',
        recipients: [requester._id],
        data: {
          approvalId: approval._id,
          approvalType: approval.type,
          completedAt: approval.approvedAt
        }
      });

      // Notify stakeholders if specified
      if (approval.stakeholders && approval.stakeholders.length > 0) {
        await notificationService.sendNotification({
          type: 'approval_completed',
          title: 'Stakeholder Approval Notification',
          message: `Approval "${approval.title}" has been completed`,
          priority: 'low',
          recipients: approval.stakeholders,
          data: {
            approvalId: approval._id,
            approvalType: approval.type
          }
        });
      }

    } catch (error) {
      logger.error('Error sending approval completion notification:', error);
    }
  }

  async notifyApprovalRejected(approval) {
    try {
      const requester = await User.findById(approval.requestedBy);
      if (!requester) return;

      await notificationService.sendNotification({
        type: 'approval_rejected',
        title: 'Approval Rejected',
        message: `Your ${approval.type.replace('_', ' ')} request "${approval.title}" has been rejected`,
        priority: 'high',
        recipients: [requester._id],
        data: {
          approvalId: approval._id,
          approvalType: approval.type,
          rejectionReason: approval.rejectionReason,
          allowResubmission: approval.allowResubmission
        }
      });

    } catch (error) {
      logger.error('Error sending rejection notification:', error);
    }
  }

  async executeApprovalActions(approval) {
    try {
      // Execute type-specific actions after final approval
      switch (approval.type) {
        case APPROVAL_TYPES.PROCUREMENT_PLAN:
          await this.executeProcurementPlanApproval(approval);
          break;
        
        case APPROVAL_TYPES.BUDGET_APPROVAL:
          await this.executeBudgetApproval(approval);
          break;
        
        case APPROVAL_TYPES.CONTRACT_EXECUTION:
          await this.executeContractApproval(approval);
          break;
        
        case APPROVAL_TYPES.AWARD_DECISION:
          await this.executeAwardDecision(approval);
          break;
      }

    } catch (error) {
      logger.error('Error executing approval actions:', error);
      // Don't throw - approval is still valid even if post-actions fail
    }
  }

  // Analytics and reporting methods
  async getApprovalAnalytics(filters = {}, period = '30d') {
    try {
      const startDate = this.getDateFromPeriod(period);
      
      const analytics = await Approval.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            ...filters
          }
        },
        {
          $group: {
            _id: null,
            totalApprovals: { $sum: 1 },
            approvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            rejectedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            avgProcessingTime: {
              $avg: {
                $cond: [
                  { $ne: ['$approvedAt', null] },
                  { $subtract: ['$approvedAt', '$createdAt'] },
                  null
                ]
              }
            },
            avgValue: { $avg: '$value' },
            totalValue: { $sum: '$value' }
          }
        }
      ]);

      return analytics[0] || {};

    } catch (error) {
      logger.error('Error getting approval analytics:', error);
      throw new Error('Failed to retrieve approval analytics');
    }
  }

  // Utility methods
  getNotificationTitle(eventType, approval) {
    const titles = {
      'new_approval': 'New Approval Required',
      'approval_required': 'Approval Required',
      'approval_reminder': 'Approval Reminder',
      'approval_escalated': 'Approval Escalated'
    };
    return titles[eventType] || 'Approval Notification';
  }

  getNotificationMessage(eventType, approval) {
    const type = approval.type.replace('_', ' ');
    const value = approval.value ? ` worth $${approval.value.toLocaleString()}` : '';
    
    return `${type} approval required${value}: "${approval.title}"`;
  }

  getDateFromPeriod(period) {
    const date = new Date();
    const days = parseInt(period.replace('d', '')) || 30;
    date.setDate(date.getDate() - days);
    return date;
  }

  // Placeholder methods for organizational structure
  getDepartmentManager(department) {
    // Implementation would query organizational structure
    return null;
  }

  getDepartmentDirector(department) {
    // Implementation would query organizational structure
    return null;
  }

  getVP(department) {
    // Implementation would query organizational structure
    return null;
  }

  getCEO() {
    // Implementation would query organizational structure
    return null;
  }
}

module.exports = new ApprovalService();
