const mongoose = require('mongoose');
const Clarification = require('../db/models/Clarification');
const Procurement = require('../db/models/Procurement');
const Supplier = require('../db/models/Supplier');
const User = require('../db/models/User');
const Document = require('../db/models/Document');
const RFQ = require('../db/models/RFQ');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const documentService = require('./documentService');
const auditService = require('./auditService');
const { validateInput, sanitize } = require('../utils/validation');
const { generateSequentialId, formatDate, calculateBusinessDays } = require('../utils/helpers');

// Constants for clarification management
const CLARIFICATION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ANSWERED: 'answered',
  CLOSED: 'closed',
  ESCALATED: 'escalated',
  CANCELLED: 'cancelled'
};

const CLARIFICATION_TYPES = {
  TECHNICAL: 'technical',
  COMMERCIAL: 'commercial',
  LEGAL: 'legal',
  PROCEDURAL: 'procedural',
  SPECIFICATION: 'specification',
  TIMELINE: 'timeline',
  EVALUATION: 'evaluation',
  GENERAL: 'general'
};

const CLARIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
  CRITICAL: 'critical'
};

const CLARIFICATION_VISIBILITY = {
  PUBLIC: 'public', // Visible to all participants
  PRIVATE: 'private', // Only visible to requester and procurement team
  RESTRICTED: 'restricted' // Limited visibility based on roles
};

const RESPONSE_STATUS = {
  PENDING: 'pending',
  DRAFTED: 'drafted',
  REVIEWED: 'reviewed',
  PUBLISHED: 'published',
  REVISED: 'revised'
};

const NOTIFICATION_TRIGGERS = {
  NEW_CLARIFICATION: 'new_clarification',
  RESPONSE_PUBLISHED: 'response_published',
  DEADLINE_APPROACHING: 'deadline_approaching',
  OVERDUE: 'overdue',
  STATUS_CHANGED: 'status_changed'
};

class ClarificationService {
  /**
   * Submit clarification request
   */
  static async submitClarification(clarificationData, userId, requestInfo = {}) {
    try {
      const {
        procurementId,
        rfqId,
        type = CLARIFICATION_TYPES.GENERAL,
        priority = CLARIFICATION_PRIORITY.MEDIUM,
        subject,
        question,
        category,
        visibility = CLARIFICATION_VISIBILITY.PUBLIC,
        attachments = [],
        requestedResponseDate,
        isUrgent = false
      } = clarificationData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!procurementId || !subject || !question) {
        throw new Error('Procurement ID, subject, and question are required');
      }

      // Validate procurement exists and is active
      const procurement = await Procurement.findById(procurementId);
      if (!procurement) {
        throw new Error('Procurement not found');
      }

      // Check if clarification period is still open
      const isWithinClarificationPeriod = await this.checkClarificationPeriod(procurement, rfqId);
      if (!isWithinClarificationPeriod.allowed) {
        throw new Error(`Clarification period has ended. ${isWithinClarificationPeriod.reason}`);
      }

      // Validate user permissions
      const canSubmit = await this.canSubmitClarification(procurement, userId, rfqId);
      if (!canSubmit.allowed) {
        throw new Error(`Cannot submit clarification: ${canSubmit.reason}`);
      }

      // Get user information
      const user = await User.findById(userId).select('username email firstName lastName department roles');
      if (!user) {
        throw new Error('User not found');
      }

      // Generate clarification number
      const clarificationNumber = await this.generateClarificationNumber(procurementId);

      // Calculate response deadline
      const responseDeadline = await this.calculateResponseDeadline(
        procurement, 
        priority, 
        requestedResponseDate,
        isUrgent
      );

      // Process attachments
      const processedAttachments = await this.processAttachments(attachments, userId);

      // Create clarification
      const clarification = new Clarification({
        clarificationNumber,
        procurementId: new mongoose.Types.ObjectId(procurementId),
        rfqId: rfqId ? new mongoose.Types.ObjectId(rfqId) : null,
        requester: {
          userId: new mongoose.Types.ObjectId(userId),
          username: user.username,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          department: user.department,
          roles: user.roles
        },
        request: {
          type,
          category: sanitize(category),
          priority,
          subject: sanitize(subject),
          question: sanitize(question),
          visibility,
          attachments: processedAttachments,
          submittedAt: new Date(),
          requestedResponseDate: requestedResponseDate ? new Date(requestedResponseDate) : null,
          isUrgent
        },
        status: CLARIFICATION_STATUS.SUBMITTED,
        timeline: {
          submittedAt: new Date(),
          responseDeadline,
          estimatedResponseTime: this.calculateEstimatedResponseTime(priority, type)
        },
        workflow: {
          assignedTo: null,
          reviewers: await this.getDefaultReviewers(procurement, type),
          escalationPath: await this.buildEscalationPath(procurement, priority),
          approvalRequired: this.requiresApproval(type, visibility, isUrgent)
        },
        metadata: {
          submittedIP: ipAddress,
          submittedUserAgent: userAgent,
          version: 1,
          tags: this.extractTags(subject, question),
          relatedClarifications: [],
          searchKeywords: this.extractSearchKeywords(subject, question, category)
        }
      });

      await clarification.save();

      // Auto-assign if rules exist
      await this.autoAssignClarification(clarification);

      // Create initial audit trail
      await auditService.logAuditEvent({
        action: 'clarification_submitted',
        entityType: 'clarification',
        entityId: clarification._id,
        userId,
        metadata: {
          clarificationNumber: clarification.clarificationNumber,
          procurementId,
          type,
          priority,
          subject: subject.substring(0, 100),
          visibility,
          ipAddress,
          userAgent
        }
      });

      // Send notifications to stakeholders
      await this.sendSubmissionNotifications(clarification, procurement);

      return {
        success: true,
        message: 'Clarification submitted successfully',
        clarification: {
          id: clarification._id,
          clarificationNumber: clarification.clarificationNumber,
          status: clarification.status,
          responseDeadline: clarification.timeline.responseDeadline,
          estimatedResponseTime: clarification.timeline.estimatedResponseTime
        }
      };

    } catch (error) {
      logger.error('Error submitting clarification', { 
        error: error.message, 
        clarificationData, 
        userId 
      });
      throw new Error(`Clarification submission failed: ${error.message}`);
    }
  }

  /**
   * Get clarification with full details
   */
  static async getClarificationById(clarificationId, userId, includeHistory = false) {
    try {
      if (!mongoose.Types.ObjectId.isValid(clarificationId)) {
        throw new Error('Invalid clarification ID');
      }

      const clarification = await Clarification.findById(clarificationId)
        .populate('procurementId', 'procurementNumber title category status')
        .populate('rfqId', 'rfqNumber title status')
        .populate('response.respondedBy', 'username firstName lastName department')
        .populate('workflow.assignedTo', 'username firstName lastName email')
        .populate('workflow.reviewers', 'username firstName lastName email department')
        .lean();

      if (!clarification) {
        throw new Error('Clarification not found');
      }

      // Check access permissions
      const hasAccess = await this.checkClarificationAccess(clarification, userId);
      if (!hasAccess.allowed) {
        throw new Error(`Access denied: ${hasAccess.reason}`);
      }

      // Get clarification history if requested
      let history = [];
      if (includeHistory) {
        history = await this.getClarificationHistory(clarificationId);
      }

      // Get related clarifications
      const relatedClarifications = await this.getRelatedClarifications(clarification);

      // Get user permissions for this clarification
      const permissions = await this.getClarificationPermissions(clarification, userId);

      // Log access event
      await auditService.logDataAccess({
        entityType: 'clarification',
        entityId: clarificationId,
        userId,
        action: 'read',
        metadata: { 
          clarificationNumber: clarification.clarificationNumber,
          includeHistory 
        }
      });

      return {
        ...clarification,
        history,
        relatedClarifications,
        permissions,
        displayInfo: {
          canViewFullDetails: hasAccess.level >= 2,
          isRequester: clarification.requester.userId.toString() === userId,
          isAssigned: clarification.workflow.assignedTo?.toString() === userId,
          timeRemaining: this.calculateTimeRemaining(clarification.timeline.responseDeadline),
          isOverdue: new Date() > new Date(clarification.timeline.responseDeadline)
        }
      };

    } catch (error) {
      logger.error('Error getting clarification', { 
        error: error.message, 
        clarificationId, 
        userId 
      });
      throw new Error(`Failed to get clarification: ${error.message}`);
    }
  }

  /**
   * List clarifications with filtering and pagination
   */
  static async listClarifications(filters = {}, pagination = {}, userId) {
    try {
      const {
        status,
        type,
        priority,
        procurementId,
        rfqId,
        assignedTo,
        requesterUserId,
        visibility,
        category,
        isOverdue,
        startDate,
        endDate,
        search
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'submittedAt',
        sortOrder = -1
      } = pagination;

      // Build filter query with user access controls
      const filterQuery = await this.buildAccessControlledQuery(userId);

      // Apply filters
      if (status) {
        if (Array.isArray(status)) {
          filterQuery.status = { $in: status };
        } else {
          filterQuery.status = status;
        }
      }

      if (type) filterQuery['request.type'] = type;
      if (priority) filterQuery['request.priority'] = priority;
      if (procurementId) filterQuery.procurementId = new mongoose.Types.ObjectId(procurementId);
      if (rfqId) filterQuery.rfqId = new mongoose.Types.ObjectId(rfqId);
      if (assignedTo) filterQuery['workflow.assignedTo'] = new mongoose.Types.ObjectId(assignedTo);
      if (requesterUserId) filterQuery['requester.userId'] = new mongoose.Types.ObjectId(requesterUserId);
      if (visibility) filterQuery['request.visibility'] = visibility;
      if (category) filterQuery['request.category'] = category;

      // Date range filter
      if (startDate || endDate) {
        filterQuery['timeline.submittedAt'] = {};
        if (startDate) filterQuery['timeline.submittedAt'].$gte = new Date(startDate);
        if (endDate) filterQuery['timeline.submittedAt'].$lte = new Date(endDate);
      }

      // Overdue filter
      if (isOverdue === true) {
        filterQuery['timeline.responseDeadline'] = { $lt: new Date() };
        filterQuery.status = { $nin: [CLARIFICATION_STATUS.ANSWERED, CLARIFICATION_STATUS.CLOSED] };
      }

      // Search functionality
      if (search) {
        filterQuery.$or = [
          { clarificationNumber: { $regex: search, $options: 'i' } },
          { 'request.subject': { $regex: search, $options: 'i' } },
          { 'request.question': { $regex: search, $options: 'i' } },
          { 'metadata.searchKeywords': { $in: [search] } }
        ];
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions = { [`timeline.${sortBy}`]: sortOrder };

      const [clarifications, totalCount] = await Promise.all([
        Clarification.find(filterQuery)
          .populate('procurementId', 'procurementNumber title status')
          .populate('rfqId', 'rfqNumber title')
          .populate('workflow.assignedTo', 'username firstName lastName')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Clarification.countDocuments(filterQuery)
      ]);

      // Add computed fields
      const enrichedClarifications = clarifications.map(clarification => ({
        ...clarification,
        isOverdue: new Date() > new Date(clarification.timeline.responseDeadline),
        timeRemaining: this.calculateTimeRemaining(clarification.timeline.responseDeadline),
        canRespond: this.canRespondToClarification(clarification, userId),
        responseStatus: clarification.response?.status || RESPONSE_STATUS.PENDING
      }));

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Get summary statistics
      const summary = await this.getClarificationsSummary(filterQuery);

      // Log list access
      await auditService.logDataAccess({
        entityType: 'clarification',
        entityId: null,
        userId,
        action: 'list',
        metadata: {
          filters,
          pagination: { page, limit },
          resultCount: clarifications.length,
          totalCount
        }
      });

      return {
        clarifications: enrichedClarifications,
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
      logger.error('Error listing clarifications', { 
        error: error.message, 
        filters, 
        userId 
      });
      throw new Error(`Failed to list clarifications: ${error.message}`);
    }
  }

  /**
   * Respond to clarification
   */
  static async respondToClarification(clarificationId, responseData, userId, requestInfo = {}) {
    try {
      const {
        answer,
        isPublic = true,
        attachments = [],
        additionalInfo,
        relatedDocuments = [],
        publishImmediately = true,
        scheduledPublishDate
      } = responseData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate input
      if (!answer || answer.trim().length === 0) {
        throw new Error('Answer is required');
      }

      // Get clarification
      const clarification = await Clarification.findById(clarificationId);
      if (!clarification) {
        throw new Error('Clarification not found');
      }

      // Check permissions
      const canRespond = await this.canRespondToClarification(clarification, userId);
      if (!canRespond) {
        throw new Error('Insufficient permissions to respond to this clarification');
      }

      // Check if already responded
      if (clarification.status === CLARIFICATION_STATUS.ANSWERED) {
        throw new Error('This clarification has already been answered');
      }

      // Get responder information
      const user = await User.findById(userId).select('username firstName lastName email department');

      // Process response attachments
      const processedAttachments = await this.processAttachments(attachments, userId);
      const processedDocuments = await this.processRelatedDocuments(relatedDocuments, userId);

      // Prepare response data
      const response = {
        answer: sanitize(answer),
        additionalInfo: additionalInfo ? sanitize(additionalInfo) : null,
        attachments: processedAttachments,
        relatedDocuments: processedDocuments,
        isPublic,
        respondedBy: new mongoose.Types.ObjectId(userId),
        responderInfo: {
          username: user.username,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          department: user.department
        },
        respondedAt: new Date(),
        status: publishImmediately ? RESPONSE_STATUS.PUBLISHED : RESPONSE_STATUS.DRAFTED,
        publishedAt: publishImmediately ? new Date() : null,
        scheduledPublishDate: scheduledPublishDate ? new Date(scheduledPublishDate) : null,
        version: 1,
        metadata: {
          responseIP: ipAddress,
          responseUserAgent: userAgent,
          wordCount: answer.split(/\s+/).length,
          hasAttachments: processedAttachments.length > 0,
          responseTime: new Date() - new Date(clarification.timeline.submittedAt)
        }
      };

      // Update clarification
      const updatedClarification = await Clarification.findByIdAndUpdate(
        clarificationId,
        {
          $set: {
            response,
            status: publishImmediately ? CLARIFICATION_STATUS.ANSWERED : CLARIFICATION_STATUS.UNDER_REVIEW,
            'timeline.respondedAt': new Date(),
            'timeline.responseTime': response.metadata.responseTime,
            'metadata.version': (clarification.metadata.version || 1) + 1
          },
          $push: {
            'metadata.updateHistory': {
              action: 'response_added',
              updatedBy: userId,
              updatedAt: new Date(),
              details: { publishImmediately, isPublic }
            }
          }
        },
        { new: true }
      );

      // Log audit event
      await auditService.logAuditEvent({
        action: 'clarification_responded',
        entityType: 'clarification',
        entityId: clarificationId,
        userId,
        metadata: {
          clarificationNumber: clarification.clarificationNumber,
          responseLength: answer.length,
          isPublic,
          publishImmediately,
          hasAttachments: processedAttachments.length > 0,
          responseTime: response.metadata.responseTime,
          ipAddress,
          userAgent
        }
      });

      // Send notifications
      if (publishImmediately) {
        await this.sendResponseNotifications(updatedClarification);
      }

      // Update related procurement status if needed
      await this.updateProcurementClarificationStatus(clarification.procurementId);

      return {
        success: true,
        message: publishImmediately ? 
          'Response published successfully' : 
          'Response saved as draft',
        response: {
          id: updatedClarification.response._id,
          status: response.status,
          publishedAt: response.publishedAt,
          scheduledPublishDate: response.scheduledPublishDate,
          responseTime: response.metadata.responseTime
        }
      };

    } catch (error) {
      logger.error('Error responding to clarification', { 
        error: error.message, 
        clarificationId, 
        userId 
      });
      throw new Error(`Failed to respond to clarification: ${error.message}`);
    }
  }

  /**
   * Update clarification status
   */
  static async updateClarificationStatus(clarificationId, newStatus, userId, reason = null, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      const clarification = await Clarification.findById(clarificationId);
      if (!clarification) {
        throw new Error('Clarification not found');
      }

      // Validate status transition
      const isValidTransition = await this.validateStatusTransition(
        clarification.status, 
        newStatus, 
        userId
      );
      
      if (!isValidTransition.valid) {
        throw new Error(`Invalid status transition: ${isValidTransition.reason}`);
      }

      // Check permissions
      const canUpdate = await this.canUpdateClarificationStatus(clarification, newStatus, userId);
      if (!canUpdate) {
        throw new Error('Insufficient permissions to update clarification status');
      }

      const oldStatus = clarification.status;

      // Update clarification
      const updateData = {
        status: newStatus,
        'metadata.version': (clarification.metadata.version || 1) + 1
      };

      // Add status-specific updates
      if (newStatus === CLARIFICATION_STATUS.CLOSED) {
        updateData['timeline.closedAt'] = new Date();
        updateData['timeline.closedBy'] = userId;
      } else if (newStatus === CLARIFICATION_STATUS.ESCALATED) {
        updateData['workflow.escalatedAt'] = new Date();
        updateData['workflow.escalatedBy'] = userId;
        updateData['workflow.escalationReason'] = reason;
      }

      const updatedClarification = await Clarification.findByIdAndUpdate(
        clarificationId,
        {
          $set: updateData,
          $push: {
            'metadata.statusHistory': {
              fromStatus: oldStatus,
              toStatus: newStatus,
              changedBy: userId,
              changedAt: new Date(),
              reason: reason ? sanitize(reason) : null,
              ipAddress,
              userAgent
            }
          }
        },
        { new: true }
      );

      // Handle status-specific actions
      await this.handleStatusChangeActions(updatedClarification, oldStatus, newStatus, userId);

      // Log audit event
      await auditService.logAuditEvent({
        action: 'clarification_status_updated',
        entityType: 'clarification',
        entityId: clarificationId,
        userId,
        metadata: {
          clarificationNumber: clarification.clarificationNumber,
          oldStatus,
          newStatus,
          reason,
          ipAddress,
          userAgent
        }
      });

      // Send status change notifications
      await this.sendStatusChangeNotifications(updatedClarification, oldStatus, newStatus);

      return {
        success: true,
        message: `Clarification status updated to ${newStatus}`,
        status: {
          previous: oldStatus,
          current: newStatus,
          updatedAt: new Date(),
          updatedBy: userId
        }
      };

    } catch (error) {
      logger.error('Error updating clarification status', { 
        error: error.message, 
        clarificationId, 
        newStatus,
        userId 
      });
      throw new Error(`Failed to update clarification status: ${error.message}`);
    }
  }

  /**
   * Assign clarification to user
   */
  static async assignClarification(clarificationId, assigneeId, userId, requestInfo = {}) {
    try {
      const { ipAddress, userAgent } = requestInfo;

      const clarification = await Clarification.findById(clarificationId);
      if (!clarification) {
        throw new Error('Clarification not found');
      }

      // Check permissions
      const canAssign = await this.canAssignClarification(clarification, userId);
      if (!canAssign) {
        throw new Error('Insufficient permissions to assign this clarification');
      }

      // Validate assignee
      const assignee = await User.findById(assigneeId).select('username firstName lastName email department roles');
      if (!assignee) {
        throw new Error('Assignee not found');
      }

      // Check if assignee can handle this type of clarification
      const canHandle = await this.canHandleClarificationType(assignee, clarification.request.type);
      if (!canHandle) {
        throw new Error('Assignee cannot handle this type of clarification');
      }

      const previousAssignee = clarification.workflow.assignedTo;

      // Update clarification
      const updatedClarification = await Clarification.findByIdAndUpdate(
        clarificationId,
        {
          $set: {
            'workflow.assignedTo': new mongoose.Types.ObjectId(assigneeId),
            'workflow.assignedAt': new Date(),
            'workflow.assignedBy': userId,
            'metadata.version': (clarification.metadata.version || 1) + 1
          },
          $push: {
            'workflow.assignmentHistory': {
              assignee: assigneeId,
              assignedBy: userId,
              assignedAt: new Date(),
              previousAssignee,
              ipAddress,
              userAgent
            }
          }
        },
        { new: true }
      );

      // Log audit event
      await auditService.logAuditEvent({
        action: 'clarification_assigned',
        entityType: 'clarification',
        entityId: clarificationId,
        userId,
        metadata: {
          clarificationNumber: clarification.clarificationNumber,
          assigneeId,
          assigneeName: `${assignee.firstName} ${assignee.lastName}`,
          previousAssignee: previousAssignee ? previousAssignee.toString() : null,
          ipAddress,
          userAgent
        }
      });

      // Send assignment notifications
      await this.sendAssignmentNotifications(updatedClarification, assignee, previousAssignee);

      return {
        success: true,
        message: `Clarification assigned to ${assignee.firstName} ${assignee.lastName}`,
        assignment: {
          assignee: {
            id: assignee._id,
            name: `${assignee.firstName} ${assignee.lastName}`,
            email: assignee.email,
            department: assignee.department
          },
          assignedAt: new Date(),
          assignedBy: userId
        }
      };

    } catch (error) {
      logger.error('Error assigning clarification', { 
        error: error.message, 
        clarificationId, 
        assigneeId,
        userId 
      });
      throw new Error(`Failed to assign clarification: ${error.message}`);
    }
  }

  /**
   * Generate clarification reports
   */
  static async generateClarificationReport(reportType, filters = {}, userId) {
    try {
      const reportId = generateSequentialId('RPT');
      let reportData;

      switch (reportType) {
        case 'summary':
          reportData = await this.generateSummaryReport(filters);
          break;

        case 'response_time':
          reportData = await this.generateResponseTimeReport(filters);
          break;

        case 'by_type':
          reportData = await this.generateByTypeReport(filters);
          break;

        case 'by_procurement':
          reportData = await this.generateByProcurementReport(filters);
          break;

        case 'overdue':
          reportData = await this.generateOverdueReport(filters);
          break;

        case 'performance':
          reportData = await this.generatePerformanceReport(filters);
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      // Log report generation
      await auditService.logAuditEvent({
        action: 'clarification_report_generated',
        entityType: 'clarification',
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
      logger.error('Error generating clarification report', { 
        error: error.message, 
        reportType, 
        userId 
      });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  // Helper methods
  static async generateClarificationNumber(procurementId) {
    const procurement = await Procurement.findById(procurementId);
    if (!procurement) throw new Error('Procurement not found');

    const year = new Date().getFullYear();
    const prefix = `CL-${procurement.procurementNumber}`;
    
    const lastClarification = await Clarification.findOne({
      clarificationNumber: { $regex: `^${prefix}` }
    }).sort({ clarificationNumber: -1 });

    let sequence = 1;
    if (lastClarification) {
      const lastSequence = parseInt(lastClarification.clarificationNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
  }

  static async checkClarificationPeriod(procurement, rfqId) {
    // Check if clarification period is still open
    const now = new Date();
    
    if (rfqId) {
      const rfq = await RFQ.findById(rfqId);
      if (rfq && rfq.clarificationDeadline && now > rfq.clarificationDeadline) {
        return { allowed: false, reason: 'RFQ clarification deadline has passed' };
      }
    }
    
    if (procurement.clarificationDeadline && now > procurement.clarificationDeadline) {
      return { allowed: false, reason: 'Procurement clarification deadline has passed' };
    }

    return { allowed: true };
  }

  static async calculateResponseDeadline(procurement, priority, requestedDate, isUrgent) {
    let businessDays = 5; // Default
    
    if (isUrgent) businessDays = 1;
    else if (priority === CLARIFICATION_PRIORITY.CRITICAL) businessDays = 2;
    else if (priority === CLARIFICATION_PRIORITY.HIGH) businessDays = 3;
    else if (priority === CLARIFICATION_PRIORITY.MEDIUM) businessDays = 5;
    else if (priority === CLARIFICATION_PRIORITY.LOW) businessDays = 7;

    const calculatedDate = calculateBusinessDays(new Date(), businessDays);
    
    if (requestedDate) {
      const requested = new Date(requestedDate);
      return requested < calculatedDate ? requested : calculatedDate;
    }
    
    return calculatedDate;
  }

  static calculateEstimatedResponseTime(priority, type) {
    const baseTimes = {
      [CLARIFICATION_PRIORITY.CRITICAL]: '1-2 business days',
      [CLARIFICATION_PRIORITY.HIGH]: '2-3 business days', 
      [CLARIFICATION_PRIORITY.MEDIUM]: '3-5 business days',
      [CLARIFICATION_PRIORITY.LOW]: '5-7 business days'
    };

    const typeMultipliers = {
      [CLARIFICATION_TYPES.LEGAL]: 1.5,
      [CLARIFICATION_TYPES.TECHNICAL]: 1.2,
      [CLARIFICATION_TYPES.COMMERCIAL]: 1.0,
      [CLARIFICATION_TYPES.PROCEDURAL]: 0.8
    };

    return baseTimes[priority] || baseTimes[CLARIFICATION_PRIORITY.MEDIUM];
  }

  static calculateTimeRemaining(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  }

  static extractTags(subject, question) {
    const text = `${subject} ${question}`.toLowerCase();
    const tags = [];
    
    // Extract common procurement tags
    const tagPatterns = [
      /technical/g, /commercial/g, /legal/g, /specification/g,
      /timeline/g, /delivery/g, /payment/g, /contract/g,
      /evaluation/g, /criteria/g, /requirement/g
    ];
    
    tagPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        tags.push(...matches);
      }
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  static extractSearchKeywords(subject, question, category) {
    const text = `${subject} ${question} ${category || ''}`.toLowerCase();
    const words = text.match(/\b\w{3,}\b/g) || [];
    return [...new Set(words)].slice(0, 20); // Top 20 unique keywords
  }

  static getReportPeriod(filters) {
    if (filters.startDate && filters.endDate) {
      return `${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}`;
    }
    return 'All time';
  }

  // Placeholder methods for complex operations (to be implemented)
  static async canSubmitClarification(procurement, userId, rfqId) { 
    return { allowed: true }; 
  }
  static async getDefaultReviewers(procurement, type) { return []; }
  static async buildEscalationPath(procurement, priority) { return []; }
  static requiresApproval(type, visibility, isUrgent) { return false; }
  static async autoAssignClarification(clarification) { }
  static async processAttachments(attachments, userId) { return attachments; }
  static async processRelatedDocuments(documents, userId) { return documents; }
  static async checkClarificationAccess(clarification, userId) { 
    return { allowed: true, level: 2 }; 
  }
  static async getClarificationHistory(clarificationId) { return []; }
  static async getRelatedClarifications(clarification) { return []; }
  static async getClarificationPermissions(clarification, userId) { return {}; }
  static async buildAccessControlledQuery(userId) { return {}; }
  static async getClarificationsSummary(query) { return {}; }
  static async getAvailableFilters(userId) { return {}; }
  static async canRespondToClarification(clarification, userId) { return true; }
  static async canUpdateClarificationStatus(clarification, newStatus, userId) { return true; }
  static async canAssignClarification(clarification, userId) { return true; }
  static async canHandleClarificationType(user, type) { return true; }
  static async validateStatusTransition(oldStatus, newStatus, userId) { 
    return { valid: true }; 
  }
  static async handleStatusChangeActions(clarification, oldStatus, newStatus, userId) { }
  static async updateProcurementClarificationStatus(procurementId) { }

  // Notification methods
  static async sendSubmissionNotifications(clarification, procurement) { }
  static async sendResponseNotifications(clarification) { }
  static async sendStatusChangeNotifications(clarification, oldStatus, newStatus) { }
  static async sendAssignmentNotifications(clarification, assignee, previousAssignee) { }

  // Report generation methods
  static async generateSummaryReport(filters) { return { recordCount: 0 }; }
  static async generateResponseTimeReport(filters) { return { recordCount: 0 }; }
  static async generateByTypeReport(filters) { return { recordCount: 0 }; }
  static async generateByProcurementReport(filters) { return { recordCount: 0 }; }
  static async generateOverdueReport(filters) { return { recordCount: 0 }; }
  static async generatePerformanceReport(filters) { return { recordCount: 0 }; }
}

module.exports = ClarificationService;
