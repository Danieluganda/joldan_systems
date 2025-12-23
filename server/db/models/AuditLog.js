/**
 * AuditLog Model
 * 
 * Data access layer for audit trail records optimized for Azure Cosmos DB
 * Feature 11: Audit trail logging
 */

const { CosmosClient } = require('@azure/cosmos');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const config = require('../../config/database');

class AuditLog {
  constructor() {
    if (!AuditLog.instance) {
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
      this.container = this.database.container('audit-logs');
      
      AuditLog.instance = this;
    }
    return AuditLog.instance;
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
   * Create a new audit log entry with hierarchical partition key
   * Uses entityType|entityId for optimal query performance
   */
  async create({
    userId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress,
    description,
    userInfo = {},
    metadata = {}
  }) {
    try {
      const startTime = Date.now();
      const id = uuidv4();
      const now = new Date();
      
      const auditLog = {
        id,
        type: 'audit-log',
        // Hierarchical partition key for better distribution and targeted queries
        partitionKey: `${entityType}|${entityId}`,
        userId,
        action,
        entityType,
        entityId,
        oldValues: oldValues || null,
        newValues: newValues || null,
        ipAddress,
        description,
        createdAt: now,
        
        // Embedded user information for faster queries (denormalized)
        user: {
          id: userId,
          name: userInfo.name || 'Unknown',
          email: userInfo.email,
          department: userInfo.department,
          role: userInfo.role
        },
        
        // Session and context information
        session: {
          sessionId: metadata.sessionId,
          userAgent: metadata.userAgent,
          requestId: metadata.requestId,
          correlationId: metadata.correlationId
        },
        
        // Change details for complex auditing
        changes: {
          fieldsChanged: this._calculateChangedFields(oldValues, newValues),
          changeCount: this._countChanges(oldValues, newValues),
          severity: this._calculateSeverity(action, entityType),
          category: this._categorizeAction(action, entityType)
        },
        
        // Metadata for analytics and compliance
        metadata: {
          timestamp: now.toISOString(),
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          hour: now.getHours(),
          tags: metadata.tags || [],
          complianceFlags: metadata.complianceFlags || [],
          retentionPolicy: metadata.retentionPolicy || 'default',
          ...metadata
        }
      };

      const { resource, diagnostics } = await this.container.items.create(auditLog);
      this._logDiagnostics('create', diagnostics, Date.now() - startTime);
      
      return resource;
    } catch (error) {
      logger.error('Error creating audit log', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit log by ID with partition key optimization
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
            WHERE c.id = @id AND c.type = 'audit-log'
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
      logger.error('Error finding audit log by ID', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all audit logs with efficient filtering and pagination
   */
  async getAll(filters = {}, page = 1, limit = 100) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = "c.type = 'audit-log'";
      const parameters = [];

      // Build dynamic query with proper indexing
      if (filters.entityType) {
        whereClause += ` AND c.entityType = @entityType`;
        parameters.push({ name: '@entityType', value: filters.entityType });
      }

      if (filters.entityId) {
        whereClause += ` AND c.entityId = @entityId`;
        parameters.push({ name: '@entityId', value: filters.entityId });
      }

      if (filters.userId) {
        whereClause += ` AND c.userId = @userId`;
        parameters.push({ name: '@userId', value: filters.userId });
      }

      if (filters.action) {
        whereClause += ` AND c.action = @action`;
        parameters.push({ name: '@action', value: filters.action });
      }

      if (filters.startDate) {
        whereClause += ` AND c.createdAt >= @startDate`;
        parameters.push({ name: '@startDate', value: filters.startDate });
      }

      if (filters.endDate) {
        whereClause += ` AND c.createdAt <= @endDate`;
        parameters.push({ name: '@endDate', value: filters.endDate });
      }

      if (filters.severity) {
        whereClause += ` AND c.changes.severity = @severity`;
        parameters.push({ name: '@severity', value: filters.severity });
      }

      if (filters.department) {
        whereClause += ` AND c.user.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      // Optimize ordering for time-series data
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.createdAt DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, {
          // Use partition key when possible for better performance
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
      logger.error('Error getting all audit logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit logs by entity with partition-optimized query
   */
  async getByEntity(entityType, entityId, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      const partitionKey = `${entityType}|${entityId}`;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'audit-log' 
          AND c.entityType = @entityType 
          AND c.entityId = @entityId
          ORDER BY c.createdAt DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters: [
          { name: '@entityType', value: entityType },
          { name: '@entityId', value: entityId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec, { partitionKey })
        .fetchAll();

      this._logDiagnostics('getByEntity', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting audit logs by entity', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit logs by user with efficient querying
   */
  async getByUser(userId, page = 1, limit = 50) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'audit-log' 
          AND c.userId = @userId
          ORDER BY c.createdAt DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters: [
          { name: '@userId', value: userId }
        ]
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByUser', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting audit logs by user', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit logs by date range with time-based indexing
   */
  async getByDateRange(startDate, endDate, filters = {}, page = 1, limit = 100) {
    try {
      const startTime = Date.now();
      const offset = (page - 1) * limit;
      
      let whereClause = `
        c.type = 'audit-log' 
        AND c.createdAt >= @startDate 
        AND c.createdAt <= @endDate
      `;
      const parameters = [
        { name: '@startDate', value: startDate },
        { name: '@endDate', value: endDate }
      ];

      // Additional filters
      if (filters.entityType) {
        whereClause += ` AND c.entityType = @entityType`;
        parameters.push({ name: '@entityType', value: filters.entityType });
      }

      if (filters.action) {
        whereClause += ` AND c.action = @action`;
        parameters.push({ name: '@action', value: filters.action });
      }

      if (filters.userId) {
        whereClause += ` AND c.userId = @userId`;
        parameters.push({ name: '@userId', value: filters.userId });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.createdAt DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getByDateRange', diagnostics, Date.now() - startTime);
      
      return resources;
    } catch (error) {
      logger.error('Error getting audit logs by date range', { error: error.message });
      throw error;
    }
  }

  /**
   * Get audit analytics for compliance reporting
   */
  async getAuditAnalytics(filters = {}) {
    try {
      const startTime = Date.now();
      
      let whereClause = "c.type = 'audit-log'";
      const parameters = [];

      if (filters.startDate) {
        whereClause += ` AND c.createdAt >= @startDate`;
        parameters.push({ name: '@startDate', value: filters.startDate });
      }

      if (filters.endDate) {
        whereClause += ` AND c.createdAt <= @endDate`;
        parameters.push({ name: '@endDate', value: filters.endDate });
      }

      if (filters.department) {
        whereClause += ` AND c.user.department = @department`;
        parameters.push({ name: '@department', value: filters.department });
      }

      const querySpec = {
        query: `
          SELECT 
            c.action,
            c.entityType,
            c.changes.severity,
            c.changes.category,
            c.user.department,
            c.user.role,
            c.metadata.year,
            c.metadata.month
          FROM c 
          WHERE ${whereClause}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('getAuditAnalytics', diagnostics, Date.now() - startTime);

      // Process analytics data
      const analytics = {
        totalActions: resources.length,
        actionBreakdown: {},
        entityTypeBreakdown: {},
        severityBreakdown: {},
        departmentBreakdown: {},
        monthlyTrends: {},
        complianceMetrics: {
          criticalActions: 0,
          highRiskActions: 0,
          complianceScore: 0
        }
      };

      resources.forEach(log => {
        // Action breakdown
        analytics.actionBreakdown[log.action] = 
          (analytics.actionBreakdown[log.action] || 0) + 1;

        // Entity type breakdown
        analytics.entityTypeBreakdown[log.entityType] = 
          (analytics.entityTypeBreakdown[log.entityType] || 0) + 1;

        // Severity breakdown
        const severity = log.changes?.severity || 'normal';
        analytics.severityBreakdown[severity] = 
          (analytics.severityBreakdown[severity] || 0) + 1;

        // Department breakdown
        const dept = log.user?.department || 'unknown';
        analytics.departmentBreakdown[dept] = 
          (analytics.departmentBreakdown[dept] || 0) + 1;

        // Monthly trends
        const monthKey = `${log.metadata?.year}-${log.metadata?.month}`;
        analytics.monthlyTrends[monthKey] = 
          (analytics.monthlyTrends[monthKey] || 0) + 1;

        // Compliance metrics
        if (severity === 'critical') {
          analytics.complianceMetrics.criticalActions++;
        } else if (severity === 'high') {
          analytics.complianceMetrics.highRiskActions++;
        }
      });

      // Calculate compliance score (example: based on severity distribution)
      const totalRiskActions = analytics.complianceMetrics.criticalActions + 
                              analytics.complianceMetrics.highRiskActions;
      analytics.complianceMetrics.complianceScore = 
        Math.max(0, 100 - ((totalRiskActions / analytics.totalActions) * 100));

      return analytics;
    } catch (error) {
      logger.error('Error getting audit analytics', { error: error.message });
      throw error;
    }
  }

  /**
   * Search audit logs with advanced filtering
   */
  async searchAuditLogs(searchCriteria) {
    try {
      const startTime = Date.now();
      const {
        keyword,
        actions = [],
        entityTypes = [],
        userIds = [],
        departments = [],
        severities = [],
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = searchCriteria;

      const offset = (page - 1) * limit;
      let whereClause = "c.type = 'audit-log'";
      const parameters = [];

      // Keyword search across description and changes
      if (keyword) {
        whereClause += ` AND (CONTAINS(c.description, @keyword) OR CONTAINS(c.changes.fieldsChanged, @keyword))`;
        parameters.push({ name: '@keyword', value: keyword });
      }

      // Array-based filters
      if (actions.length > 0) {
        whereClause += ` AND c.action IN (${actions.map((_, i) => `@action${i}`).join(', ')})`;
        actions.forEach((action, i) => {
          parameters.push({ name: `@action${i}`, value: action });
        });
      }

      if (entityTypes.length > 0) {
        whereClause += ` AND c.entityType IN (${entityTypes.map((_, i) => `@entityType${i}`).join(', ')})`;
        entityTypes.forEach((entityType, i) => {
          parameters.push({ name: `@entityType${i}`, value: entityType });
        });
      }

      // Date range
      if (dateFrom) {
        whereClause += ` AND c.createdAt >= @dateFrom`;
        parameters.push({ name: '@dateFrom', value: dateFrom });
      }

      if (dateTo) {
        whereClause += ` AND c.createdAt <= @dateTo`;
        parameters.push({ name: '@dateTo', value: dateTo });
      }

      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE ${whereClause}
          ORDER BY c.createdAt DESC
          OFFSET ${offset} LIMIT ${limit}
        `,
        parameters
      };

      const { resources, diagnostics } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this._logDiagnostics('searchAuditLogs', diagnostics, Date.now() - startTime);

      return resources;
    } catch (error) {
      logger.error('Error searching audit logs', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check for audit log service
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const { resource, diagnostics } = await this.container
        .items
        .query({
          query: "SELECT TOP 1 c.id FROM c WHERE c.type = 'audit-log'",
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
      logger.error('Audit log health check failed', { error: error.message });
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

  // Helper methods for audit log processing
  _calculateChangedFields(oldValues, newValues) {
    if (!oldValues || !newValues) return [];
    
    const changed = [];
    Object.keys(newValues).forEach(key => {
      if (oldValues[key] !== newValues[key]) {
        changed.push(key);
      }
    });
    return changed;
  }

  _countChanges(oldValues, newValues) {
    return this._calculateChangedFields(oldValues, newValues).length;
  }

  _calculateSeverity(action, entityType) {
    const criticalActions = ['delete', 'approve', 'reject'];
    const highRiskEntities = ['procurement', 'user', 'approval'];
    
    if (criticalActions.includes(action.toLowerCase())) {
      return 'critical';
    } else if (highRiskEntities.includes(entityType.toLowerCase())) {
      return 'high';
    } else if (action.toLowerCase().includes('update')) {
      return 'medium';
    }
    return 'normal';
  }

  _categorizeAction(action, entityType) {
    const categories = {
      'create': 'data_creation',
      'update': 'data_modification', 
      'delete': 'data_deletion',
      'approve': 'workflow_action',
      'reject': 'workflow_action',
      'login': 'authentication',
      'logout': 'authentication'
    };
    
    return categories[action.toLowerCase()] || 'general';
  }
}

module.exports = new AuditLog();
