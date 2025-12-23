/**
 * Notification Management Routes
 * 
 * Routes for comprehensive notification system with real-time delivery, templates, and preferences
 * Feature 16: Advanced notification system with multi-channel delivery, templates, and analytics
 * 
 * Enhanced with real-time WebSocket support, email/SMS/push notifications, template management,
 * user preferences, delivery tracking, analytics, and comprehensive notification lifecycle management
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { verifyToken, checkPermission, checkAnyPermission, requireOwnershipOrPermission, rateLimitByUser } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, sanitize, validateFileUpload } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { logCreate, logUpdate, logDelete, logView, logStatusChange } = require('../middleware/auditLogger');

// Service imports
const notificationService = require('../services/notificationService');
const templateService = require('../services/templateService');
const userPreferenceService = require('../services/userPreferenceService');
const deliveryService = require('../services/deliveryService');
const analyticsService = require('../services/analyticsService');
const subscriptionService = require('../services/subscriptionService');
const webhookService = require('../services/webhookService');

// Utility imports
const { formatNotificationContent, validateDeliveryChannel } = require('../utils/notificationUtils');
const logger = require('../utils/logger');
const { WebSocketManager } = require('../utils/websocket');

// WebSocket manager for real-time notifications
const wsManager = new WebSocketManager();

// Validation schemas
const notificationValidation = {
  create: {
    title: { type: 'string', required: true, minLength: 3, maxLength: 200 },
    message: { type: 'string', required: true, minLength: 10, maxLength: 2000 },
    type: { 
      type: 'string', 
      enum: ['info', 'warning', 'error', 'success', 'urgent', 'reminder'], 
      required: true 
    },
    category: { 
      type: 'string', 
      enum: [
        'system', 'rfq', 'submission', 'evaluation', 'award', 'contract', 
        'approval', 'document', 'user', 'compliance', 'deadline', 'security'
      ], 
      required: true 
    },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    recipients: { 
      type: 'array', 
      items: { type: 'string' }, 
      required: true, 
      minItems: 1, 
      maxItems: 1000 
    },
    channels: { 
      type: 'array', 
      items: { 
        type: 'string', 
        enum: ['in_app', 'email', 'sms', 'push', 'webhook', 'slack', 'teams'] 
      },
      default: ['in_app']
    },
    data: { type: 'object' },
    templateId: { type: 'string' },
    scheduledFor: { type: 'string', format: 'datetime' },
    expiresAt: { type: 'string', format: 'datetime' },
    actionUrl: { type: 'string', format: 'url' },
    actionText: { type: 'string', maxLength: 50 },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object' },
    requiresAcknowledgment: { type: 'boolean', default: false },
    allowDismiss: { type: 'boolean', default: true },
    showOnDashboard: { type: 'boolean', default: true },
    attachments: { type: 'array', items: { type: 'string' } },
    relatedEntity: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['rfq', 'submission', 'contract', 'evaluation', 'award'] },
        id: { type: 'string' },
        name: { type: 'string' }
      }
    }
  },
  update: {
    title: { type: 'string', minLength: 3, maxLength: 200 },
    message: { type: 'string', minLength: 10, maxLength: 2000 },
    type: { type: 'string', enum: ['info', 'warning', 'error', 'success', 'urgent', 'reminder'] },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
    expiresAt: { type: 'string', format: 'datetime' },
    actionUrl: { type: 'string', format: 'url' },
    actionText: { type: 'string', maxLength: 50 },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object' },
    showOnDashboard: { type: 'boolean' },
    attachments: { type: 'array', items: { type: 'string' } }
  },
  query: {
    type: { type: 'string', enum: ['info', 'warning', 'error', 'success', 'urgent', 'reminder'] },
    category: { 
      type: 'string', 
      enum: [
        'system', 'rfq', 'submission', 'evaluation', 'award', 'contract', 
        'approval', 'document', 'user', 'compliance', 'deadline', 'security'
      ]
    },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
    status: { type: 'string', enum: ['pending', 'sent', 'delivered', 'read', 'dismissed', 'expired', 'failed'] },
    isRead: { type: 'boolean' },
    isDismissed: { type: 'boolean' },
    requiresAcknowledgment: { type: 'boolean' },
    isAcknowledged: { type: 'boolean' },
    createdBy: { type: 'string' },
    recipientId: { type: 'string' },
    channel: { type: 'string', enum: ['in_app', 'email', 'sms', 'push', 'webhook', 'slack', 'teams'] },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    search: { type: 'string', minLength: 3, maxLength: 100 },
    tags: { type: 'string' }, // Comma-separated tags
    relatedEntityType: { type: 'string', enum: ['rfq', 'submission', 'contract', 'evaluation', 'award'] },
    relatedEntityId: { type: 'string' },
    showExpired: { type: 'boolean', default: false },
    includeSystemNotifications: { type: 'boolean', default: true },
    page: { type: 'number', min: 1, default: 1 },
    limit: { type: 'number', min: 1, max: 200, default: 50 },
    sortBy: { 
      type: 'string', 
      enum: ['createdAt', 'priority', 'type', 'status', 'expiresAt'], 
      default: 'createdAt' 
    },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
    includeDeliveryStatus: { type: 'boolean', default: false },
    includeMetrics: { type: 'boolean', default: false }
  },
  params: {
    id: { type: 'string', required: true, minLength: 1 }
  },
  template: {
    name: { type: 'string', required: true, minLength: 3, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    category: { 
      type: 'string', 
      enum: [
        'system', 'rfq', 'submission', 'evaluation', 'award', 'contract', 
        'approval', 'document', 'user', 'compliance', 'deadline', 'security'
      ], 
      required: true 
    },
    titleTemplate: { type: 'string', required: true, maxLength: 200 },
    messageTemplate: { type: 'string', required: true, maxLength: 2000 },
    type: { type: 'string', enum: ['info', 'warning', 'error', 'success', 'urgent', 'reminder'], required: true },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    defaultChannels: { 
      type: 'array', 
      items: { type: 'string', enum: ['in_app', 'email', 'sms', 'push'] },
      default: ['in_app']
    },
    variables: { type: 'array', items: { type: 'object' } },
    isActive: { type: 'boolean', default: true },
    isSystem: { type: 'boolean', default: false },
    tags: { type: 'array', items: { type: 'string' } }
  },
  preferences: {
    emailNotifications: { type: 'boolean', default: true },
    smsNotifications: { type: 'boolean', default: false },
    pushNotifications: { type: 'boolean', default: true },
    inAppNotifications: { type: 'boolean', default: true },
    digestFrequency: { type: 'string', enum: ['immediate', 'hourly', 'daily', 'weekly'], default: 'immediate' },
    quietHours: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: false },
        startTime: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
        endTime: { type: 'string', pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' },
        timezone: { type: 'string', default: 'UTC' }
      }
    },
    categoryPreferences: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          channels: { type: 'array', items: { type: 'string' } },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] }
        }
      }
    },
    webhookUrl: { type: 'string', format: 'url' },
    slackWebhook: { type: 'string', format: 'url' },
    teamsWebhook: { type: 'string', format: 'url' }
  },
  bulk: {
    action: { type: 'string', enum: ['mark_read', 'mark_unread', 'dismiss', 'delete', 'acknowledge'], required: true },
    notificationIds: { type: 'array', items: { type: 'string' }, required: true, minItems: 1, maxItems: 100 },
    filters: { type: 'object' }
  }
};

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user with advanced filtering
 * @access  Private - requires 'notifications:read' permission
 */
router.get('/',
  verifyToken,
  checkPermission('notifications:read'),
  validateQuery(notificationValidation.query),
  sanitize(),
  logView('notifications', 'list'),
  asyncHandler(async (req, res) => {
    const {
      type,
      category,
      priority,
      status,
      isRead,
      isDismissed,
      requiresAcknowledgment,
      isAcknowledged,
      createdBy,
      recipientId,
      channel,
      startDate,
      endDate,
      search,
      tags,
      relatedEntityType,
      relatedEntityId,
      showExpired = false,
      includeSystemNotifications = true,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeliveryStatus = false,
      includeMetrics = false
    } = req.query;

    // Build filter criteria
    const filters = {
      recipientId: recipientId || req.user.id, // Default to current user
      type,
      category,
      priority,
      status,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      isDismissed: isDismissed !== undefined ? isDismissed === 'true' : undefined,
      requiresAcknowledgment: requiresAcknowledgment !== undefined ? requiresAcknowledgment === 'true' : undefined,
      isAcknowledged: isAcknowledged !== undefined ? isAcknowledged === 'true' : undefined,
      createdBy,
      channel,
      relatedEntity: relatedEntityType || relatedEntityId ? {
        type: relatedEntityType,
        id: relatedEntityId
      } : undefined,
      dateRange: startDate || endDate ? {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined
      } : undefined,
      textSearch: search,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      showExpired: showExpired === 'true',
      includeSystem: includeSystemNotifications === 'true'
    };

    // Apply admin-level filtering
    if (!req.user.permissions.includes('notifications:read:all') && recipientId && recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot access other users notifications'
      });
    }

    const result = await notificationService.getNotifications({
      filters,
      pagination: { page: parseInt(page), limit: parseInt(limit) },
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      includeDeliveryStatus: includeDeliveryStatus === 'true',
      includeRelatedEntities: true,
      includeAttachments: true
    });

    // Get metrics if requested
    let metrics = null;
    if (includeMetrics === 'true') {
      metrics = await notificationService.getUserNotificationMetrics(req.user.id);
    }

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: result.totalPages,
        totalRecords: result.totalRecords,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      summary: {
        unreadCount: result.unreadCount,
        urgentCount: result.urgentCount,
        acknowledgeRequiredCount: result.acknowledgeRequiredCount,
        expiringSoonCount: result.expiringSoonCount,
        typeBreakdown: result.typeBreakdown,
        categoryBreakdown: result.categoryBreakdown
      },
      metrics,
      filters
    });
  })
);

/**
 * @route   POST /api/notifications
 * @desc    Create new notification
 * @access  Private - requires 'notifications:create' permission
 */
router.post('/',
  verifyToken,
  checkPermission('notifications:create'),
  rateLimitByUser(100, '1h'), // 100 notifications per hour per user
  validateBody(notificationValidation.create),
  sanitize(),
  logCreate('notifications'),
  asyncHandler(async (req, res) => {
    const notificationData = {
      ...req.body,
      createdBy: req.user.id,
      status: req.body.scheduledFor ? 'scheduled' : 'pending'
    };

    // Validate template if provided
    if (notificationData.templateId) {
      const template = await templateService.getById(notificationData.templateId);
      if (!template || !template.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive template'
        });
      }

      // Merge template data
      notificationData.title = template.titleTemplate;
      notificationData.message = template.messageTemplate;
      notificationData.type = template.type;
      notificationData.priority = template.priority;
      notificationData.channels = notificationData.channels || template.defaultChannels;
    }

    // Validate recipients exist
    const recipientValidation = await notificationService.validateRecipients(notificationData.recipients);
    if (!recipientValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: recipientValidation.message,
        invalidRecipients: recipientValidation.invalidRecipients
      });
    }

    // Validate delivery channels
    for (const channel of notificationData.channels || ['in_app']) {
      if (!validateDeliveryChannel(channel)) {
        return res.status(400).json({
          success: false,
          message: `Invalid delivery channel: ${channel}`
        });
      }
    }

    // Create notification
    const notification = await notificationService.create(notificationData);

    // If not scheduled, send immediately
    if (!notificationData.scheduledFor) {
      await notificationService.send(notification.id);
      
      // Send real-time notifications via WebSocket
      for (const recipientId of notificationData.recipients) {
        wsManager.sendToUser(recipientId, 'notification', {
          type: 'new_notification',
          data: notification
        });
      }
    }

    res.status(201).json({
      success: true,
      data: notification,
      message: notificationData.scheduledFor ? 
        'Notification scheduled successfully' : 
        'Notification created and sent successfully'
    });
  })
);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private - requires 'notifications:read' permission
 */
router.get('/:id',
  verifyToken,
  checkPermission('notifications:read'),
  validateParams(notificationValidation.params),
  requireOwnershipOrPermission('id', 'recipientId', 'notifications:read:all'),
  logView('notifications', 'detail'),
  asyncHandler(async (req, res) => {
    const notification = await notificationService.getById(req.params.id, {
      includeDeliveryStatus: true,
      includeRelatedEntity: true,
      includeAttachments: true,
      includeAuditTrail: true
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Mark as read if accessed by recipient
    if (notification.recipientId === req.user.id && !notification.isRead) {
      await notificationService.markAsRead(req.params.id, req.user.id);
      
      // Send real-time update
      wsManager.sendToUser(req.user.id, 'notification', {
        type: 'notification_read',
        data: { id: req.params.id }
      });
    }

    res.json({
      success: true,
      data: notification
    });
  })
);

/**
 * @route   PUT /api/notifications/:id
 * @desc    Update notification (only if not sent)
 * @access  Private - requires 'notifications:update' permission
 */
router.put('/:id',
  verifyToken,
  checkAnyPermission(['notifications:update', 'notifications:update:own']),
  validateParams(notificationValidation.params),
  validateBody(notificationValidation.update),
  sanitize(),
  requireOwnershipOrPermission('id', 'createdBy', 'notifications:update:all'),
  logUpdate('notifications'),
  asyncHandler(async (req, res) => {
    const notificationId = req.params.id;
    const updates = req.body;

    const existingNotification = await notificationService.getById(notificationId);
    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if notification can be modified
    const modifiableStates = ['pending', 'scheduled', 'failed'];
    if (!modifiableStates.includes(existingNotification.status)) {
      return res.status(400).json({
        success: false,
        message: 'Notification cannot be modified after being sent'
      });
    }

    // Add update metadata
    updates.updatedBy = req.user.id;
    updates.updatedAt = new Date();

    const updatedNotification = await notificationService.update(notificationId, updates);

    res.json({
      success: true,
      data: updatedNotification,
      message: 'Notification updated successfully'
    });
  })
);

/**
 * @route   POST /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private - requires 'notifications:read' permission
 */
router.post('/:id/read',
  verifyToken,
  checkPermission('notifications:read'),
  validateParams(notificationValidation.params),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await notificationService.getById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user is the recipient
    if (notification.recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only mark own notifications as read'
      });
    }

    if (notification.isRead) {
      return res.status(400).json({
        success: false,
        message: 'Notification already marked as read'
      });
    }

    await notificationService.markAsRead(id, req.user.id);

    // Send real-time update
    wsManager.sendToUser(req.user.id, 'notification', {
      type: 'notification_read',
      data: { id }
    });

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  })
);

/**
 * @route   POST /api/notifications/:id/unread
 * @desc    Mark notification as unread
 * @access  Private - requires 'notifications:read' permission
 */
router.post('/:id/unread',
  verifyToken,
  checkPermission('notifications:read'),
  validateParams(notificationValidation.params),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await notificationService.getById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only modify own notifications'
      });
    }

    if (!notification.isRead) {
      return res.status(400).json({
        success: false,
        message: 'Notification already marked as unread'
      });
    }

    await notificationService.markAsUnread(id, req.user.id);

    // Send real-time update
    wsManager.sendToUser(req.user.id, 'notification', {
      type: 'notification_unread',
      data: { id }
    });

    res.json({
      success: true,
      message: 'Notification marked as unread'
    });
  })
);

/**
 * @route   POST /api/notifications/:id/dismiss
 * @desc    Dismiss notification
 * @access  Private - requires 'notifications:read' permission
 */
router.post('/:id/dismiss',
  verifyToken,
  checkPermission('notifications:read'),
  validateParams(notificationValidation.params),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await notificationService.getById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only dismiss own notifications'
      });
    }

    if (!notification.allowDismiss) {
      return res.status(400).json({
        success: false,
        message: 'This notification cannot be dismissed'
      });
    }

    if (notification.isDismissed) {
      return res.status(400).json({
        success: false,
        message: 'Notification already dismissed'
      });
    }

    await notificationService.dismiss(id, req.user.id);

    // Send real-time update
    wsManager.sendToUser(req.user.id, 'notification', {
      type: 'notification_dismissed',
      data: { id }
    });

    res.json({
      success: true,
      message: 'Notification dismissed successfully'
    });
  })
);

/**
 * @route   POST /api/notifications/:id/acknowledge
 * @desc    Acknowledge notification
 * @access  Private - requires 'notifications:read' permission
 */
router.post('/:id/acknowledge',
  verifyToken,
  checkPermission('notifications:read'),
  validateParams(notificationValidation.params),
  validateBody({
    acknowledgmentNote: { type: 'string', maxLength: 500 }
  }),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { acknowledgmentNote } = req.body;

    const notification = await notificationService.getById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only acknowledge own notifications'
      });
    }

    if (!notification.requiresAcknowledgment) {
      return res.status(400).json({
        success: false,
        message: 'This notification does not require acknowledgment'
      });
    }

    if (notification.isAcknowledged) {
      return res.status(400).json({
        success: false,
        message: 'Notification already acknowledged'
      });
    }

    await notificationService.acknowledge(id, req.user.id, acknowledgmentNote);

    // Send real-time update
    wsManager.sendToUser(req.user.id, 'notification', {
      type: 'notification_acknowledged',
      data: { id }
    });

    res.json({
      success: true,
      message: 'Notification acknowledged successfully'
    });
  })
);

/**
 * @route   POST /api/notifications/bulk
 * @desc    Bulk operations on notifications
 * @access  Private - requires 'notifications:read' permission
 */
router.post('/bulk',
  verifyToken,
  checkPermission('notifications:read'),
  validateBody(notificationValidation.bulk),
  sanitize(),
  asyncHandler(async (req, res) => {
    const { action, notificationIds, filters } = req.body;

    // Validate user owns all notifications or has admin permissions
    if (!req.user.permissions.includes('notifications:read:all')) {
      const notifications = await notificationService.getByIds(notificationIds);
      const invalidAccess = notifications.some(n => n.recipientId !== req.user.id);
      
      if (invalidAccess) {
        return res.status(403).json({
          success: false,
          message: 'Cannot perform bulk operations on other users notifications'
        });
      }
    }

    const result = await notificationService.bulkOperation({
      action,
      notificationIds,
      filters,
      userId: req.user.id
    });

    // Send real-time updates for affected notifications
    if (result.success) {
      wsManager.sendToUser(req.user.id, 'notification', {
        type: 'bulk_operation',
        data: {
          action,
          affectedIds: result.affectedIds,
          count: result.count
        }
      });
    }

    res.json({
      success: true,
      data: result,
      message: `Successfully ${action.replace('_', ' ')}ed ${result.count} notifications`
    });
  })
);

/**
 * @route   GET /api/notifications/templates
 * @desc    Get notification templates
 * @access  Private - requires 'notifications:read' permission
 */
router.get('/templates',
  verifyToken,
  checkPermission('notifications:read'),
  validateQuery({
    category: { 
      type: 'string', 
      enum: [
        'system', 'rfq', 'submission', 'evaluation', 'award', 'contract', 
        'approval', 'document', 'user', 'compliance', 'deadline', 'security'
      ]
    },
    type: { type: 'string', enum: ['info', 'warning', 'error', 'success', 'urgent', 'reminder'] },
    isActive: { type: 'boolean' },
    includeSystem: { type: 'boolean', default: false }
  }),
  logView('notifications', 'templates'),
  asyncHandler(async (req, res) => {
    const { category, type, isActive, includeSystem = false } = req.query;

    const templates = await templateService.getNotificationTemplates({
      category,
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      includeSystem: includeSystem === 'true',
      userId: req.user.id
    });

    res.json({
      success: true,
      data: templates
    });
  })
);

/**
 * @route   POST /api/notifications/templates
 * @desc    Create notification template
 * @access  Private - requires 'notifications:template' permission
 */
router.post('/templates',
  verifyToken,
  checkPermission('notifications:template'),
  validateBody(notificationValidation.template),
  sanitize(),
  logCreate('notification_templates'),
  asyncHandler(async (req, res) => {
    const templateData = {
      ...req.body,
      createdBy: req.user.id
    };

    const template = await templateService.createNotificationTemplate(templateData);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Notification template created successfully'
    });
  })
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get user notification preferences
 * @access  Private - requires 'notifications:read' permission
 */
router.get('/preferences',
  verifyToken,
  checkPermission('notifications:read'),
  logView('notifications', 'preferences'),
  asyncHandler(async (req, res) => {
    const preferences = await userPreferenceService.getNotificationPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences
    });
  })
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update user notification preferences
 * @access  Private - requires 'notifications:read' permission
 */
router.put('/preferences',
  verifyToken,
  checkPermission('notifications:read'),
  validateBody(notificationValidation.preferences),
  sanitize(),
  logUpdate('notification_preferences'),
  asyncHandler(async (req, res) => {
    const preferences = await userPreferenceService.updateNotificationPreferences(
      req.user.id, 
      req.body
    );

    res.json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated successfully'
    });
  })
);

/**
 * @route   GET /api/notifications/analytics
 * @desc    Get notification analytics
 * @access  Private - requires 'notifications:read' permission
 */
router.get('/analytics',
  verifyToken,
  checkPermission('notifications:read'),
  validateQuery({
    timeframe: { type: 'string', enum: ['7d', '30d', '90d', '180d'], default: '30d' },
    includeDeliveryStats: { type: 'boolean', default: true },
    includeEngagementStats: { type: 'boolean', default: true }
  }),
  logView('notifications', 'analytics'),
  asyncHandler(async (req, res) => {
    const { timeframe = '30d', includeDeliveryStats = true, includeEngagementStats = true } = req.query;

    const analytics = await analyticsService.getNotificationAnalytics({
      timeframe,
      userId: req.user.permissions.includes('notifications:read:all') ? null : req.user.id,
      includeDeliveryStats: includeDeliveryStats === 'true',
      includeEngagementStats: includeEngagementStats === 'true'
    });

    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * @route   POST /api/notifications/:id/resend
 * @desc    Resend failed notification
 * @access  Private - requires 'notifications:send' permission
 */
router.post('/:id/resend',
  verifyToken,
  checkPermission('notifications:send'),
  validateParams(notificationValidation.params),
  validateBody({
    channels: { 
      type: 'array', 
      items: { type: 'string', enum: ['in_app', 'email', 'sms', 'push', 'webhook'] }
    }
  }),
  logStatusChange('notifications'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { channels } = req.body;

    const notification = await notificationService.getById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user can resend this notification
    if (notification.createdBy !== req.user.id && !req.user.permissions.includes('notifications:send:all')) {
      return res.status(403).json({
        success: false,
        message: 'Cannot resend notifications created by others'
      });
    }

    const result = await notificationService.resend(id, {
      channels: channels || notification.channels,
      resentBy: req.user.id
    });

    res.json({
      success: true,
      data: result,
      message: 'Notification resent successfully'
    });
  })
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification (soft delete)
 * @access  Private - requires 'notifications:delete' permission
 */
router.delete('/:id',
  verifyToken,
  checkAnyPermission(['notifications:delete', 'notifications:delete:own']),
  validateParams(notificationValidation.params),
  requireOwnershipOrPermission('id', 'createdBy', 'notifications:delete:all'),
  logDelete('notifications'),
  asyncHandler(async (req, res) => {
    const notificationId = req.params.id;

    const notification = await notificationService.getById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const result = await notificationService.softDelete(notificationId, {
      deletedBy: req.user.id,
      reason: req.body.reason || 'Deleted by user'
    });

    res.json({
      success: true,
      data: result,
      message: 'Notification deleted successfully'
    });
  })
);

module.exports = router;
