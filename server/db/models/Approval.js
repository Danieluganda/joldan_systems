/**
 * Approval Model
 * 
 * Data access layer for approval records optimized for Azure Cosmos DB
 * Feature 7: Approval workflows
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class Approval {
  constructor() {
    if (!Approval.instance) {
      this.client = new CosmosClient({
        endpoint: config.cosmosDB.endpoint,
        key: config.cosmosDB.key,
        connectionPolicy: {
          preferredLocations: config.cosmosDB.preferredRegions,
          requestTimeout: 10000,
          retryOptions: {
            maxRetryAttemptCount: 3,
            fixedRetryIntervalInMilliseconds: 1000
          }
        }
      });
      
      this.database = this.client.database(config.cosmosDB.databaseId);
      this.container = this.database.container('approvals');
      
      Approval.instance = this;
    }
    return Approval.instance;
  }

  // Diagnostic logging helper
  _logDiagnostics(operation, diagnostics, executionTime) {
    if (executionTime > 1000 || diagnostics.statusCode >= 400) {
      logger.warn(`Cosmos DB Performance Alert: ${operation}`, {
        executionTime,
        statusCode: diagnostics.statusCode,
        requestCharge: diagnostics.requestCharge,
        diagnostics: diagnostics.toString()
      });
    }
  }

  /**
   * Create a new approval with embedded workflow data
   * Uses hierarchical partition key: entityType|entityId
   */
  async create({
    entityType,
    entityId,
    approverId,
    status = 'pending',
    requestDate,
    comments,
    attachments = [],
    workflowData = {},
    requesterInfo = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const approval = {
        id,
        type: 'approval',
        // Hierarchical partition key for better distribution and query targeting
        partitionKey: `${entityType}|${entityId}`,
        entityType,
        entityId,
        approverId,
        status,
        requestDate: requestDate ? new Date(requestDate) : now,
        comments: comments || '',
        attachments,
        createdAt: now,
        updatedAt: now,
        
        // Embedded workflow information
        workflow: {
          level: workflowData.level || 1,
          requireAll: workflowData.requireAll || false,
          totalApprovers: workflowData.totalApprovers || 1,
          currentStep: workflowData.currentStep || 1,
          totalSteps: workflowData.totalSteps || 1,
          ...workflowData
        },
        
        // Embedded requester information
        requester: {
          id: requesterInfo.id,
          name: requesterInfo.name,
          department: requesterInfo.department,
          role: requesterInfo.role,
          ...requesterInfo
        },
        
        // Embedded approver information (denormalized for performance)
        approver: {
          id: approverId,
          status: 'pending',
          assignedAt: now,
          respondedAt: null,
          responseTime: null
        },
        
        // Activity history embedded for audit trail
        history: [{
          action: 'created',
          performedBy: requesterInfo.id,
          performedAt: now,
          details: 'Approval request created'
        }],
        
        // Metadata for analytics and indexing
        metadata: {
          priority: workflowData.priority || 'normal',
          category: workflowData.category,
          tags: workflowData.tags || [],
          businessJustification: workflowData.businessJustification,
          estimatedValue: workflowData.estimatedValue,
          deadline: workflowData.deadline ? new Date(workflowData.deadline) : null,
          lastActivity: now
        }
      };

      const { resource, diagnostics } = await this.container.items.create(approval);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating approval', { error: error.message });
      throw error;
    }
  }

  /**
   * Get approval by ID with partition key optimization
   */
  async findById(id, entityType = null, entityId = null) {
    try {
      const startTime = Date.now();
      
      if (entityType && entityId) {
        // Direct partition read - most efficient
        const partitionKey = `${entityType}|${entityId}`;
        const { resource, diagnostics } = await this.container
          .item(id, partitionKey)
          .read();
          
        this._logDiagnostics('findById-direct', diagnostics, Date.now() - startTime);
        return resource;
      } else {
        // Cross-partition query when partition key unknown
        const querySpec = {
          query: `
            SELECT * FROM c 
            WHERE c.id = @id AND c.type = 'approval'
          `,
          parameters: [
            { name: '@id', value: id }
          ]
        };

        const { resources, diagnostics } = await this.container.items
          .query(querySpec)
          .fetchAll();

        this._logDiagnostics('findById-query', diagnostics, Date.now() - startTime);
        return resources[0];
      }
    } catch (error) {
      logger.error('Error finding approval by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all approvals with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'approval'";
      const parameters = [];
      let paramCount = 0;

      // Build dynamic query with proper indexing
      if (filters.entityType) {
        whereClause += ` AND c.entityType = @entityType`;
        parameters.push({ name: '@entityType', value: filters.entityType });
      }

      if (filters.approverId) {
        whereClause += ` AND c.approverId = @approverId`;
        parameters.push({ name: '@approverId', value: filters.approverId });
      }

      if (filters.status) {
        whereClause += ` AND c.status = @status`;
        parameters.push({ name: '@status', value: filters.status });
      }

      if (filters.department) {
        whereClause += ` AND c.requester.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.priority) {
        whereClause += ` AND c.metadata.priority = @priority`;
        parameters.push({ name: '@priority', value: filters.priority });
      }

      if (filters.dateFrom) {
        whereClause += ` AND c.createdAt >= @dateFrom`;
        parameters.push({ name: '@dateFrom', value: filters.dateFrom });
      }

      if (filters.dateTo) {
        whereClause += ` AND c.createdAt <= @dateTo`;
        parameters.push({ name: '@dateTo', value: filters.dateTo });
      }

      // Optimize ordering for partition efficiency
      const orderBy = filters.entityType ? 
        'ORDER BY c.createdAt DESC' : 
        'ORDER BY c.partitionKey ASC, c.createdAt DESC';

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ${orderBy}
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, {
          partitionKey: filters.entityType && filters.entityId ? 
            `${filters.entityType}|${filters.entityId}` : undefined
        })
        .fetchAll();

      this._logDiagnostics('getAll', diagnostics, Date.now() - startTime);

      // Get total count for pagination
      const countQuery = {
        query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
        parameters
      };

      const { resources: countResult } = await this.container.items
        .query(countQuery)
        .fetchAll();

      return {
        items: resources,
        total: countResult[0] || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult[0] || 0) / limit)
      };
    } catch (error) {
      logger.error('Error getting all approvals', { error: error.message });
      throw error;
    }
  }

  /**
   * Update approval with optimistic concurrency and history tracking
   */
  async update(id, updates, partitionKey = null) {
    try {
      const startTime = Date.now();
      
      // Get current approval first
      const current = await this.findById(id, 
        partitionKey?.split('|')[0], 
        partitionKey?.split('|')[1]
      );
      
      if (!current) {
        throw new Error('Approval not found');
      }

      const now = new Date();
      
      // Add history entry for the update
      const historyEntry = {
        action: 'updated',
        performedBy: updates.updatedBy || 'system',
        performedAt: now,
        details: updates.updateReason || 'Approval updated',
        changes: Object.keys(updates).filter(key => 
          key !== 'updatedBy' && key !== 'updateReason'
        )
      };

      // Prepare the updated approval
      const updatedApproval = {
        ...current,
        ...updates,
        updatedAt: now,
        history: [...current.history, historyEntry],
        metadata: {
          ...current.metadata,
          lastActivity: now
        }
      };

      // Handle status changes with special logic
      if (updates.status && updates.status !== current.status) {
        updatedApproval.approver.status = updates.status;
        updatedApproval.approver.respondedAt = now;
        updatedApproval.approver.responseTime = 
          now.getTime() - new Date(current.approver.assignedAt).getTime();
      }

      const { resource, diagnostics } = await this.container
        .item(id, current.partitionKey)
        .replace(updatedApproval);

      this._logDiagnostics('update', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error updating approval', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete approval (soft delete with history preservation)
   */
  async delete(id, partitionKey, deletedBy) {
    try {
      const startTime = Date.now();
      
      // Soft delete by updating status
      const updatedApproval = await this.update(id, {
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy,
        updateReason: 'Approval deleted'
      }, partitionKey);

      this._logDiagnostics('delete', {}, Date.now() - startTime);
      
      return updatedApproval;
    } catch (error) {
      logger.error('Error deleting approval', { error: error.message });
      throw error;
    }
  }

  /**
   * Get approvals by entity with partition-optimized query
   */
  async getByEntity(entityType, entityId, includeDeleted = false) {
    try {
      const startTime = Date.now();
      const partitionKey = `${entityType}|${entityId}`;
      
      let whereClause = "c.type = 'approval' AND c.entityType = @entityType AND c.entityId = @entityId";
      const parameters = [
        { name: '@entityType', value: entityType },
        { name: '@entityId', value: entityId }
      ];

      if (!includeDeleted) {
        whereClause += " AND c.status != 'deleted'";
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.createdAt DESC
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, { partitionKey })
        .fetchAll();

      this._logDiagnostics('getByEntity', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting approvals by entity', { error: error.message });
      throw error;
    }
  }

  /**
   * Get pending approvals for approver with priority sorting
   */
  async getPending(approverId, department = null) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'approval' AND c.approverId = @approverId AND c.status = 'pending'";
      const parameters = [
        { name: '@approverId', value: approverId }
      ];

      if (department) {
        whereClause += " AND c.requester.department = @department";
        parameters.push({ name: '@department', value: department });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY 
            CASE c.metadata.priority
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'normal' THEN 3
              WHEN 'low' THEN 4
              ELSE 5
            END ASC,
            c.createdAt ASC
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getPending', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting pending approvals', { error: error.message });
      throw error;
    }
  }

  /**
   * Bulk approve/reject multiple approvals
   */
  async bulkUpdate(approvalIds, updates, updatedBy) {
    try {
      const startTime = Date.now();
      const results = [];
      
      // Process in batches to avoid timeout
      const batchSize = 10;
      for (let i = 0; i < approvalIds.length; i += batchSize) {
        const batch = approvalIds.slice(i, i + batchSize);
        const batchPromises = batch.map(async (approvalData) => {
          try {
            const { id, partitionKey } = approvalData;
            const result = await this.update(id, {
              ...updates,
              updatedBy,
              updateReason: `Bulk ${updates.status} operation`
            }, partitionKey);
            
            return { id, success: true, data: result };
          } catch (error) {
            return { id: approvalData.id, success: false, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      this._logDiagnostics('bulkUpdate', {}, Date.now() - startTime);
      
      return {
        totalProcessed: approvalIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      logger.error('Error in bulk update', { error: error.message });
      throw error;
    }
  }

  /**
   * Get approval analytics for dashboard
   */
  async getAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'approval'";
      const parameters = [];

      if (filters.department) {
        whereClause += " AND c.requester.department = @department";
        parameters.push({ name: '@department', value: filters.department });
      }

      if (filters.dateFrom) {
        whereClause += " AND c.createdAt >= @dateFrom";
        parameters.push({ name: '@dateFrom', value: filters.dateFrom });
      }

      if (filters.dateTo) {
        whereClause += " AND c.createdAt <= @dateTo";
        parameters.push({ name: '@dateTo', value: filters.dateTo });
      }

      const querySpec = {
        query: `
          SELECT 
            c.status,
            c.metadata.priority,
            c.entityType,
            c.requester.department,
            c.createdAt,
            c.approver.responseTime
          FROM c 
          WHERE ${whereClause}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getAnalytics', diagnostics, Date.now() - startTime);

      // Process analytics data
      const analytics = {
        totalApprovals: resources.length,
        statusBreakdown: {},
        priorityBreakdown: {},
        departmentBreakdown: {},
        entityTypeBreakdown: {},
        averageResponseTime: 0,
        pendingCount: 0
      };

      let totalResponseTime = 0;
      let responseCount = 0;

      resources.forEach(approval => {
        // Status breakdown
        analytics.statusBreakdown[approval.status] = 
          (analytics.statusBreakdown[approval.status] || 0) + 1;

        // Priority breakdown
        const priority = approval.metadata?.priority || 'normal';
        analytics.priorityBreakdown[priority] = 
          (analytics.priorityBreakdown[priority] || 0) + 1;

        // Department breakdown
        const dept = approval.requester?.department || 'unknown';
        analytics.departmentBreakdown[dept] = 
          (analytics.departmentBreakdown[dept] || 0) + 1;

        // Entity type breakdown
        analytics.entityTypeBreakdown[approval.entityType] = 
          (analytics.entityTypeBreakdown[approval.entityType] || 0) + 1;

        // Response time calculation
        if (approval.approver?.responseTime) {
          totalResponseTime += approval.approver.responseTime;
          responseCount++;
        }

        // Pending count
        if (approval.status === 'pending') {
          analytics.pendingCount++;
        }
      });

      analytics.averageResponseTime = responseCount > 0 ? 
        Math.round(totalResponseTime / responseCount / (1000 * 60 * 60)) : 0; // Convert to hours

      return analytics;
    } catch (error) {
      logger.error('Error getting approval analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for approval service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'approval'",
          parameters: []
        })
        .fetchNext();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        requestCharge: diagnostics?.requestCharge || 0,
        timestamp: new Date(),
        database: {
          connected: true,
          container: this.container.id
        }
      };
    } catch (error) {
      logger.error('Approval health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
        database: {
          connected: false
        }
      };
    }
  }
}

module.exports = new Approval();
