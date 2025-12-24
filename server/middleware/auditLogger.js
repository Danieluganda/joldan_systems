/**
 * Audit Logger Middleware
 * 
 * Logs all state-changing operations for compliance and audit trails
 * Feature 11: Audit trail logging
 * 
 * Enhanced with comprehensive tracking, error handling, and metadata
 */

const logger = require('../utils/logger');
const AuditLog = require('../db/models/AuditLog');

/**
 * Log entity creation
 * @param {string} entityType - Type of entity being created
 * @returns {Function} Express middleware function
 */
const logCreate = (entityType) => {
  return async (req, res, next) => {
    // Store original entity data if available (for GET requests before creation)
    let originalEntity = null;
    if (req.params.id) {
      try {
        // Attempt to get original entity for better audit trail
        const Model = require(`../db/models/${entityType}`);
        originalEntity = await Model.findById(req.params.id);
      } catch (error) {
        // Ignore if model doesn't exist or entity not found
      }
    }

    // Capture response to log what was created
    const originalJson = res.json;
    res.json = async function (data) {
      try {
        if (data && (data.success || data.data || data.id)) {
          const entityData = data.data || data;
          await AuditLog.create({
            userId: req.user?.id || req.user?.userId || null,
            userEmail: req.user?.email || null,
            action: 'create',
            entityType,
            entityId: entityData.id || entityData._id || req.params.id,
            oldValues: originalEntity ? JSON.stringify(originalEntity) : null,
            newValues: JSON.stringify(entityData),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            requestId: req.id,
            description: `Created new ${entityType}: ${entityData.title || entityData.name || entityData.reference || entityData.id || 'Unknown'}`,
            timestamp: new Date(),
            metadata: {
              requestMethod: req.method,
              requestPath: req.path,
              requestQuery: req.query,
              responseStatus: res.statusCode
            }
          });
        }
      } catch (error) {
        logger.error('Failed to log create audit', { 
          error: error.message,
          entityType,
          userId: req.user?.id,
          stack: error.stack
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Log entity update
 * @param {string} entityType - Type of entity being updated
 * @returns {Function} Express middleware function
 */
const logUpdate = (entityType) => {
  return async (req, res, next) => {
    // Store original entity data before update
    let originalEntity = null;
    
    try {
      if (req.params.id) {
        const Model = require(`../db/models/${entityType}`);
        originalEntity = await Model.findById(req.params.id);
      }
    } catch (error) {
      logger.warn('Could not fetch original entity for audit', {
        entityType,
        entityId: req.params.id,
        error: error.message
      });
    }

    const originalJson = res.json;
    res.json = async function (data) {
      try {
        if (data && (data.success || data.data || data.id)) {
          const entityData = data.data || data;
          const changes = {};
          
          // Calculate what changed
          if (originalEntity && req.body) {
            Object.keys(req.body).forEach(key => {
              if (originalEntity[key] !== req.body[key]) {
                changes[key] = {
                  from: originalEntity[key],
                  to: req.body[key]
                };
              }
            });
          }

          await AuditLog.create({
            userId: req.user?.id || req.user?.userId || null,
            userEmail: req.user?.email || null,
            action: 'update',
            entityType,
            entityId: entityData.id || entityData._id || req.params.id,
            oldValues: originalEntity ? JSON.stringify(originalEntity) : JSON.stringify(req.body),
            newValues: JSON.stringify(entityData),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            requestId: req.id,
            description: `Updated ${entityType} ID: ${entityData.id || req.params.id} - ${Object.keys(changes).join(', ') || 'Fields updated'}`,
            timestamp: new Date(),
            metadata: {
              requestMethod: req.method,
              requestPath: req.path,
              requestQuery: req.query,
              responseStatus: res.statusCode,
              changedFields: Object.keys(changes),
              changes: changes
            }
          });
        }
      } catch (error) {
        logger.error('Failed to log update audit', {
          error: error.message,
          entityType,
          entityId: req.params.id,
          userId: req.user?.id,
          stack: error.stack
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Log entity deletion
 * @param {string} entityType - Type of entity being deleted
 * @returns {Function} Express middleware function
 */
const logDelete = (entityType) => {
  return async (req, res, next) => {
    // Store original entity data before deletion
    let originalEntity = null;
    
    try {
      if (req.params.id) {
        const Model = require(`../db/models/${entityType}`);
        originalEntity = await Model.findById(req.params.id);
      }
    } catch (error) {
      logger.warn('Could not fetch entity before deletion for audit', {
        entityType,
        entityId: req.params.id,
        error: error.message
      });
    }

    const originalJson = res.json;
    res.json = async function (data) {
      try {
        if (data && (data.success !== false)) {
          await AuditLog.create({
            userId: req.user?.id || req.user?.userId || null,
            userEmail: req.user?.email || null,
            action: 'delete',
            entityType,
            entityId: req.params.id,
            oldValues: originalEntity ? JSON.stringify(originalEntity) : null,
            newValues: null,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            requestId: req.id,
            description: `Deleted ${entityType} ID: ${req.params.id} - ${originalEntity?.title || originalEntity?.name || 'Entity deleted'}`,
            timestamp: new Date(),
            metadata: {
              requestMethod: req.method,
              requestPath: req.path,
              requestQuery: req.query,
              responseStatus: res.statusCode,
              deletedEntitySnapshot: originalEntity
            }
          });
        }
      } catch (error) {
        logger.error('Failed to log delete audit', {
          error: error.message,
          entityType,
          entityId: req.params.id,
          userId: req.user?.id,
          stack: error.stack
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Log approval action
 * @param {string} entityType - Type of entity being approved
 * @returns {Function} Express middleware function
 */
const logApproval = (entityType) => {
  return async (req, res, next) => {
    // Get original entity state before approval
    let originalEntity = null;
    
    try {
      if (req.params.id) {
        const Model = require(`../db/models/${entityType}`);
        originalEntity = await Model.findById(req.params.id);
      }
    } catch (error) {
      logger.warn('Could not fetch entity before approval for audit', {
        entityType,
        entityId: req.params.id,
        error: error.message
      });
    }

    const originalJson = res.json;
    res.json = async function (data) {
      try {
        if (data && (data.success || data.data || data.id)) {
          const entityData = data.data || data;
          const approvalData = {
            approver: req.user?.email || req.user?.username || req.user?.id,
            approverRole: req.user?.role,
            approvalLevel: req.body.approvalLevel || 'unknown',
            approvalReason: req.body.approvalReason || req.body.comments || 'No reason provided',
            approvalDate: new Date(),
            previousStatus: originalEntity?.status || req.body.oldStatus,
            newStatus: entityData.status || req.body.newStatus
          };

          await AuditLog.create({
            userId: req.user?.id || req.user?.userId || null,
            userEmail: req.user?.email || null,
            action: 'approve',
            entityType,
            entityId: entityData.id || entityData._id || req.params.id,
            oldValues: originalEntity ? JSON.stringify(originalEntity) : JSON.stringify({ status: req.body.oldStatus }),
            newValues: JSON.stringify(entityData),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            requestId: req.id,
            description: `Approved ${entityType}: ${approvalData.approvalReason} (${approvalData.previousStatus} → ${approvalData.newStatus})`,
            timestamp: new Date(),
            metadata: {
              requestMethod: req.method,
              requestPath: req.path,
              requestQuery: req.query,
              responseStatus: res.statusCode,
              approvalDetails: approvalData
            }
          });
        }
      } catch (error) {
        logger.error('Failed to log approval audit', {
          error: error.message,
          entityType,
          entityId: req.params.id,
          userId: req.user?.id,
          stack: error.stack
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Log rejection action
 * @param {string} entityType - Type of entity being rejected
 * @returns {Function} Express middleware function
 */
const logRejection = (entityType) => {
  return async (req, res, next) => {
    // Get original entity state before rejection
    let originalEntity = null;
    
    try {
      if (req.params.id) {
        const Model = require(`../db/models/${entityType}`);
        originalEntity = await Model.findById(req.params.id);
      }
    } catch (error) {
      logger.warn('Could not fetch entity before rejection for audit', {
        entityType,
        entityId: req.params.id,
        error: error.message
      });
    }

    const originalJson = res.json;
    res.json = async function (data) {
      try {
        if (data && (data.success || data.data || data.id)) {
          const entityData = data.data || data;
          const rejectionData = {
            rejector: req.user?.email || req.user?.username || req.user?.id,
            rejectorRole: req.user?.role,
            rejectionLevel: req.body.rejectionLevel || 'unknown',
            rejectionReason: req.body.rejectionReason || req.body.comments || 'No reason provided',
            rejectionDate: new Date(),
            previousStatus: originalEntity?.status || req.body.oldStatus,
            newStatus: entityData.status || req.body.newStatus,
            requiresResubmission: req.body.requiresResubmission || false
          };

          await AuditLog.create({
            userId: req.user?.id || req.user?.userId || null,
            userEmail: req.user?.email || null,
            action: 'reject',
            entityType,
            entityId: entityData.id || entityData._id || req.params.id,
            oldValues: originalEntity ? JSON.stringify(originalEntity) : JSON.stringify({ status: req.body.oldStatus }),
            newValues: JSON.stringify(entityData),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            requestId: req.id,
            description: `Rejected ${entityType}: ${rejectionData.rejectionReason} (${rejectionData.previousStatus} → ${rejectionData.newStatus})`,
            timestamp: new Date(),
            metadata: {
              requestMethod: req.method,
              requestPath: req.path,
              requestQuery: req.query,
              responseStatus: res.statusCode,
              rejectionDetails: rejectionData
            }
          });
        }
      } catch (error) {
        logger.error('Failed to log rejection audit', {
          error: error.message,
          entityType,
          entityId: req.params.id,
          userId: req.user?.id,
          stack: error.stack
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Log status change action
 * @param {string} entityType - Type of entity changing status
 * @returns {Function} Express middleware function
 */
const logStatusChange = (entityType) => {
  return async (req, res, next) => {
    let originalEntity = null;
    
    try {
      if (req.params.id) {
        const Model = require(`../db/models/${entityType}`);
        originalEntity = await Model.findById(req.params.id);
      }
    } catch (error) {
      logger.warn('Could not fetch entity for status change audit', {
        entityType,
        entityId: req.params.id,
        error: error.message
      });
    }

    const originalJson = res.json;
    res.json = async function (data) {
      try {
        if (data && (data.success || data.data || data.id)) {
          const entityData = data.data || data;
          const oldStatus = originalEntity?.status || req.body.oldStatus;
          const newStatus = entityData.status || req.body.newStatus || req.body.status;

          if (oldStatus !== newStatus) {
            await AuditLog.create({
              userId: req.user?.id || req.user?.userId || null,
              userEmail: req.user?.email || null,
              action: 'status_change',
              entityType,
              entityId: entityData.id || entityData._id || req.params.id,
              oldValues: JSON.stringify({ status: oldStatus }),
              newValues: JSON.stringify({ status: newStatus }),
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              sessionId: req.sessionID,
              requestId: req.id,
              description: `Status changed for ${entityType}: ${oldStatus} → ${newStatus}`,
              timestamp: new Date(),
              metadata: {
                requestMethod: req.method,
                requestPath: req.path,
                requestQuery: req.query,
                responseStatus: res.statusCode,
                statusChange: {
                  from: oldStatus,
                  to: newStatus,
                  reason: req.body.reason || req.body.comments
                }
              }
            });
          }
        }
      } catch (error) {
        logger.error('Failed to log status change audit', {
          error: error.message,
          entityType,
          entityId: req.params.id,
          userId: req.user?.id,
          stack: error.stack
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Log bulk operation
 * @param {string} entityType - Type of entities in bulk operation
 * @param {string} operation - Type of bulk operation (delete, update, etc.)
 * @returns {Function} Express middleware function
 */
const logBulkOperation = (entityType, operation) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = async function (data) {
      try {
        if (data && (data.success || data.affected || data.count)) {
          const affectedCount = data.affected || data.count || data.modified || 0;
          const entityIds = req.body.ids || req.body.entityIds || [];

          await AuditLog.create({
            userId: req.user?.id || req.user?.userId || null,
            userEmail: req.user?.email || null,
            action: `bulk_${operation}`,
            entityType,
            entityId: null, // Bulk operation doesn't target single entity
            oldValues: JSON.stringify({ entityIds }),
            newValues: JSON.stringify({ affectedCount, operation }),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            requestId: req.id,
            description: `Bulk ${operation} on ${entityType}: ${affectedCount} entities affected`,
            timestamp: new Date(),
            metadata: {
              requestMethod: req.method,
              requestPath: req.path,
              requestQuery: req.query,
              responseStatus: res.statusCode,
              bulkOperation: {
                operation,
                entityType,
                affectedCount,
                entityIds: entityIds.slice(0, 10), // Limit to first 10 IDs
                totalRequested: entityIds.length
              }
            }
          });
        }
      } catch (error) {
        logger.error('Failed to log bulk operation audit', {
          error: error.message,
          entityType,
          operation,
          userId: req.user?.id,
          stack: error.stack
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};


module.exports = {
  logCreate,
  logUpdate,
  logDelete,
  logApproval,
  logRejection,
  logStatusChange,
  logBulkOperation
};
