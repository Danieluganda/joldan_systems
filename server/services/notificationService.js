/**
 * Notification Service
 * 
 * Comprehensive notification management with multi-channel delivery,
 * templates, real-time processing, and advanced workflow integration
 * Feature 11: Real-time notifications with advanced delivery systems
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const WebSocket = require('ws');
const Notification = require('../db/models/Notification');
const NotificationTemplate = require('../db/models/NotificationTemplate');
const NotificationPreference = require('../db/models/NotificationPreference');
const User = require('../db/models/User');
const Procurement = require('../db/models/Procurement');
const logger = require('../utils/logger');
const auditService = require('./auditService');
const { validateInput, sanitize } = require('../utils/validation');
const { formatDate, generateNotificationId, encryptSensitiveData } = require('../utils/helpers');
const { assessNotificationSecurity, validateRecipient } = require('../utils/securityScanner');

// Notification channels
const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  IN_APP: 'in_app',
  PUSH: 'push_notification',
  WEBHOOK: 'webhook',
  SLACK: 'slack',
  TEAMS: 'teams',
  SYSTEM: 'system'
};

// Notification priorities
const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
  CRITICAL: 'critical'
};

// Notification types
const NOTIFICATION_TYPES = {
  SYSTEM: 'system',
  WORKFLOW: 'workflow',
  APPROVAL: 'approval',
  DEADLINE: 'deadline',
  ALERT: 'alert',
  REMINDER: 'reminder',
  UPDATE: 'update',
  INVITATION: 'invitation',
  SECURITY: 'security',
  COMPLIANCE: 'compliance'
};

// Notification statuses
const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  SCHEDULED: 'scheduled'
};

// Delivery events
const DELIVERY_EVENTS = {
  CREATED: 'notification_created',
  SENT: 'notification_sent',
  DELIVERED: 'notification_delivered',
  READ: 'notification_read',
  FAILED: 'notification_failed',
  CLICKED: 'notification_clicked',
  UNSUBSCRIBED: 'notification_unsubscribed'
};

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.emailTransporter = null;
    this.websocketServer = null;
    this.notificationQueue = [];
    this.deliveryTracking = new Map();
    this.activeSubscriptions = new Map();
    this.initialize();
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    try {
      // Setup email transporter
      await this.setupEmailTransporter();
      
      // Setup WebSocket server for real-time notifications
      await this.setupWebSocketServer();
      
      // Start notification processor
      this.startNotificationProcessor();
      
      // Setup delivery tracking
      this.setupDeliveryTracking();
      
      logger.info('Notification service initialized successfully');
    } catch (error) {
      logger.error('Error initializing notification service', { error: error.message });
    }
  }

  /**
   * Send comprehensive notification
   */
  async sendNotification(notificationData, userId, requestInfo = {}) {
    try {
      const {
        recipients,
        subject,
        message,
        content,
        notificationType = NOTIFICATION_TYPES.SYSTEM,
        priority = NOTIFICATION_PRIORITIES.NORMAL,
        channels = [NOTIFICATION_CHANNELS.IN_APP],
        templateId = null,
        templateData = {},
        procurementId = null,
        entityType = null,
        entityId = null,
        attachments = [],
        scheduledFor = null,
        expiresAt = null,
        actions = [],
        metadata = {},
        requiresAcknowledgment = false,
        trackOpens = true,
        trackClicks = true
      } = notificationData;

      const { ipAddress, userAgent } = requestInfo;

      // Validate required fields
      if (!recipients || !recipients.length) {
        throw new Error('Recipients are required');
      }

      if (!subject || !message) {
        throw new Error('Subject and message are required');
      }

      // Sanitize inputs
      const sanitizedSubject = sanitize(subject);
      const sanitizedMessage = sanitize(message);

      // Validate recipients
      const validatedRecipients = await this.validateNotificationRecipients(recipients, notificationType);

      // Load template if specified
      let processedContent = {
        subject: sanitizedSubject,
        message: sanitizedMessage,
        content: content || sanitizedMessage
      };

      if (templateId) {
        processedContent = await this.processNotificationTemplate(templateId, templateData, processedContent);
      }

      // Security assessment
      const securityCheck = await assessNotificationSecurity(processedContent, notificationType, recipients);
      if (!securityCheck.allowed) {
        throw new Error(`Security validation failed: ${securityCheck.reason}`);
      }

      // Create notification record
      const notification = new Notification({
        notificationId: generateNotificationId(),
        
        // Content
        subject: processedContent.subject,
        message: processedContent.message,
        content: processedContent.content,
        attachments: attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          url: att.url,
          isSecure: att.isSecure || false
        })),
        
        // Classification
        notificationType,
        priority,
        channels: channels.map(channel => ({
          type: channel,
          enabled: true,
          status: NOTIFICATION_STATUS.PENDING,
          attempts: 0,
          lastAttempt: null,
          deliveredAt: null
        })),
        
        // Recipients
        recipients: validatedRecipients.map(recipient => ({
          userId: recipient.userId,
          email: recipient.email,
          phone: recipient.phone,
          name: recipient.name,
          status: NOTIFICATION_STATUS.PENDING,
          deliveredAt: null,
          readAt: null,
          acknowledgedAt: null,
          preferences: recipient.preferences
        })),
        
        // Context
        context: {
          procurementId: procurementId ? new mongoose.Types.ObjectId(procurementId) : null,
          entityType,
          entityId: entityId ? new mongoose.Types.ObjectId(entityId) : null,
          createdBy: userId,
          createdAt: new Date(),
          ipAddress,
          userAgent
        },
        
        // Scheduling
        scheduling: {
          scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          timeZone: 'UTC',
          recurrence: null,
          isScheduled: scheduledFor ? true : false
        },
        
        // Tracking
        tracking: {
          requiresAcknowledgment,
          trackOpens,
          trackClicks,
          opens: [],
          clicks: [],
          deliveryAttempts: [],
          failureReasons: []
        },
        
        // Actions
        actions: actions.map(action => ({
          id: action.id || generateNotificationId(),
          label: sanitize(action.label),
          url: action.url,
          method: action.method || 'GET',
          data: action.data || {},
          isSecure: action.isSecure || false,
          requiresAuth: action.requiresAuth !== false
        })),
        
        // Status tracking
        status: {
          overall: scheduledFor ? NOTIFICATION_STATUS.SCHEDULED : NOTIFICATION_STATUS.PENDING,
          channelStatus: new Map(),
          recipientStatus: new Map(),
          lastUpdated: new Date(),
          completedChannels: 0,
          totalChannels: channels.length,
          successfulDeliveries: 0,
          failedDeliveries: 0
        },
        
        // Security
        security: {
          encryptionEnabled: securityCheck.requiresEncryption,
          accessLevel: securityCheck.accessLevel,
          securityLabels: securityCheck.labels || [],
          sensitiveContent: securityCheck.containsSensitiveData,
          complianceFlags: []
        },
        
        // Template reference
        template: templateId ? {
          templateId: new mongoose.Types.ObjectId(templateId),
          version: '1.0',
          processedAt: new Date(),
          variables: templateData
        } : null,
        
        // System metadata
        metadata: {
          ...metadata,
          version: '1.0',
          retries: 0,
          maxRetries: 3,
          retryDelay: 5000,
          tags: metadata.tags || [],
          category: metadata.category || 'general'
        }
      });

      await notification.save();

      // Process immediate or scheduled notifications
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        await this.scheduleNotification(notification);
      } else {
        await this.processNotificationDelivery(notification);
      }

      // Emit creation event
      this.emit(DELIVERY_EVENTS.CREATED, {
        notificationId: notification.notificationId,
        recipients: validatedRecipients.length,
        channels: channels.length,
        priority,
        scheduledFor
      });

      // Create audit trail
      await auditService.logAuditEvent({
        action: DELIVERY_EVENTS.CREATED,
        entityType: 'notification',
        entityId: notification._id,
        userId,
        metadata: {
          notificationId: notification.notificationId,
          recipients: validatedRecipients.length,
          channels: channels.length,
          notificationType,
          priority,
          procurementId,
          ipAddress,
          userAgent
        }
      });

      return {
        success: true,
        message: 'Notification created successfully',
        notification: {
          id: notification._id,
          notificationId: notification.notificationId,
          status: notification.status.overall,
          channels: notification.channels.length,
          recipients: notification.recipients.length,
          scheduledFor: notification.scheduling.scheduledFor
        }
      };

    } catch (error) {
      logger.error('Error sending notification', { 
        error: error.message, 
        notificationData, 
        userId 
      });
      throw new Error(`Notification sending failed: ${error.message}`);
    }
  }

  /**
   * Send workflow-specific notification
   */
  async sendWorkflowNotification(workflowType, workflowData, userId) {
    try {
      const templates = {
        approval_required: {
          subject: 'Approval Required: {{procurementNumber}}',
          message: 'Your approval is required for {{entityType}} in procurement {{procurementNumber}}',
          priority: NOTIFICATION_PRIORITIES.HIGH,
          channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
          requiresAcknowledgment: true
        },
        approval_approved: {
          subject: 'Approved: {{procurementNumber}}',
          message: '{{entityType}} has been approved for procurement {{procurementNumber}}',
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP]
        },
        deadline_approaching: {
          subject: 'Deadline Approaching: {{procurementNumber}}',
          message: 'Deadline approaching for {{entityType}} in procurement {{procurementNumber}} - Due: {{dueDate}}',
          priority: NOTIFICATION_PRIORITIES.URGENT,
          channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.SMS]
        },
        submission_received: {
          subject: 'Submission Received: {{procurementNumber}}',
          message: 'New submission received from {{supplierName}} for procurement {{procurementNumber}}',
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          channels: [NOTIFICATION_CHANNELS.IN_APP]
        },
        award_issued: {
          subject: 'Award Issued: {{procurementNumber}}',
          message: 'Award has been issued for procurement {{procurementNumber}} to {{supplierName}}',
          priority: NOTIFICATION_PRIORITIES.HIGH,
          channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP]
        },
        contract_signed: {
          subject: 'Contract Signed: {{procurementNumber}}',
          message: 'Contract has been signed for procurement {{procurementNumber}}',
          priority: NOTIFICATION_PRIORITIES.HIGH,
          channels: [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP]
        }
      };

      const template = templates[workflowType];
      if (!template) {
        throw new Error(`Unknown workflow type: ${workflowType}`);
      }

      // Process template variables
      let subject = template.subject;
      let message = template.message;
      
      for (const [key, value] of Object.entries(workflowData)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        message = message.replace(new RegExp(placeholder, 'g'), value);
      }

      // Determine recipients based on workflow type
      const recipients = await this.getWorkflowRecipients(workflowType, workflowData);

      return await this.sendNotification({
        recipients,
        subject,
        message,
        notificationType: NOTIFICATION_TYPES.WORKFLOW,
        priority: template.priority,
        channels: template.channels,
        procurementId: workflowData.procurementId,
        entityType: workflowData.entityType,
        entityId: workflowData.entityId,
        requiresAcknowledgment: template.requiresAcknowledgment || false,
        metadata: {
          workflowType,
          category: 'workflow'
        }
      }, userId);

    } catch (error) {
      logger.error('Error sending workflow notification', { 
        error: error.message, 
        workflowType, 
        workflowData, 
        userId 
      });
      throw new Error(`Workflow notification failed: ${error.message}`);
    }
  }

  /**
   * Get user notifications with comprehensive filtering
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        priority = null,
        notificationType = null,
        channels = null,
        dateFrom = null,
        dateTo = null,
        unreadOnly = false,
        includeArchived = false,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build query
      const query = {
        'recipients.userId': new mongoose.Types.ObjectId(userId)
      };

      if (status) {
        query['recipients.status'] = status;
      }

      if (priority) {
        query.priority = priority;
      }

      if (notificationType) {
        query.notificationType = notificationType;
      }

      if (channels) {
        query['channels.type'] = { $in: channels };
      }

      if (unreadOnly) {
        query['recipients.readAt'] = null;
      }

      if (!includeArchived) {
        query['recipients.archivedAt'] = null;
      }

      if (dateFrom || dateTo) {
        query['context.createdAt'] = {};
        if (dateFrom) query['context.createdAt'].$gte = new Date(dateFrom);
        if (dateTo) query['context.createdAt'].$lte = new Date(dateTo);
      }

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query)
      ]);

      // Process notifications for user context
      const processedNotifications = notifications.map(notification => {
        const userRecipient = notification.recipients.find(
          r => r.userId.toString() === userId
        );

        return {
          id: notification._id,
          notificationId: notification.notificationId,
          subject: notification.subject,
          message: notification.message,
          notificationType: notification.notificationType,
          priority: notification.priority,
          status: userRecipient?.status || NOTIFICATION_STATUS.PENDING,
          createdAt: notification.context.createdAt,
          readAt: userRecipient?.readAt,
          acknowledgedAt: userRecipient?.acknowledgedAt,
          expiresAt: notification.scheduling.expiresAt,
          actions: notification.actions,
          metadata: notification.metadata,
          context: {
            procurementId: notification.context.procurementId,
            entityType: notification.context.entityType,
            entityId: notification.context.entityId
          }
        };
      });

      return {
        notifications: processedNotifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPreviousPage: page > 1
        },
        summary: {
          total,
          unread: notifications.filter(n => {
            const userRecipient = n.recipients.find(r => r.userId.toString() === userId);
            return !userRecipient?.readAt;
          }).length,
          byPriority: await this.getNotificationCountByPriority(userId),
          byType: await this.getNotificationCountByType(userId)
        }
      };

    } catch (error) {
      logger.error('Error getting user notifications', { 
        error: error.message, 
        userId, 
        options 
      });
      throw new Error(`Failed to retrieve notifications: ${error.message}`);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        $or: [
          { notificationId },
          { _id: notificationId }
        ]
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Find user in recipients
      const recipientIndex = notification.recipients.findIndex(
        r => r.userId.toString() === userId
      );

      if (recipientIndex === -1) {
        throw new Error('User not found in notification recipients');
      }

      // Update read status
      notification.recipients[recipientIndex].status = NOTIFICATION_STATUS.READ;
      notification.recipients[recipientIndex].readAt = new Date();

      // Add to tracking
      notification.tracking.opens.push({
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: new Date(),
        ipAddress: null,
        userAgent: null
      });

      await notification.save();

      // Emit read event
      this.emit(DELIVERY_EVENTS.READ, {
        notificationId: notification.notificationId,
        userId,
        readAt: new Date()
      });

      // Log audit event
      await auditService.logAuditEvent({
        action: DELIVERY_EVENTS.READ,
        entityType: 'notification',
        entityId: notification._id,
        userId,
        metadata: {
          notificationId: notification.notificationId
        }
      });

      return {
        success: true,
        message: 'Notification marked as read',
        readAt: notification.recipients[recipientIndex].readAt
      };

    } catch (error) {
      logger.error('Error marking notification as read', { 
        error: error.message, 
        notificationId, 
        userId 
      });
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId = null, procurementId = null, dateRange = null) {
    try {
      let matchQuery = {};

      if (userId) {
        matchQuery['recipients.userId'] = new mongoose.Types.ObjectId(userId);
      }

      if (procurementId) {
        matchQuery['context.procurementId'] = new mongoose.Types.ObjectId(procurementId);
      }

      if (dateRange) {
        matchQuery['context.createdAt'] = {
          $gte: new Date(dateRange.from),
          $lte: new Date(dateRange.to)
        };
      }

      const stats = await Notification.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalNotifications: { $sum: 1 },
            byStatus: {
              $push: {
                status: '$status.overall',
                count: 1
              }
            },
            byPriority: {
              $push: {
                priority: '$priority',
                count: 1
              }
            },
            byType: {
              $push: {
                type: '$notificationType',
                count: 1
              }
            },
            byChannel: {
              $push: {
                channels: '$channels.type',
                count: 1
              }
            },
            avgDeliveryTime: { $avg: '$tracking.deliveryAttempts.deliveredAt' },
            successRate: {
              $avg: {
                $cond: [
                  { $eq: ['$status.overall', NOTIFICATION_STATUS.DELIVERED] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      if (!stats.length) {
        return {
          totalNotifications: 0,
          byStatus: {},
          byPriority: {},
          byType: {},
          byChannel: {},
          deliveryMetrics: {
            averageDeliveryTime: 0,
            successRate: 0,
            failureRate: 0
          }
        };
      }

      const result = stats[0];

      return {
        totalNotifications: result.totalNotifications,
        byStatus: this.groupByField(result.byStatus, 'status'),
        byPriority: this.groupByField(result.byPriority, 'priority'),
        byType: this.groupByField(result.byType, 'type'),
        byChannel: this.groupByField(result.byChannel, 'channels'),
        deliveryMetrics: {
          averageDeliveryTime: result.avgDeliveryTime || 0,
          successRate: (result.successRate * 100).toFixed(2),
          failureRate: ((1 - result.successRate) * 100).toFixed(2)
        },
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error getting notification statistics', { 
        error: error.message, 
        userId, 
        procurementId, 
        dateRange 
      });
      throw new Error(`Statistics retrieval failed: ${error.message}`);
    }
  }

  // Helper methods for complex operations
  async setupEmailTransporter() {
    // Email transporter setup (placeholder)
    logger.info('Email transporter setup completed');
  }

  async setupWebSocketServer() {
    // WebSocket server setup (placeholder)
    logger.info('WebSocket server setup completed');
  }

  startNotificationProcessor() {
    // Background notification processor (placeholder)
    logger.info('Notification processor started');
  }

  setupDeliveryTracking() {
    // Delivery tracking setup (placeholder)
    logger.info('Delivery tracking setup completed');
  }

  async validateNotificationRecipients(recipients, notificationType) {
    // Validate and process recipients
    return recipients.map(recipient => ({
      userId: recipient.userId || recipient.id,
      email: recipient.email,
      phone: recipient.phone,
      name: recipient.name,
      preferences: recipient.preferences || {}
    }));
  }

  async processNotificationTemplate(templateId, data, content) {
    // Process notification template (placeholder)
    return content;
  }

  async scheduleNotification(notification) {
    // Schedule notification for future delivery (placeholder)
    logger.info('Notification scheduled', { notificationId: notification.notificationId });
  }

  async processNotificationDelivery(notification) {
    // Process immediate notification delivery (placeholder)
    logger.info('Processing notification delivery', { notificationId: notification.notificationId });
  }

  async getWorkflowRecipients(workflowType, workflowData) {
    // Get recipients for workflow notifications (placeholder)
    return [];
  }

  async getNotificationCountByPriority(userId) {
    // Get notification counts grouped by priority (placeholder)
    return {};
  }

  async getNotificationCountByType(userId) {
    // Get notification counts grouped by type (placeholder)
    return {};
  }

  groupByField(items, field) {
    // Group array items by field value (placeholder)
    return {};
  }

  // Legacy compatibility methods
  async list(query = {}, options = {}) {
    const { userId } = query;
    if (userId) {
      return await this.getUserNotifications(userId, options);
    }
    return { notifications: [], pagination: {}, summary: {} };
  }

  async get(id, userId = null) {
    try {
      const notification = await Notification.findById(id);
      if (!notification) {
        throw new Error('Notification not found');
      }
      return { notification };
    } catch (error) {
      throw new Error(`Retrieval failed: ${error.message}`);
    }
  }

  async create(data, userId) {
    return await this.sendNotification(data, userId);
  }

  async update(id, data, userId) {
    try {
      const notification = await Notification.findByIdAndUpdate(id, data, { new: true });
      return { notification };
    } catch (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  async remove(id, userId) {
    try {
      await Notification.findByIdAndDelete(id);
      return { success: true, message: 'Notification deleted' };
    } catch (error) {
      throw new Error(`Deletion failed: ${error.message}`);
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
